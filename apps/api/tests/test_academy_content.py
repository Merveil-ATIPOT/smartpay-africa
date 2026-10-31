import copy
import json
from pathlib import Path

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework import status

from smartpay.academy.catalog import (
    FORBIDDEN_CONTENT,
    FORBIDDEN_SECRET_REQUESTS,
    load_content_manifest,
    load_declared_module_payloads,
    module_is_importable,
    resolve_module_payload,
    upsert_catalog_from_manifest,
    validate_academy_manifest,
    validate_module_payload,
)
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
from smartpay.academy.services import seed_catalog

ACADEMY_ROOT = Path(__file__).resolve().parents[1] / "smartpay" / "academy"
CONTENT_DIR = ACADEMY_ROOT / "content"
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
LESSON_SLUGS = (
    "quest-ce-que-bitcoin",
    "btc-et-satoshis",
    "blockchain-et-transactions",
    "mainnet-testnet-regtest",
)
DECLARED_MODULE_SLUGS = (
    "decouvrir-bitcoin",
    "portefeuilles-et-securite",
    "transactions-et-blockchain",
    "lightning-network",
    "utiliser-smartpay-africa",
    "bitcoin-et-paiements-en-afrique",
)
MODULE_LESSON_SLUGS = {
    "decouvrir-bitcoin": LESSON_SLUGS,
    "portefeuilles-et-securite": (
        "quest-ce-qu-un-portefeuille-bitcoin",
        "cles-privees-publiques-adresses",
        "sauvegarde-et-bonnes-pratiques",
        "custodial-et-non-custodial",
    ),
    "transactions-et-blockchain": (
        "comment-fonctionne-une-transaction",
        "adresses-utxo-et-frais",
        "mempool-blocs-et-confirmations",
        "lire-et-verifier-une-transaction",
    ),
    "lightning-network": (
        "pourquoi-lightning-network",
        "canaux-et-liquidite",
        "factures-bolt11-et-paiements",
        "frais-routage-echecs-securite",
    ),
    "utiliser-smartpay-africa": (
        "decouvrir-le-portefeuille-smartpay",
        "factures-et-qr-codes",
        "suivre-un-paiement-et-historique",
        "simulations-mobile-money-et-limites-mvp",
    ),
    "bitcoin-et-paiements-en-afrique": (
        "usages-bitcoin-et-lightning",
        "paiements-transfrontaliers",
        "risques-volatilite-fraude",
        "reglementation-et-adoption-responsable",
    ),
}


def _module_one_only_manifest() -> dict:
    manifest = copy.deepcopy(load_content_manifest())
    for item in manifest["modules"]:
        item["import"] = item["slug"] == "decouvrir-bitcoin"
    return manifest


def _seeded_course():
    course, _ = upsert_catalog_from_manifest(_module_one_only_manifest())
    return course


def _module_payload():
    manifest = load_content_manifest()
    return resolve_module_payload(manifest, manifest["modules"][0])


def test_manifest_and_module_payload_are_valid():
    manifest = load_content_manifest()
    validate_academy_manifest(manifest)
    assert manifest["slug"] == "bitcoin-lightning-smartpay"
    assert manifest["title"] == "Bitcoin et Lightning avec SmartPay Africa"
    assert manifest["content_version"] == 2
    assert manifest["is_published"] is True
    assert len(manifest["modules"]) == 6
    assert [item["slug"] for item in manifest["modules"]] == list(DECLARED_MODULE_SLUGS)
    assert manifest["modules"][0]["file"] == "modules/decouvrir-bitcoin.json"
    assert manifest["modules"][0].get("import") is False
    assert module_is_importable(manifest["modules"][0]) is False
    assert manifest["modules"][1]["slug"] == "portefeuilles-et-securite"
    assert manifest["modules"][1].get("import") is False
    assert module_is_importable(manifest["modules"][1]) is False
    for item in manifest["modules"][2:]:
        assert item.get("import") is True
        assert module_is_importable(item) is True

    payload = validate_module_payload(_module_payload())
    assert payload["slug"] == "decouvrir-bitcoin"
    assert payload["order"] == 1
    assert payload["is_published"] is True
    assert [lesson["slug"] for lesson in payload["lessons"]] == list(LESSON_SLUGS)
    assert [lesson["order"] for lesson in payload["lessons"]] == [1, 2, 3, 4]
    assert all(lesson.get("exercises") for lesson in payload["lessons"])
    assert all(lesson.get("is_published") is True for lesson in payload["lessons"])
    assert payload["quiz"]["pass_score"] == 70
    assert payload["quiz"]["is_published"] is True
    assert payload["quiz"]["content_version"] == 1
    assert len(payload["quiz"]["questions"]) == 5
    for question in payload["quiz"]["questions"]:
        assert len(question["options"]) == 4
        assert sum(1 for option in question["options"] if option["is_correct"]) == 1
        assert question["explanation"]

    blob = json.dumps({"manifest": manifest, "module": payload}, ensure_ascii=False).lower()
    for needle in FORBIDDEN_CONTENT:
        assert needle not in blob, needle
    assert "phrase de récupération" not in blob
    assert "clé privée" not in blob


@pytest.mark.django_db
def test_seed_creates_course_module_lessons_exercises_and_quiz():
    course = _seeded_course()
    assert course.slug == "bitcoin-lightning-smartpay"
    assert course.title == "Bitcoin et Lightning avec SmartPay Africa"
    assert course.is_published is True
    assert course.content_version == 2
    assert Course.objects.count() == 1

    module = course.modules.get()
    assert module.slug == "decouvrir-bitcoin"
    assert module.title == "Découvrir Bitcoin"
    assert module.order == 1
    assert module.is_published is True
    assert Module.objects.count() == 1

    lessons = list(module.lessons.all())
    assert [lesson.slug for lesson in lessons] == list(LESSON_SLUGS)
    assert [lesson.order for lesson in lessons] == [1, 2, 3, 4]
    assert all(lesson.is_published for lesson in lessons)
    assert all(lesson.body_md for lesson in lessons)
    assert all("## Objectifs" in lesson.body_md for lesson in lessons)
    assert all("## Résumé" in lesson.body_md for lesson in lessons)
    assert all(lesson.duration_minutes >= 5 for lesson in lessons)
    assert Exercise.objects.count() == 4
    assert all(lesson.exercises.count() == 1 for lesson in lessons)

    quiz = module.quizzes.get()
    assert quiz.pass_score == 70
    assert quiz.is_published is True
    assert quiz.content_version == 1
    questions = list(quiz.questions.all())
    assert len(questions) == 5
    assert [question.order for question in questions] == [1, 2, 3, 4, 5]
    for question in questions:
        options = list(question.options.all())
        assert len(options) == 4
        assert [option.order for option in options] == [1, 2, 3, 4]
        assert sum(1 for option in options if option.is_correct) == 1
        assert question.explanation


@pytest.mark.django_db
def test_seed_is_idempotent_and_preserves_progress(user, settings):
    settings.DEBUG = True
    first = _seeded_course()
    module = first.modules.get(slug="decouvrir-bitcoin")
    lesson = module.lessons.get(slug="quest-ce-que-bitcoin")
    quiz = module.quizzes.get()
    progress = LessonProgress.objects.create(owner=user, lesson=lesson)
    attempt = QuizAttempt.objects.create(
        owner=user,
        quiz=quiz,
        quiz_version=quiz.content_version,
        answers=[{"question_id": "kept"}],
        score_percent=80,
        passed=True,
        pass_score=70,
    )
    snapshot = CourseProgress.objects.create(owner=user, course=first, percent=0)
    ids = {
        "course": first.id,
        "module": module.id,
        "lesson": lesson.id,
        "quiz": quiz.id,
        "questions": list(quiz.questions.order_by("order").values_list("id", flat=True)),
        "progress": progress.id,
        "attempt": attempt.id,
        "course_progress": snapshot.id,
    }

    call_command("seed_academy")
    call_command("seed_academy")
    second = seed_catalog()

    assert Course.objects.count() == 1
    assert second.id == ids["course"]
    kept_module = second.modules.get(slug="decouvrir-bitcoin")
    assert kept_module.id == ids["module"]
    assert kept_module.lessons.get(slug="quest-ce-que-bitcoin").id == ids["lesson"]
    assert kept_module.quizzes.get().id == ids["quiz"]
    assert list(kept_module.quizzes.get().questions.order_by("order").values_list("id", flat=True)) == ids["questions"]
    assert LessonProgress.objects.filter(id=ids["progress"], owner=user, lesson_id=ids["lesson"]).exists()
    kept = QuizAttempt.objects.get(id=ids["attempt"])
    assert kept.answers == [{"question_id": "kept"}]
    assert kept.score_percent == 80
    assert kept.passed is True
    assert CourseProgress.objects.get(id=ids["course_progress"]).percent == 0
    assert LessonProgress.objects.count() == 1
    assert QuizAttempt.objects.count() == 1


@pytest.mark.django_db
def test_seed_does_not_delete_extra_catalog_or_used_quiz_version(user):
    course = _seeded_course()
    extra = Module.objects.create(
        course=course,
        slug="module-reserve",
        title="Réservé",
        order=2,
        is_published=False,
    )
    quiz = course.modules.get(slug="decouvrir-bitcoin").quizzes.get()
    attempt = QuizAttempt.objects.create(
        owner=user,
        quiz=quiz,
        quiz_version=quiz.content_version,
        answers=[],
        score_percent=40,
        passed=False,
        pass_score=70,
    )

    mutated = copy.deepcopy(load_content_manifest())
    module_data = copy.deepcopy(_module_payload())
    module_data["quiz"]["questions"][0]["prompt"] = "Question modifiée pour incrémenter la version."
    mutated["modules"] = [module_data]
    upsert_catalog_from_manifest(mutated)

    quiz.refresh_from_db()
    assert quiz.content_version == 2
    assert QuizAttempt.objects.filter(id=attempt.id).exists()
    assert Module.objects.filter(id=extra.id, slug="module-reserve").exists()
    assert Question.objects.filter(quiz=quiz).count() == 5


@pytest.mark.django_db
def test_seeded_catalog_is_compatible_with_academy_endpoints(auth_client, user):
    course = _seeded_course()
    module = course.modules.get(slug="decouvrir-bitcoin")
    lessons = list(module.lessons.all())
    quiz = module.quizzes.get()

    listed = auth_client.get("/api/v1/academy/courses/")
    assert listed.status_code == status.HTTP_200_OK
    assert listed.json()["results"][0]["slug"] == "bitcoin-lightning-smartpay"

    detail = auth_client.get(f"/api/v1/academy/courses/{course.slug}/")
    assert detail.status_code == status.HTTP_200_OK
    assert [row["slug"] for row in detail.json()["modules"]] == ["decouvrir-bitcoin"]

    module_payload = auth_client.get(f"/api/v1/academy/courses/{course.slug}/modules/{module.slug}/")
    assert module_payload.status_code == status.HTTP_200_OK
    assert [row["slug"] for row in module_payload.json()["lessons"]] == list(LESSON_SLUGS)

    lesson = lessons[0]
    lesson_payload = auth_client.get(
        f"/api/v1/academy/courses/{course.slug}/modules/{module.slug}/lessons/{lesson.slug}/"
    )
    assert lesson_payload.status_code == status.HTTP_200_OK
    body = lesson_payload.json()
    assert body["body_md"]
    assert len(body["exercises"]) == 1
    assert "is_correct" not in json.dumps(body)

    quiz_payload = auth_client.get(f"/api/v1/academy/courses/{course.slug}/modules/{module.slug}/quizzes/")
    assert quiz_payload.status_code == status.HTTP_200_OK
    public_quiz = quiz_payload.json()
    assert public_quiz["pass_score"] == 70
    assert len(public_quiz["questions"]) == 5
    blob = json.dumps(public_quiz, ensure_ascii=False)
    assert "is_correct" not in blob
    assert "explanation" not in blob

    questions = list(quiz.questions.all())
    correct_ids = {
        question.id: AnswerOption.objects.get(question=question, is_correct=True).id for question in questions
    }
    wrong_ids = {
        question.id: AnswerOption.objects.filter(question=question, is_correct=False).first().id
        for question in questions
    }

    four_correct = [
        {"question_id": str(question.id), "option_id": str(correct_ids[question.id] if index < 4 else wrong_ids[question.id])}
        for index, question in enumerate(questions)
    ]
    passed = auth_client.post(
        f"/api/v1/academy/courses/{course.slug}/modules/{module.slug}/quizzes/{quiz.id}/attempts/",
        {"answers": four_correct},
        format="json",
        HTTP_IDEMPOTENCY_KEY="content-pass",
    )
    assert passed.status_code == status.HTTP_201_CREATED
    assert passed.json()["score_percent"] == 80
    assert passed.json()["passed"] is True

    three_correct = [
        {"question_id": str(question.id), "option_id": str(correct_ids[question.id] if index < 3 else wrong_ids[question.id])}
        for index, question in enumerate(questions)
    ]
    failed = auth_client.post(
        f"/api/v1/academy/courses/{course.slug}/modules/{module.slug}/quizzes/{quiz.id}/attempts/",
        {"answers": three_correct},
        format="json",
        HTTP_IDEMPOTENCY_KEY="content-fail",
    )
    assert failed.json()["score_percent"] == 60
    assert failed.json()["passed"] is False
    assert QuizAttempt.objects.filter(owner=user).count() == 2

    five_correct = [
        {"question_id": str(question.id), "option_id": str(correct_ids[question.id])}
        for question in questions
    ]
    perfect = auth_client.post(
        f"/api/v1/academy/courses/{course.slug}/modules/{module.slug}/quizzes/{quiz.id}/attempts/",
        {"answers": five_correct},
        format="json",
        HTTP_IDEMPOTENCY_KEY="content-perfect",
    )
    assert perfect.status_code == status.HTTP_201_CREATED
    assert perfect.json()["score_percent"] == 100
    assert perfect.json()["passed"] is True
    replay = auth_client.post(
        f"/api/v1/academy/courses/{course.slug}/modules/{module.slug}/quizzes/{quiz.id}/attempts/",
        {"answers": five_correct},
        format="json",
        HTTP_IDEMPOTENCY_KEY="content-perfect",
    )
    assert replay.status_code == status.HTTP_200_OK
    assert replay.json()["id"] == perfect.json()["id"]
    assert QuizAttempt.objects.filter(owner=user).count() == 3
    assert QuizAttempt.objects.filter(owner=user, score_percent=60, passed=False).exists()
    live = auth_client.get("/api/v1/academy/me/progress/").json()
    assert live["summary"]["best_score_percent"] == 100
    assert live["summary"]["quizzes_passed"] == 1
    assert live["courses"][0]["modules"][0]["completed"] is False
    assert live["summary"]["progress_percent"] == 0


def test_declared_modules_two_to_six_are_valid_unpublished_and_not_importable():
    manifest = load_content_manifest()
    payloads = load_declared_module_payloads(manifest)
    assert len(payloads) == 6
    assert [payload["slug"] for payload in payloads] == list(DECLARED_MODULE_SLUGS)
    assert [payload["order"] for payload in payloads] == [1, 2, 3, 4, 5, 6]

    first = payloads[0]
    assert first["slug"] == "decouvrir-bitcoin"
    assert first["title"] == "Découvrir Bitcoin"
    assert first["is_published"] is True
    assert first["quiz"]["content_version"] == 1
    assert first["quiz"]["is_published"] is True
    assert [lesson["slug"] for lesson in first["lessons"]] == list(LESSON_SLUGS)

    module_slugs = []
    lesson_slugs = []
    exercise_count = 0
    question_count = 0
    option_count = 0
    correct_count = 0
    for payload in payloads:
        module_slugs.append(payload["slug"])
        assert payload["slug"] in MODULE_LESSON_SLUGS
        assert [lesson["slug"] for lesson in payload["lessons"]] == list(MODULE_LESSON_SLUGS[payload["slug"]])
        assert len(payload["lessons"]) == 4
        assert len(payload["quiz"]["questions"]) == 5
        assert payload["quiz"]["pass_score"] == 70
        assert payload["quiz"]["content_version"] == 1
        for lesson in payload["lessons"]:
            lesson_slugs.append(lesson["slug"])
            assert lesson["title"]
            assert lesson["duration_minutes"] >= 5
            assert "## Objectifs" in lesson["body_md"]
            assert "## Résumé" in lesson["body_md"]
            if payload["slug"] != "decouvrir-bitcoin":
                assert "## Définitions" in lesson["body_md"]
                assert "## Exemple concret" in lesson["body_md"]
            lowered_body = lesson["body_md"].lower()
            for tag in ("<p>", "<div", "<br", "<html", "<span", "<script"):
                assert tag not in lowered_body
            exercises = lesson.get("exercises") or []
            assert len(exercises) == 1
            exercise_count += len(exercises)
            assert exercises[0]["prompt"]
            assert exercises[0]["order"] == 1
        for question in payload["quiz"]["questions"]:
            question_count += 1
            options = question["options"]
            assert len(options) == 4
            option_count += len(options)
            correct = [option for option in options if option.get("is_correct")]
            assert len(correct) == 1
            correct_count += len(correct)
            assert question["explanation"]

    assert len(module_slugs) == len(set(module_slugs)) == 6
    assert len(lesson_slugs) == len(set(lesson_slugs)) == 24
    assert exercise_count == 24
    assert question_count == 30
    assert option_count == 120
    assert correct_count == 30

    assert all(payload["is_published"] is True for payload in payloads)
    assert all(lesson.get("is_published") is True for payload in payloads for lesson in payload["lessons"])
    assert all(payload["quiz"]["is_published"] is True for payload in payloads)
    assert module_is_importable(manifest["modules"][0]) is False
    assert module_is_importable(manifest["modules"][1]) is False
    for item in manifest["modules"][2:]:
        assert module_is_importable(item) is True

    blob = json.dumps({"manifest": manifest, "modules": payloads}, ensure_ascii=False).lower()
    for needle in FORBIDDEN_CONTENT + FORBIDDEN_SECRET_REQUESTS:
        assert needle not in blob, needle


@pytest.mark.django_db
def test_seed_skips_declared_modules_that_are_not_importable():
    course = seed_catalog()
    slugs = list(course.modules.order_by("order").values_list("slug", flat=True))
    assert slugs == list(DECLARED_MODULE_SLUGS[2:])
    assert not Module.objects.filter(slug="decouvrir-bitcoin").exists()
    assert not Module.objects.filter(slug="portefeuilles-et-securite").exists()
    assert Module.objects.count() == 4
    assert Module.objects.filter(is_published=True).count() == 4
    assert Lesson.objects.count() == 16
    assert all(lesson.is_published for lesson in Lesson.objects.all())
    assert Quiz.objects.count() == 4
    assert all(quiz.is_published and quiz.pass_score == 70 and quiz.content_version == 1 for quiz in Quiz.objects.all())
    assert Question.objects.count() == 20
    assert AnswerOption.objects.count() == 80


def _manifest_for_unpublished_import(*, freeze_module_one: bool = True) -> dict:
    manifest = copy.deepcopy(load_content_manifest())
    for item in manifest["modules"]:
        if item["slug"] == "decouvrir-bitcoin":
            item["import"] = False if freeze_module_one else True
        else:
            item["import"] = True
    return manifest


def test_manifest_rejects_non_boolean_import_flag():
    manifest = copy.deepcopy(load_content_manifest())
    manifest["modules"][1]["import"] = "false"
    with pytest.raises(ValueError, match="booléen"):
        validate_academy_manifest(manifest)


@pytest.mark.django_db
def test_unpublished_import_plan_is_hidden_idempotent_and_preserves_module_one(auth_client, user):
    course = _seeded_course()
    module_one = course.modules.get(slug="decouvrir-bitcoin")
    first_lesson = module_one.lessons.get(slug="quest-ce-que-bitcoin")
    resume_lesson = module_one.lessons.get(slug="btc-et-satoshis")
    quiz = module_one.quizzes.get()
    LessonProgress.objects.create(
        owner=user,
        lesson=first_lesson,
        status=LessonProgress.Status.COMPLETED,
        completed_at=timezone.now(),
    )
    attempt = QuizAttempt.objects.create(
        owner=user,
        quiz=quiz,
        quiz_version=quiz.content_version,
        answers=[{"question_id": "lab-40"}],
        score_percent=40,
        passed=False,
        pass_score=70,
    )
    snapshot = CourseProgress.objects.create(
        owner=user,
        course=course,
        percent=0,
        last_lesson=resume_lesson,
    )
    ids = {
        "course": course.id,
        "module": module_one.id,
        "lesson": first_lesson.id,
        "quiz": quiz.id,
        "questions": list(quiz.questions.order_by("order").values_list("id", flat=True)),
        "attempt": attempt.id,
        "progress": snapshot.id,
    }

    plan = _manifest_for_unpublished_import(freeze_module_one=True)
    assert module_is_importable(plan["modules"][0]) is False
    assert all(module_is_importable(item) for item in plan["modules"][1:])
    upsert_catalog_from_manifest(plan)
    upsert_catalog_from_manifest(plan)

    assert Course.objects.count() == 1
    assert Course.objects.get().id == ids["course"]
    assert Module.objects.count() == 6
    assert list(Module.objects.order_by("order").values_list("slug", flat=True)) == list(DECLARED_MODULE_SLUGS)
    assert Module.objects.filter(is_published=True).count() == 6
    assert Module.objects.filter(is_published=False).count() == 0
    assert Lesson.objects.count() == 24
    assert Lesson.objects.filter(is_published=True).count() == 24
    assert Exercise.objects.count() == 24
    assert Quiz.objects.count() == 6
    assert Quiz.objects.filter(is_published=True).count() == 6
    assert Question.objects.count() == 30
    assert AnswerOption.objects.count() == 120
    assert Module.objects.filter(slug="decouvrir-bitcoin").values_list("id", "is_published").get() == (
        ids["module"],
        True,
    )
    quiz.refresh_from_db()
    assert quiz.id == ids["quiz"]
    assert quiz.content_version == 1
    assert quiz.is_published is True
    assert list(quiz.questions.order_by("order").values_list("id", flat=True)) == ids["questions"]
    kept = QuizAttempt.objects.get(id=ids["attempt"])
    assert kept.score_percent == 40
    assert kept.passed is False
    assert kept.answers == [{"question_id": "lab-40"}]
    assert CourseProgress.objects.get(id=ids["progress"]).last_lesson_id == resume_lesson.id
    assert LessonProgress.objects.count() == 1
    assert QuizAttempt.objects.count() == 1

    listed = auth_client.get("/api/v1/academy/courses/")
    assert listed.status_code == status.HTTP_200_OK
    assert listed.json()["results"][0]["published_module_count"] == 6
    detail = auth_client.get(f"/api/v1/academy/courses/{course.slug}/")
    assert [row["slug"] for row in detail.json()["modules"]] == list(DECLARED_MODULE_SLUGS)
    quiz_public = auth_client.get(
        f"/api/v1/academy/courses/{course.slug}/modules/decouvrir-bitcoin/quizzes/"
    )
    assert quiz_public.status_code == status.HTTP_200_OK
    public_blob = json.dumps(quiz_public.json(), ensure_ascii=False)
    assert "is_correct" not in public_blob
    assert "explanation" not in public_blob

    visible = auth_client.get(f"/api/v1/academy/courses/{course.slug}/modules/portefeuilles-et-securite/")
    assert visible.status_code == status.HTTP_200_OK
    assert [row["slug"] for row in visible.json()["lessons"]] == list(MODULE_LESSON_SLUGS["portefeuilles-et-securite"])
    module_two_quiz = auth_client.get(
        f"/api/v1/academy/courses/{course.slug}/modules/portefeuilles-et-securite/quizzes/"
    )
    assert module_two_quiz.status_code == status.HTTP_200_OK
    assert len(module_two_quiz.json()["questions"]) == 5
    module_two_blob = json.dumps(module_two_quiz.json(), ensure_ascii=False)
    assert "is_correct" not in module_two_blob
    assert "explanation" not in module_two_blob

    for slug, lessons in MODULE_LESSON_SLUGS.items():
        visible = auth_client.get(f"/api/v1/academy/courses/{course.slug}/modules/{slug}/")
        assert visible.status_code == status.HTTP_200_OK, slug
        assert [row["slug"] for row in visible.json()["lessons"]] == list(lessons)
        public_quiz = auth_client.get(f"/api/v1/academy/courses/{course.slug}/modules/{slug}/quizzes/")
        assert public_quiz.status_code == status.HTTP_200_OK, slug
        assert len(public_quiz.json()["questions"]) == 5
        quiz_blob = json.dumps(public_quiz.json(), ensure_ascii=False)
        assert "is_correct" not in quiz_blob
        assert "explanation" not in quiz_blob

    progress = auth_client.get("/api/v1/academy/me/progress/")
    assert progress.status_code == status.HTTP_200_OK
    summary = progress.json()["summary"]
    assert summary["modules_published"] == 6
    assert summary["lessons_published"] == 24
    assert summary["progress_percent"] == 0
    assert summary["best_score_percent"] == 40
    assert summary["resume"]["lesson_slug"] == "btc-et-satoshis"


def test_academy_content_has_no_payment_or_lnd_dependency():
    sources = []
    for path in ACADEMY_ROOT.rglob("*"):
        if path.suffix not in {".py", ".json"}:
            continue
        if "__pycache__" in path.parts or path.name.startswith("test_"):
            continue
        sources.append(path.read_text(encoding="utf-8"))
    blob = "\n".join(sources)
    for needle in FORBIDDEN_IMPORTS:
        assert needle not in blob, needle
    assert "from smartpay.payments" not in blob
    assert "lnd_client" not in blob
    assert "smartpay.payments" not in blob
