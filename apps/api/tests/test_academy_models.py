from pathlib import Path

import pytest
from django.core.management import call_command
from django.db import IntegrityError, transaction

from smartpay.academy.models import (
    AnswerOption,
    Course,
    CourseProgress,
    Exercise,
    Lesson,
    LessonProgress,
    Module,
    Question,
    Quiz,
    QuizAttempt,
)
from smartpay.academy.permissions import IsAcademyOwner
from smartpay.academy.scoring import compute_score_percent, has_passed
from smartpay.academy.services import seed_catalog, upsert_course_from_manifest

ACADEMY_ROOT = Path(__file__).resolve().parents[1] / "smartpay" / "academy"

FORBIDDEN_IMPORTS = (
    "from smartpay.payments",
    "import smartpay.payments",
    "from smartpay.transfers",
    "send_payment",
    "reconcile_payment",
    "create_invoice",
    "create_outgoing_payment",
    "get_payment_provider",
    "lnd_client",
    "macaroon",
    "preimage",
)


def _course(**kwargs) -> Course:
    defaults = {
        "slug": "bitcoin-lightning-smartpay",
        "title": "Bitcoin et Lightning",
        "summary": "Cours de démonstration",
        "content_version": 1,
        "is_published": False,
    }
    defaults.update(kwargs)
    return Course.objects.create(**defaults)


def _module(course: Course, **kwargs) -> Module:
    defaults = {
        "slug": "decouvrir-bitcoin",
        "title": "Découvrir Bitcoin",
        "objectives": "Comprendre le réseau et l'unité.",
        "order": 1,
        "is_published": False,
    }
    defaults.update(kwargs)
    return Module.objects.create(course=course, **defaults)


def _lesson(module: Module, **kwargs) -> Lesson:
    defaults = {
        "slug": "btc-et-sats",
        "title": "BTC et satoshis",
        "body_md": "Un satoshi est une fraction d'un bitcoin.",
        "difficulty": Lesson.Difficulty.INTRO,
        "duration_minutes": 5,
        "order": 1,
        "is_published": False,
    }
    defaults.update(kwargs)
    return Lesson.objects.create(module=module, **defaults)


@pytest.mark.django_db
def test_course_module_lesson_quiz_relations():
    course = _course()
    module = _module(course)
    lesson = _lesson(module)
    Exercise.objects.create(lesson=lesson, type=Exercise.Kind.REFLECTION, prompt="Que retenir ?", order=1)
    quiz = Quiz.objects.create(module=module, pass_score=70, content_version=1)
    question = Question.objects.create(quiz=quiz, prompt="Regtest a-t-il une valeur de marché ?", explanation="Non.", order=1)
    AnswerOption.objects.create(question=question, label="Non", is_correct=True, order=1)
    AnswerOption.objects.create(question=question, label="Oui", is_correct=False, order=2)

    assert course.modules.get() == module
    assert module.lessons.get() == lesson
    assert lesson.exercises.count() == 1
    assert module.quizzes.get() == quiz
    assert quiz.questions.get().options.count() == 2
    assert course.content_version == 1
    assert lesson.difficulty == Lesson.Difficulty.INTRO


@pytest.mark.django_db
def test_unique_constraints_on_catalog_and_progress(user, other_user):
    course = _course()
    module = _module(course)
    lesson = _lesson(module)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            _module(course, slug="autre", order=1)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            _lesson(module, slug="autre-lecon", order=1)
    LessonProgress.objects.create(owner=user, lesson=lesson, status=LessonProgress.Status.STARTED)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            LessonProgress.objects.create(owner=user, lesson=lesson, status=LessonProgress.Status.STARTED)
    LessonProgress.objects.create(owner=other_user, lesson=lesson, status=LessonProgress.Status.STARTED)
    assert LessonProgress.objects.filter(owner=user).count() == 1
    assert LessonProgress.objects.filter(owner=other_user).count() == 1


@pytest.mark.django_db
def test_progress_isolation_and_initial_values(user, other_user):
    course = _course()
    module = _module(course)
    lesson = _lesson(module)
    quiz = Quiz.objects.create(module=module, pass_score=70)
    own = CourseProgress.objects.create(owner=user, course=course, percent=0)
    CourseProgress.objects.create(owner=other_user, course=course, percent=0)
    assert own.percent == 0
    assert own.last_lesson_id is None
    assert own.completed_at is None
    assert CourseProgress.objects.filter(owner=user).get().course == course
    assert not CourseProgress.objects.filter(owner=user, percent=100).exists()

    started = LessonProgress.objects.create(owner=user, lesson=lesson)
    assert started.status == LessonProgress.Status.STARTED
    assert started.completed_at is None
    started.mark_completed()
    started.save()
    started.refresh_from_db()
    assert started.status == LessonProgress.Status.COMPLETED
    assert started.completed_at is not None

    QuizAttempt.objects.create(
        owner=user,
        quiz=quiz,
        quiz_version=quiz.content_version,
        answers=[],
        score_percent=0,
        passed=False,
    )
    assert QuizAttempt.objects.filter(owner=other_user).count() == 0
    permission = IsAcademyOwner()

    class _Req:
        user = other_user

    assert permission.has_object_permission(_Req(), None, started) is False


@pytest.mark.django_db
def test_incoherent_completed_status_rejected(user):
    lesson = _lesson(_module(_course()))
    row = LessonProgress(owner=user, lesson=lesson, status=LessonProgress.Status.COMPLETED, completed_at=None)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            row.save()


@pytest.mark.django_db
def test_seed_academy_is_idempotent_and_creates_no_progress(user, settings):
    settings.DEBUG = True
    call_command("seed_academy")
    call_command("seed_academy")
    assert Course.objects.filter(slug="bitcoin-lightning-smartpay").count() == 1
    course = Course.objects.get(slug="bitcoin-lightning-smartpay")
    assert course.modules.count() == 4
    assert list(course.modules.order_by("order").values_list("slug", flat=True)) == [
        "transactions-et-blockchain",
        "lightning-network",
        "utiliser-smartpay-africa",
        "bitcoin-et-paiements-en-afrique",
    ]
    assert course.modules.filter(is_published=True).count() == 4
    assert not course.modules.filter(slug="decouvrir-bitcoin").exists()
    assert not course.modules.filter(slug="portefeuilles-et-securite").exists()
    assert LessonProgress.objects.count() == 0
    assert QuizAttempt.objects.count() == 0
    assert CourseProgress.objects.filter(owner=user).count() == 0
    upsert_course_from_manifest()
    assert Course.objects.filter(slug="bitcoin-lightning-smartpay").count() == 1
    seeded = seed_catalog()
    assert seeded.slug == "bitcoin-lightning-smartpay"


@pytest.mark.django_db
def test_seed_academy_refused_outside_debug(settings):
    settings.DEBUG = False
    with pytest.raises(Exception, match="DEBUG"):
        call_command("seed_academy")


def test_scoring_helpers_do_not_invent_results():
    assert compute_score_percent(0, 0) == 0
    assert compute_score_percent(7, 10) == 70
    assert compute_score_percent(3, 5) == 60
    assert compute_score_percent(4, 5) == 80
    assert compute_score_percent(5, 5) == 100
    assert has_passed(70, 70) is True
    assert has_passed(69, 70) is False
    assert has_passed(60, 70) is False
    assert has_passed(80, 70) is True
    assert has_passed(100, 70) is True


def test_academy_has_no_payment_or_lnd_dependency():
    sources = []
    for path in ACADEMY_ROOT.rglob("*.py"):
        if "__pycache__" in path.parts or path.name.startswith("test_"):
            continue
        sources.append(path.read_text(encoding="utf-8"))
    blob = "\n".join(sources)
    for needle in FORBIDDEN_IMPORTS:
        assert needle not in blob, needle


def test_academy_does_not_import_ai_assistant_package():
    blob = "\n".join(
        path.read_text(encoding="utf-8")
        for path in ACADEMY_ROOT.rglob("*.py")
        if "__pycache__" not in path.parts
    )
    assert "from smartpay.ai_assistant" not in blob
    assert "from smartpay.payments" not in blob
