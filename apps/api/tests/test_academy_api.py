import json
from datetime import timedelta
from pathlib import Path

import pytest
from django.utils import timezone
from rest_framework import status

from smartpay.academy.models import (
    AnswerOption,
    Course,
    Exercise,
    Lesson,
    LessonProgress,
    Module,
    Question,
    Quiz,
)

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

COURSES_URL = "/api/v1/academy/courses/"


def _course(**kwargs) -> Course:
    defaults = {
        "slug": "bitcoin-lightning-smartpay",
        "title": "Bitcoin et Lightning",
        "summary": "Cours de démonstration",
        "content_version": 1,
        "is_published": True,
    }
    defaults.update(kwargs)
    return Course.objects.create(**defaults)


def _module(course: Course, **kwargs) -> Module:
    defaults = {
        "slug": "decouvrir-bitcoin",
        "title": "Découvrir Bitcoin",
        "objectives": "Comprendre le réseau et l'unité.",
        "order": 1,
        "is_published": True,
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
        "is_published": True,
    }
    defaults.update(kwargs)
    return Lesson.objects.create(module=module, **defaults)


def _catalog():
    course = _course()
    module = _module(course)
    lesson = _lesson(module)
    Exercise.objects.create(
        lesson=lesson,
        type=Exercise.Kind.REFLECTION,
        prompt="Que retenir ?",
        content={"hint": "Pensez à l'unité la plus petite.", "is_correct": True},
        order=1,
    )
    quiz = Quiz.objects.create(module=module, pass_score=70, is_published=True)
    question = Question.objects.create(quiz=quiz, prompt="Regtest a-t-il une valeur de marché ?", order=1)
    AnswerOption.objects.create(question=question, label="Non", is_correct=True, order=1)
    AnswerOption.objects.create(question=question, label="Oui", is_correct=False, order=2)
    return course, module, lesson


def _lesson_url(course, module, lesson, suffix=""):
    return (
        f"/api/v1/academy/courses/{course.slug}/modules/{module.slug}"
        f"/lessons/{lesson.slug}/{suffix}"
    )


def _dump(response) -> str:
    return json.dumps(response.json(), ensure_ascii=False)


@pytest.mark.django_db
def test_catalog_requires_authentication(api_client):
    course, module, lesson = _catalog()
    urls = [
        COURSES_URL,
        f"{COURSES_URL}{course.slug}/",
        f"{COURSES_URL}{course.slug}/modules/{module.slug}/",
        _lesson_url(course, module, lesson),
        _lesson_url(course, module, lesson, "complete/"),
        _lesson_url(course, module, lesson, "start/"),
    ]
    for url in urls:
        method = api_client.post if url.endswith("complete/") or url.endswith("start/") else api_client.get
        response = method(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED, url


@pytest.mark.django_db
def test_authenticated_catalog_lists_published_courses_only(auth_client):
    published, _, _ = _catalog()
    _course(slug="draft-course", title="Brouillon", is_published=False)
    _module(published, slug="draft-module", title="Module brouillon", order=2, is_published=False)

    response = auth_client.get(COURSES_URL)
    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 1
    assert [row["slug"] for row in payload["results"]] == [published.slug]
    course = payload["results"][0]
    assert course["title"] == published.title
    assert course["summary"] == published.summary
    assert course["content_version"] == 1
    assert course["published_module_count"] == 1
    assert "is_correct" not in _dump(response)


@pytest.mark.django_db
def test_unpublished_course_module_and_lesson_are_hidden(auth_client):
    course, module, lesson = _catalog()
    hidden_course = _course(slug="hidden-course", title="Caché", is_published=False)
    hidden_module = _module(hidden_course, slug="hidden-module")
    hidden_lesson = _lesson(hidden_module, slug="hidden-lesson")
    unpublished_module = _module(course, slug="unpublished-mod", order=2, is_published=False)
    unpublished_lesson = _lesson(unpublished_module, slug="unpublished-in-hidden-mod")
    draft_lesson = _lesson(module, slug="draft-lesson", title="Brouillon", order=2, is_published=False)

    missing_urls = [
        f"{COURSES_URL}{hidden_course.slug}/",
        f"{COURSES_URL}{hidden_course.slug}/modules/{hidden_module.slug}/",
        _lesson_url(hidden_course, hidden_module, hidden_lesson),
        f"{COURSES_URL}{course.slug}/modules/{unpublished_module.slug}/",
        _lesson_url(course, unpublished_module, unpublished_lesson),
        _lesson_url(course, module, draft_lesson),
        f"{COURSES_URL}inconnu/",
    ]
    for url in missing_urls:
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND, url
        payload = response.json()
        assert payload["error"] is True
        assert payload["detail"]["detail"] == "Contenu introuvable."

    detail = auth_client.get(f"{COURSES_URL}{course.slug}/")
    assert detail.status_code == status.HTTP_200_OK
    assert [row["slug"] for row in detail.json()["modules"]] == [module.slug]
    assert detail.json()["modules"][0]["published_lesson_count"] == 1

    module_detail = auth_client.get(f"{COURSES_URL}{course.slug}/modules/{module.slug}/")
    assert [row["slug"] for row in module_detail.json()["lessons"]] == [lesson.slug]


@pytest.mark.django_db
def test_catalog_follows_pedagogical_order(auth_client):
    course = _course()
    later = _module(course, slug="module-deux", title="Deux", order=2, objectives="Second.")
    earlier = _module(course, slug="module-un", title="Un", order=1, objectives="Premier.")
    _lesson(later, slug="lecon-b", title="B", order=2, duration_minutes=8)
    _lesson(later, slug="lecon-a", title="A", order=1, duration_minutes=4)

    detail = auth_client.get(f"{COURSES_URL}{course.slug}/")
    assert [row["slug"] for row in detail.json()["modules"]] == ["module-un", "module-deux"]
    assert [row["order"] for row in detail.json()["modules"]] == [1, 2]

    module_detail = auth_client.get(f"{COURSES_URL}{course.slug}/modules/{later.slug}/")
    assert module_detail.status_code == status.HTTP_200_OK
    lessons = module_detail.json()["lessons"]
    assert [row["slug"] for row in lessons] == ["lecon-a", "lecon-b"]
    assert [row["order"] for row in lessons] == [1, 2]
    assert lessons[0]["duration_minutes"] == 4
    assert module_detail.json()["course"]["slug"] == course.slug
    assert module_detail.json()["objectives"] == "Second."


@pytest.mark.django_db
def test_lesson_consultation_returns_body_and_exercises_without_answers(auth_client):
    course, module, lesson = _catalog()
    response = auth_client.get(_lesson_url(course, module, lesson))
    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["id"] == str(lesson.id)
    assert payload["title"] == lesson.title
    assert payload["body_md"] == lesson.body_md
    assert payload["difficulty"] == Lesson.Difficulty.INTRO
    assert payload["duration_minutes"] == 5
    assert payload["module"]["slug"] == module.slug
    assert payload["module"]["course_slug"] == course.slug
    assert len(payload["exercises"]) == 1
    assert payload["exercises"][0]["prompt"] == "Que retenir ?"
    assert payload["exercises"][0]["content"] == {"hint": "Pensez à l'unité la plus petite."}
    blob = _dump(response)
    assert "is_correct" not in blob
    assert "preimage" not in blob
    assert LessonProgress.objects.count() == 0


@pytest.mark.django_db
def test_complete_lesson_is_idempotent_and_ignores_client_fields(auth_client, user, other_user):
    course, module, lesson = _catalog()
    first = auth_client.post(
        _lesson_url(course, module, lesson, "complete/"),
        {
            "owner": other_user.id,
            "score": 99,
            "completed_at": "2020-01-01T00:00:00Z",
        },
        format="json",
    )
    assert first.status_code == status.HTTP_200_OK
    payload = first.json()
    assert payload["status"] == LessonProgress.Status.COMPLETED
    assert payload["lesson_id"] == str(lesson.id)
    assert payload["completed_at"] is not None
    assert "owner" not in payload
    assert "score" not in payload

    first_completed_at = LessonProgress.objects.get(owner=user, lesson=lesson).completed_at
    LessonProgress.objects.filter(owner=user, lesson=lesson).update(
        completed_at=first_completed_at - timedelta(hours=2)
    )
    original = LessonProgress.objects.get(owner=user, lesson=lesson).completed_at

    second = auth_client.post(_lesson_url(course, module, lesson, "complete/"), format="json")
    assert second.status_code == status.HTTP_200_OK
    assert LessonProgress.objects.filter(lesson=lesson).count() == 1
    assert LessonProgress.objects.get(owner=user, lesson=lesson).completed_at == original
    assert LessonProgress.objects.filter(owner=other_user).count() == 0


@pytest.mark.django_db
def test_progress_isolation_between_users(auth_client, api_client, user, other_user):
    course, module, lesson = _catalog()
    own = auth_client.post(_lesson_url(course, module, lesson, "complete/"), format="json")
    assert own.status_code == status.HTTP_200_OK

    api_client.force_authenticate(user=other_user)
    other = api_client.post(_lesson_url(course, module, lesson, "start/"), format="json")
    assert other.status_code == status.HTTP_200_OK
    assert other.json()["status"] == LessonProgress.Status.STARTED
    assert other.json()["completed_at"] is None

    assert LessonProgress.objects.filter(owner=user, lesson=lesson, status="completed").count() == 1
    assert LessonProgress.objects.filter(owner=other_user, lesson=lesson, status="started").count() == 1
    assert LessonProgress.objects.filter(lesson=lesson).count() == 2


@pytest.mark.django_db
def test_get_does_not_start_progress_but_start_endpoint_does(auth_client, user):
    course, module, lesson = _catalog()
    lookup = auth_client.get(_lesson_url(course, module, lesson))
    assert lookup.status_code == status.HTTP_200_OK
    assert LessonProgress.objects.count() == 0

    started = auth_client.post(_lesson_url(course, module, lesson, "start/"), format="json")
    assert started.status_code == status.HTTP_200_OK
    assert started.json()["status"] == LessonProgress.Status.STARTED
    assert LessonProgress.objects.filter(owner=user, lesson=lesson).count() == 1

    again = auth_client.post(_lesson_url(course, module, lesson, "start/"), format="json")
    assert again.status_code == status.HTTP_200_OK
    assert LessonProgress.objects.filter(owner=user, lesson=lesson).count() == 1


@pytest.mark.django_db
def test_complete_unpublished_lesson_is_not_found(auth_client):
    course, module, lesson = _catalog()
    lesson.is_published = False
    lesson.save(update_fields=["is_published"])
    response = auth_client.post(_lesson_url(course, module, lesson, "complete/"), format="json")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert LessonProgress.objects.count() == 0


@pytest.mark.django_db
def test_academy_api_has_no_payment_or_lnd_dependency():
    sources = []
    for path in ACADEMY_ROOT.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        sources.append(path.read_text(encoding="utf-8"))
    blob = "\n".join(sources)
    for needle in FORBIDDEN_IMPORTS:
        assert needle not in blob, needle
    assert "from smartpay.ai_assistant" not in blob


@pytest.mark.django_db
def test_complete_keeps_first_completion_without_rewriting(auth_client, user):
    course, module, lesson = _catalog()
    auth_client.post(_lesson_url(course, module, lesson, "complete/"), format="json")
    row = LessonProgress.objects.get(owner=user, lesson=lesson)
    first_at = timezone.now() - timedelta(days=1)
    LessonProgress.objects.filter(pk=row.pk).update(completed_at=first_at)
    first_at = LessonProgress.objects.get(pk=row.pk).completed_at

    auth_client.post(_lesson_url(course, module, lesson, "complete/"), format="json")
    row.refresh_from_db()
    assert row.completed_at == first_at
    assert row.status == LessonProgress.Status.COMPLETED
