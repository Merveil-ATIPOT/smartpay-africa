"""Import idempotent du catalogue pédagogique. Ne touche pas aux progressions."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from django.db import transaction

from smartpay.academy.models import AnswerOption, Course, Exercise, Lesson, Module, Question, Quiz

CONTENT_DIR = Path(__file__).resolve().parent / "content"
FORBIDDEN_CONTENT = (
    "rendement garanti",
    "investissement garanti",
)
FORBIDDEN_SECRET_REQUESTS = (
    "saisissez votre phrase",
    "entrez votre phrase",
    "collez votre phrase",
    "tapez votre phrase",
    "donnez votre phrase",
    "envoyez votre phrase de récupération",
    "saisissez votre clé privée",
    "entrez votre clé privée",
    "collez votre clé privée",
    "tapez votre clé privée",
    "collez votre seed",
    "entrez votre seed phrase",
)


def content_manifest_path() -> Path:
    return CONTENT_DIR / "manifest.json"


def load_json(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON invalide : {path}")
    return payload


def load_content_manifest(path: Path | None = None) -> dict:
    target = path or content_manifest_path()
    payload = load_json(target)
    if not payload.get("slug"):
        raise ValueError("Le manifeste Academy doit contenir un slug de cours.")
    return payload


def resolve_module_payload(manifest: dict, item: dict) -> dict:
    if item.get("file"):
        return load_json(CONTENT_DIR / item["file"])
    return item


def _blob(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def quiz_fingerprint(quiz_data: dict) -> str:
    material = {
        "pass_score": int(quiz_data.get("pass_score") or 70),
        "questions": quiz_data.get("questions") or [],
    }
    return hashlib.sha256(_blob(material).encode("utf-8")).hexdigest()


def existing_quiz_fingerprint(quiz: Quiz) -> str:
    questions = []
    for question in quiz.questions.all():
        questions.append(
            {
                "prompt": question.prompt,
                "explanation": question.explanation,
                "order": question.order,
                "options": [
                    {"label": option.label, "is_correct": option.is_correct, "order": option.order}
                    for option in question.options.all()
                ],
            }
        )
    return quiz_fingerprint({"pass_score": quiz.pass_score, "questions": questions})


def module_is_importable(item: dict) -> bool:
    """Un item manifeste avec ``import: false`` est déclaré et validé, jamais upserté.

    Publication (phase suivante, autorisation explicite uniquement) :
    1. Garder le module 1 tel quel (slugs et versions).
    2. Passer ``import`` à true pour le ou les modules autorisés.
    3. Décider ``is_published`` dans le JSON (false = importé mais invisible au catalogue public).
    4. Exécuter ``seed_academy`` une seule fois (DEBUG ou ``--force``).
    5. Ne pas relancer migrate, ne pas toucher aux progressions, ne pas republier par accident.
    """
    return item.get("import", True) is not False


def validate_academy_manifest(manifest: dict) -> dict:
    if not manifest.get("slug") or not manifest.get("title"):
        raise ValueError("Le cours doit avoir un slug et un titre.")
    modules = manifest.get("modules") or []
    if not isinstance(modules, list) or not modules:
        raise ValueError("Le manifeste doit déclarer au moins un module.")
    slugs = [item.get("slug") for item in modules]
    if len([slug for slug in slugs if slug]) != len(set(slugs)):
        raise ValueError("Les slugs de modules doivent être uniques dans le manifeste.")
    for item in modules:
        if "import" in item and not isinstance(item.get("import"), bool):
            raise ValueError(f"Le drapeau import de {item.get('slug')} doit être un booléen.")
    text = _blob(manifest).lower()
    for needle in FORBIDDEN_CONTENT + FORBIDDEN_SECRET_REQUESTS:
        if needle in text:
            raise ValueError(f"Le manifeste contient un contenu interdit : {needle}.")
    return manifest


def _assert_safe_text(label: str, text: str) -> None:
    lowered = text.lower()
    for needle in FORBIDDEN_CONTENT:
        if needle in lowered:
            raise ValueError(f"Contenu interdit dans {label}: {needle}.")
    for needle in FORBIDDEN_SECRET_REQUESTS:
        if needle in lowered:
            raise ValueError(f"Demande de secret interdite dans {label}: {needle}.")


def validate_module_payload(payload: dict) -> dict:
    if not payload.get("slug") or not payload.get("title") or payload.get("order") is None:
        raise ValueError("Chaque module doit avoir slug, titre et ordre.")
    lessons = payload.get("lessons") or []
    if len(lessons) != 4:
        raise ValueError(f"Le module {payload.get('slug')} doit contenir exactement quatre leçons.")
    orders = [int(lesson["order"]) for lesson in lessons]
    if orders != sorted(orders) or len(set(orders)) != 4:
        raise ValueError("Les leçons doivent avoir un ordre pédagogique unique.")
    slugs = [lesson.get("slug") for lesson in lessons]
    if len(slugs) != len(set(slugs)):
        raise ValueError(f"Les slugs de leçons doivent être uniques dans {payload.get('slug')}.")
    for lesson in lessons:
        if not lesson.get("title") or not lesson.get("body_md") or not lesson.get("slug"):
            raise ValueError("Chaque leçon doit avoir slug, titre et contenu.")
        exercises = lesson.get("exercises") or []
        if not exercises:
            raise ValueError(f"La leçon {lesson['slug']} doit contenir un exercice.")
        _assert_safe_text(lesson["slug"], f"{lesson['title']} {lesson['body_md']} {_blob(exercises)}")
    quiz = payload.get("quiz") or {}
    questions = quiz.get("questions") or []
    if len(questions) != 5:
        raise ValueError(f"Le quiz de {payload.get('slug')} doit contenir cinq questions.")
    if int(quiz.get("pass_score") or 0) != 70:
        raise ValueError(f"Le seuil de réussite de {payload.get('slug')} doit être 70.")
    _assert_safe_text(f"quiz:{payload.get('slug')}", _blob(quiz))
    for question in questions:
        options = question.get("options") or []
        if len(options) != 4:
            raise ValueError("Chaque question doit avoir quatre propositions.")
        correct = [option for option in options if option.get("is_correct")]
        if len(correct) != 1:
            raise ValueError("Chaque question doit avoir exactement une bonne réponse.")
        if not question.get("explanation"):
            raise ValueError("Chaque question doit avoir une explication pédagogique.")
    return payload


def load_declared_module_payloads(manifest: dict | None = None) -> list[dict]:
    data = validate_academy_manifest(manifest or load_content_manifest())
    payloads = []
    for item in data.get("modules") or []:
        payloads.append(validate_module_payload(resolve_module_payload(data, item)))
    return payloads


def _upsert_exercises(lesson: Lesson, exercises: list[dict]) -> None:
    for item in exercises:
        Exercise.objects.update_or_create(
            lesson=lesson,
            order=int(item["order"]),
            defaults={
                "type": item.get("type") or Exercise.Kind.REFLECTION,
                "prompt": item["prompt"],
                "content": item.get("content") or {},
            },
        )


def _replace_quiz_questions(quiz: Quiz, questions: list[dict]) -> None:
    quiz.questions.all().delete()
    for item in questions:
        question = Question.objects.create(
            quiz=quiz,
            prompt=item["prompt"],
            explanation=item.get("explanation") or "",
            order=int(item["order"]),
        )
        for option in item["options"]:
            AnswerOption.objects.create(
                question=question,
                label=option["label"],
                is_correct=bool(option.get("is_correct")),
                order=int(option["order"]),
            )


def _upsert_quiz(module: Module, quiz_data: dict) -> Quiz:
    quiz, _ = Quiz.objects.get_or_create(
        module=module,
        defaults={
            "content_version": int(quiz_data.get("content_version") or 1),
            "pass_score": int(quiz_data.get("pass_score") or 70),
            "is_published": bool(quiz_data.get("is_published", False)),
        },
    )
    incoming = quiz_fingerprint(quiz_data)
    current = existing_quiz_fingerprint(quiz) if quiz.questions.exists() else ""
    used = quiz.attempts.exists()
    quiz.pass_score = int(quiz_data.get("pass_score") or 70)
    quiz.is_published = bool(quiz_data.get("is_published", False))
    if current and incoming != current:
        if used:
            quiz.content_version = quiz.content_version + 1
        _replace_quiz_questions(quiz, quiz_data["questions"])
    elif not quiz.questions.exists():
        quiz.content_version = int(quiz_data.get("content_version") or quiz.content_version)
        _replace_quiz_questions(quiz, quiz_data["questions"])
    quiz.save(update_fields=["pass_score", "is_published", "content_version", "updated_at"])
    return quiz


def _upsert_lesson(module: Module, item: dict) -> Lesson:
    lesson, _ = Lesson.objects.update_or_create(
        module=module,
        slug=item["slug"],
        defaults={
            "title": item["title"],
            "body_md": item.get("body_md") or "",
            "difficulty": item.get("difficulty") or Lesson.Difficulty.INTRO,
            "duration_minutes": int(item.get("duration_minutes") or 5),
            "order": int(item["order"]),
            "is_published": bool(item.get("is_published", False)),
        },
    )
    _upsert_exercises(lesson, item.get("exercises") or [])
    return lesson


@transaction.atomic
def upsert_catalog_from_manifest(payload: dict | None = None) -> tuple[Course, bool]:
    manifest = validate_academy_manifest(payload or load_content_manifest())
    course, created = Course.objects.update_or_create(
        slug=manifest["slug"],
        defaults={
            "title": manifest.get("title") or manifest["slug"],
            "summary": manifest.get("summary") or "",
            "content_version": int(manifest.get("content_version") or 1),
            "is_published": bool(manifest.get("is_published", False)),
        },
    )
    for raw in manifest.get("modules") or []:
        if not module_is_importable(raw):
            continue
        module_data = validate_module_payload(resolve_module_payload(manifest, raw))
        module, _ = Module.objects.update_or_create(
            course=course,
            slug=module_data["slug"],
            defaults={
                "title": module_data["title"],
                "objectives": module_data.get("objectives") or "",
                "order": int(module_data["order"]),
                "is_published": bool(module_data.get("is_published", False)),
            },
        )
        for lesson in module_data.get("lessons") or []:
            _upsert_lesson(module, lesson)
        if module_data.get("quiz"):
            _upsert_quiz(module, module_data["quiz"])
    return course, created
