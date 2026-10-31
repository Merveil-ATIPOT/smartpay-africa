"""Catalogue Academy. Aucun paiement, aucune progression fictive."""

from __future__ import annotations

from pathlib import Path

from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import APIException, NotFound, ValidationError

from smartpay.academy.catalog import CONTENT_DIR, upsert_catalog_from_manifest
from smartpay.academy.models import Course, Lesson, LessonProgress, Module, Quiz, QuizAttempt
from smartpay.academy.progress import persist_course_progress
from smartpay.academy.scoring import canonicalize_answers, grade_submission

MANIFEST_NAME = "manifest.json"


def content_manifest_path() -> Path:
    return CONTENT_DIR / MANIFEST_NAME


@transaction.atomic
def upsert_course_from_manifest(payload: dict | None = None) -> tuple[Course, bool]:
    """Crée ou met à jour le catalogue pédagogique. Ne touche pas aux progressions."""
    return upsert_catalog_from_manifest(payload)


def seed_catalog() -> Course:
    course, _ = upsert_course_from_manifest()
    return course


CATALOG_NOT_FOUND = "Contenu introuvable."


def published_courses():
    return (
        Course.objects.filter(is_published=True)
        .annotate(published_module_count=Count("modules", filter=Q(modules__is_published=True)))
        .order_by("title", "slug")
    )


def get_published_course(slug: str) -> Course:
    try:
        return Course.objects.get(slug=slug, is_published=True)
    except Course.DoesNotExist as exc:
        raise NotFound(CATALOG_NOT_FOUND) from exc


def published_modules_for(course: Course):
    return (
        course.modules.filter(is_published=True)
        .annotate(published_lesson_count=Count("lessons", filter=Q(lessons__is_published=True)))
        .order_by("order", "slug")
    )


def get_published_module(course_slug: str, module_slug: str) -> Module:
    try:
        return Module.objects.select_related("course").get(
            slug=module_slug,
            is_published=True,
            course__slug=course_slug,
            course__is_published=True,
        )
    except Module.DoesNotExist as exc:
        raise NotFound(CATALOG_NOT_FOUND) from exc


def published_lessons_for(module: Module):
    return module.lessons.filter(is_published=True).order_by("order", "slug")


def get_published_lesson(course_slug: str, module_slug: str, lesson_slug: str) -> Lesson:
    try:
        return (
            Lesson.objects.select_related("module", "module__course")
            .prefetch_related("exercises")
            .get(
                slug=lesson_slug,
                is_published=True,
                module__slug=module_slug,
                module__is_published=True,
                module__course__slug=course_slug,
                module__course__is_published=True,
            )
        )
    except Lesson.DoesNotExist as exc:
        raise NotFound(CATALOG_NOT_FOUND) from exc


def start_lesson(*, user, lesson: Lesson) -> LessonProgress:
    progress, _ = LessonProgress.objects.get_or_create(owner=user, lesson=lesson)
    persist_course_progress(user=user, course=lesson.module.course)
    return progress


def complete_lesson(*, user, lesson: Lesson) -> LessonProgress:
    progress, created = LessonProgress.objects.get_or_create(
        owner=user,
        lesson=lesson,
        defaults={
            "status": LessonProgress.Status.COMPLETED,
            "completed_at": timezone.now(),
        },
    )
    if not created and progress.status != LessonProgress.Status.COMPLETED:
        progress.mark_completed()
        progress.save(update_fields=["status", "completed_at"])
    persist_course_progress(user=user, course=lesson.module.course)
    return progress


MAX_QUIZ_ANSWERS = 40
MAX_QUIZ_PAYLOAD_BYTES = 16_384


class IdempotencyConflict(APIException):
    status_code = 409
    default_detail = "Cette clé d'idempotence a déjà été utilisée avec un autre contenu."
    default_code = "idempotency_conflict"


def resolve_quiz_idempotency_key(request, payload_key: str = "") -> str:
    header = ""
    if request is not None:
        header = request.headers.get("Idempotency-Key", "") or request.META.get(
            "HTTP_IDEMPOTENCY_KEY",
            "",
        )
    return (header or payload_key or "").strip()[:64]


def get_published_quiz(course_slug: str, module_slug: str, quiz_id=None) -> Quiz:
    module = get_published_module(course_slug, module_slug)
    query = Quiz.objects.filter(module=module, is_published=True)
    if quiz_id is not None:
        query = query.filter(pk=quiz_id)
    try:
        return query.prefetch_related("questions__options").get()
    except Quiz.DoesNotExist as exc:
        raise NotFound(CATALOG_NOT_FOUND) from exc


def get_owned_attempt(*, user, quiz: Quiz, attempt_id) -> QuizAttempt:
    try:
        return QuizAttempt.objects.get(pk=attempt_id, owner=user, quiz=quiz)
    except QuizAttempt.DoesNotExist as exc:
        raise NotFound("Tentative introuvable.") from exc


def owned_attempts(*, user, quiz: Quiz):
    return QuizAttempt.objects.filter(owner=user, quiz=quiz).order_by("-created_at", "id")


def _parse_selected_answers(raw_answers, questions) -> dict:
    if not isinstance(raw_answers, list):
        raise ValidationError({"answers": "Le format des réponses est invalide."})
    if len(raw_answers) > MAX_QUIZ_ANSWERS:
        raise ValidationError({"answers": "Trop de réponses."})

    question_map = {str(question.id): question for question in questions}
    seen: set[str] = set()
    selected = {}
    for row in raw_answers:
        if not isinstance(row, dict):
            raise ValidationError({"answers": "Chaque réponse doit être un objet."})
        question_id = str(row.get("question_id") or "")
        option_id = str(row.get("option_id") or "")
        if question_id not in question_map:
            raise ValidationError({"answers": "Une question n'appartient pas à ce quiz."})
        if question_id in seen:
            raise ValidationError({"answers": "Une question est dupliquée."})
        seen.add(question_id)
        option_map = {str(option.id): option for option in question_map[question_id].options.all()}
        if option_id not in option_map:
            raise ValidationError({"answers": "Une option n'appartient pas à cette question."})
        selected[question_id] = option_map[option_id]

    if set(question_map) - seen:
        raise ValidationError({"answers": "Toutes les questions doivent être répondues."})
    return selected


def _answers_match(existing: QuizAttempt, incoming: list[dict]) -> bool:
    return canonicalize_answers(existing.answers) == canonicalize_answers(incoming)


def submit_quiz_attempt(*, user, quiz: Quiz, answers: list[dict], idempotency_key: str) -> tuple[QuizAttempt, bool]:
    if not idempotency_key:
        raise ValidationError({"idempotency_key": "La clé d'idempotence est obligatoire."})

    questions = list(quiz.questions.all())
    if not questions:
        raise ValidationError({"quiz": "Le quiz ne contient aucune question."})

    selected = _parse_selected_answers(answers, questions)
    incoming = [{"question_id": key, "option_id": str(option.id)} for key, option in selected.items()]

    existing = QuizAttempt.objects.filter(
        owner=user,
        quiz=quiz,
        idempotency_key=idempotency_key,
    ).first()
    if existing:
        if not _answers_match(existing, incoming):
            raise IdempotencyConflict()
        return existing, True

    score_percent, snapshot = grade_submission(questions=questions, selected_by_question=selected)
    passed = score_percent >= quiz.pass_score
    try:
        with transaction.atomic():
            attempt = QuizAttempt.objects.create(
                owner=user,
                quiz=quiz,
                quiz_version=quiz.content_version,
                pass_score=quiz.pass_score,
                answers=snapshot,
                score_percent=score_percent,
                passed=passed,
                idempotency_key=idempotency_key,
            )
    except IntegrityError:
        replay = QuizAttempt.objects.get(owner=user, quiz=quiz, idempotency_key=idempotency_key)
        if not _answers_match(replay, incoming):
            raise IdempotencyConflict()
        return replay, True
    persist_course_progress(user=user, course=quiz.module.course)
    return attempt, False
