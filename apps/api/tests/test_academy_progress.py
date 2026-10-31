from pathlib import Path

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smartpay.academy.models import (
    AnswerOption,
    Course,
    CourseProgress,
    Lesson,
    LessonProgress,
    Module,
    Question,
    Quiz,
    QuizAttempt,
)

PROGRESS_URL = "/api/v1/academy/me/progress/"
ACADEMY_ROOT = Path(__file__).resolve().parents[1] / "smartpay" / "academy"


def _course(**kwargs) -> Course:
    defaults = {
        "slug": "bitcoin-lightning-smartpay",
        "title": "Bitcoin et Lightning",
        "is_published": True,
        "content_version": 1,
    }
    defaults.update(kwargs)
    return Course.objects.create(**defaults)


def _module(course: Course, **kwargs) -> Module:
    defaults = {"slug": "decouvrir-bitcoin", "title": "Découvrir Bitcoin", "order": 1, "is_published": True}
    defaults.update(kwargs)
    return Module.objects.create(course=course, **defaults)


def _lesson(module: Module, **kwargs) -> Lesson:
    defaults = {
        "slug": "btc-et-sats",
        "title": "BTC et satoshis",
        "order": 1,
        "is_published": True,
        "duration_minutes": 5,
    }
    defaults.update(kwargs)
    return Lesson.objects.create(module=module, **defaults)


def _published_quiz(module: Module, pass_score=70):
    quiz = Quiz.objects.create(module=module, pass_score=pass_score, is_published=True)
    question = Question.objects.create(quiz=quiz, prompt="Regtest ?", explanation="Non.", order=1)
    ok = AnswerOption.objects.create(question=question, label="Non", is_correct=True, order=1)
    ko = AnswerOption.objects.create(question=question, label="Oui", is_correct=False, order=2)
    return quiz, question, ok, ko


def _tree(with_quiz=True):
    course = _course()
    module = _module(course)
    lesson = _lesson(module)
    extra = {}
    if with_quiz:
        quiz, question, ok, ko = _published_quiz(module)
        extra = {"quiz": quiz, "question": question, "ok": ok, "ko": ko}
    return {"course": course, "module": module, "lesson": lesson, **extra}


def _submit(auth_client, tree, option, key):
    return auth_client.post(
        f"/api/v1/academy/courses/{tree['course'].slug}/modules/{tree['module'].slug}/quizzes/{tree['quiz'].id}/attempts/",
        {"answers": [{"question_id": str(tree["question"].id), "option_id": str(option.id)}]},
        format="json",
        HTTP_IDEMPOTENCY_KEY=key,
    )


@pytest.mark.django_db
def test_progress_requires_authentication(api_client):
    assert api_client.get(PROGRESS_URL).status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_empty_progress_for_new_account(auth_client):
    tree = _tree()
    response = auth_client.get(PROGRESS_URL)
    assert response.status_code == status.HTTP_200_OK
    summary = response.json()["summary"]
    assert summary["lessons_started"] == 0
    assert summary["lessons_completed"] == 0
    assert summary["lessons_published"] == 1
    assert summary["modules_completed"] == 0
    assert summary["progress_percent"] == 0
    assert summary["best_score_percent"] is None
    assert summary["quiz_attempts"] == 0
    assert summary["resume"]["kind"] == "lesson"
    assert summary["resume"]["lesson_slug"] == tree["lesson"].slug


@pytest.mark.django_db
def test_started_and_completed_lesson(auth_client, user):
    tree = _tree()
    start = auth_client.post(
        f"/api/v1/academy/courses/{tree['course'].slug}/modules/{tree['module'].slug}/lessons/{tree['lesson'].slug}/start/",
        {},
        format="json",
    )
    assert start.status_code == status.HTTP_200_OK
    started = auth_client.get(PROGRESS_URL).json()
    assert started["summary"]["lessons_started"] == 1
    assert started["summary"]["lessons_completed"] == 0
    assert started["summary"]["resume"]["kind"] == "lesson"
    assert LessonProgress.objects.get(owner=user, lesson=tree["lesson"]).status == "started"

    complete = auth_client.post(
        f"/api/v1/academy/courses/{tree['course'].slug}/modules/{tree['module'].slug}/lessons/{tree['lesson'].slug}/complete/",
        {},
        format="json",
    )
    assert complete.status_code == status.HTTP_200_OK
    done = auth_client.get(PROGRESS_URL).json()
    assert done["summary"]["lessons_completed"] == 1
    assert done["summary"]["resume"]["kind"] == "quiz"
    assert done["courses"][0]["modules"][0]["completed"] is False


@pytest.mark.django_db
def test_failed_then_passed_quiz_keeps_best_score(auth_client):
    tree = _tree()
    auth_client.post(
        f"/api/v1/academy/courses/{tree['course'].slug}/modules/{tree['module'].slug}/lessons/{tree['lesson'].slug}/complete/",
        {},
        format="json",
    )
    failed = _submit(auth_client, tree, tree["ko"], "fail")
    assert failed.status_code == status.HTTP_201_CREATED
    after_fail = auth_client.get(PROGRESS_URL).json()
    assert after_fail["summary"]["quiz_attempts"] == 1
    assert after_fail["summary"]["quizzes_passed"] == 0
    assert after_fail["summary"]["best_score_percent"] == 0
    assert after_fail["summary"]["resume"]["kind"] == "quiz"

    passed = _submit(auth_client, tree, tree["ok"], "pass")
    assert passed.status_code == status.HTTP_201_CREATED
    again = _submit(auth_client, tree, tree["ko"], "fail-again")
    assert again.status_code == status.HTTP_201_CREATED
    payload = auth_client.get(PROGRESS_URL).json()
    assert payload["summary"]["quiz_attempts"] == 3
    assert payload["summary"]["quizzes_passed"] == 1
    assert payload["summary"]["best_score_percent"] == 100
    assert payload["summary"]["modules_completed"] == 1
    assert payload["summary"]["progress_percent"] == 100
    assert payload["courses"][0]["completed"] is True
    assert payload["summary"]["resume"]["kind"] == "completed"


@pytest.mark.django_db
def test_module_and_course_completion_formulas(auth_client):
    tree = _tree(with_quiz=False)
    second = _module(tree["course"], slug="module-deux", title="Deux", order=2)
    extra = _lesson(second, slug="deuxieme", title="Deuxième", order=1)
    auth_client.post(
        f"/api/v1/academy/courses/{tree['course'].slug}/modules/{tree['module'].slug}/lessons/{tree['lesson'].slug}/complete/",
        {},
        format="json",
    )
    mid = auth_client.get(PROGRESS_URL).json()
    assert mid["summary"]["modules_completed"] == 1
    assert mid["summary"]["modules_published"] == 2
    assert mid["summary"]["progress_percent"] == 50
    assert mid["summary"]["resume"]["lesson_slug"] == extra.slug

    auth_client.post(
        f"/api/v1/academy/courses/{tree['course'].slug}/modules/{second.slug}/lessons/{extra.slug}/complete/",
        {},
        format="json",
    )
    done = auth_client.get(PROGRESS_URL).json()
    assert done["summary"]["modules_completed"] == 2
    assert done["summary"]["progress_percent"] == 100
    assert done["courses"][0]["completed"] is True


@pytest.mark.django_db
def test_unpublished_content_is_ignored(auth_client, user):
    tree = _tree()
    hidden = _lesson(tree["module"], slug="cachee", title="Cachée", order=2)
    LessonProgress.objects.create(owner=user, lesson=hidden, status=LessonProgress.Status.STARTED)
    hidden.is_published = False
    hidden.save(update_fields=["is_published"])
    payload = auth_client.get(PROGRESS_URL).json()
    assert payload["summary"]["lessons_started"] == 0
    assert payload["summary"]["lessons_published"] == 1
    assert payload["summary"]["resume"]["lesson_slug"] == tree["lesson"].slug
    slugs = [item["slug"] for item in payload["courses"][0]["modules"][0]["lessons"]]
    assert "cachee" not in slugs


@pytest.mark.django_db
def test_progress_is_isolated_and_persists_on_reread(auth_client, user, other_user):
    tree = _tree(with_quiz=False)
    auth_client.post(
        f"/api/v1/academy/courses/{tree['course'].slug}/modules/{tree['module'].slug}/lessons/{tree['lesson'].slug}/complete/",
        {},
        format="json",
    )
    first = auth_client.get(PROGRESS_URL).json()
    second = auth_client.get(PROGRESS_URL).json()
    assert first["summary"] == second["summary"]
    assert CourseProgress.objects.get(owner=user, course=tree["course"]).percent == 100

    other = APIClient()
    other.force_authenticate(user=other_user)
    foreign = other.get(PROGRESS_URL).json()
    assert foreign["summary"]["lessons_completed"] == 0
    assert foreign["summary"]["progress_percent"] == 0
    assert LessonProgress.objects.filter(owner=other_user).count() == 0


@pytest.mark.django_db
def test_progress_module_has_no_payment_dependency():
    blob = "\n".join(
        path.read_text(encoding="utf-8")
        for path in ACADEMY_ROOT.rglob("*.py")
        if "__pycache__" not in path.parts
    )
    assert "from smartpay.payments" not in blob
    assert "lnd_client" not in blob
    assert "from smartpay.ai_assistant" not in blob
