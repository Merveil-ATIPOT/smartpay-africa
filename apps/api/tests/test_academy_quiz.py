import json
from pathlib import Path
from uuid import uuid4

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from smartpay.academy.models import AnswerOption, Course, Lesson, Module, Question, Quiz, QuizAttempt

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
        "is_published": True,
    }
    defaults.update(kwargs)
    return Course.objects.create(**defaults)


def _module(course: Course, **kwargs) -> Module:
    defaults = {
        "slug": "decouvrir-bitcoin",
        "title": "Découvrir Bitcoin",
        "objectives": "Comprendre le réseau.",
        "order": 1,
        "is_published": True,
    }
    defaults.update(kwargs)
    return Module.objects.create(course=course, **defaults)


def _quiz_tree(pass_score=70, published=True, course_slug="bitcoin-lightning-smartpay"):
    course = _course(slug=course_slug)
    module = _module(course)
    Lesson.objects.create(
        module=module,
        slug="intro",
        title="Intro",
        order=1,
        is_published=True,
        duration_minutes=5,
    )
    quiz = Quiz.objects.create(module=module, pass_score=pass_score, is_published=published, content_version=1)
    q1 = Question.objects.create(quiz=quiz, prompt="Regtest a-t-il une valeur de marché ?", explanation="Non, c'est un lab.", order=1)
    q2 = Question.objects.create(quiz=quiz, prompt="1 BTC vaut combien de sats ?", explanation="100 000 000.", order=2)
    q1_ok = AnswerOption.objects.create(question=q1, label="Non", is_correct=True, order=1)
    q1_ko = AnswerOption.objects.create(question=q1, label="Oui", is_correct=False, order=2)
    q2_ok = AnswerOption.objects.create(question=q2, label="100000000", is_correct=True, order=1)
    q2_ko = AnswerOption.objects.create(question=q2, label="1000", is_correct=False, order=2)
    return {
        "course": course,
        "module": module,
        "quiz": quiz,
        "q1": q1,
        "q2": q2,
        "q1_ok": q1_ok,
        "q1_ko": q1_ko,
        "q2_ok": q2_ok,
        "q2_ko": q2_ko,
    }


def _quiz_url(tree) -> str:
    return f"/api/v1/academy/courses/{tree['course'].slug}/modules/{tree['module'].slug}/quizzes/"


def _attempts_url(tree, quiz=None) -> str:
    target = quiz or tree["quiz"]
    return f"{_quiz_url(tree)}{target.id}/attempts/"


def _attempt_url(tree, attempt) -> str:
    return f"{_attempts_url(tree)}{attempt.id}/"


def _answers(tree, q1="ok", q2="ok") -> list[dict]:
    return [
        {"question_id": str(tree["q1"].id), "option_id": str(tree["q1_ok" if q1 == "ok" else "q1_ko"].id)},
        {"question_id": str(tree["q2"].id), "option_id": str(tree["q2_ok" if q2 == "ok" else "q2_ko"].id)},
    ]


def _submit(client, tree, answers=None, key="quiz-1", extra=None):
    payload = {"answers": answers if answers is not None else _answers(tree)}
    if extra:
        payload.update(extra)
    return client.post(_attempts_url(tree), payload, format="json", HTTP_IDEMPOTENCY_KEY=key)


def _detail_message(response):
    payload = response.json()
    detail = payload.get("detail", payload)
    if isinstance(detail, dict):
        return detail.get("detail") or detail
    return detail


@pytest.mark.django_db
def test_published_quiz_requires_authentication(api_client):
    tree = _quiz_tree()
    assert api_client.get(_quiz_url(tree)).status_code == status.HTTP_401_UNAUTHORIZED
    assert api_client.get(_attempts_url(tree)).status_code == status.HTTP_401_UNAUTHORIZED
    assert _submit(api_client, tree).status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_read_published_quiz_without_answers(auth_client):
    tree = _quiz_tree()
    response = auth_client.get(_quiz_url(tree))
    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["id"] == str(tree["quiz"].id)
    assert payload["content_version"] == 1
    assert payload["pass_score"] == 70
    assert [row["prompt"] for row in payload["questions"]] == [
        tree["q1"].prompt,
        tree["q2"].prompt,
    ]
    assert [opt["label"] for opt in payload["questions"][0]["options"]] == ["Non", "Oui"]
    blob = json.dumps(payload, ensure_ascii=False)
    assert "is_correct" not in blob
    assert "explanation" not in blob


@pytest.mark.django_db
def test_unpublished_quiz_is_hidden(auth_client):
    tree = _quiz_tree(published=False)
    response = auth_client.get(_quiz_url(tree))
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert _submit(auth_client, tree).status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_unpublished_parent_hides_quiz(auth_client):
    tree = _quiz_tree()
    tree["course"].is_published = False
    tree["course"].save(update_fields=["is_published"])
    assert auth_client.get(_quiz_url(tree)).status_code == status.HTTP_404_NOT_FOUND
    tree["course"].is_published = True
    tree["course"].save(update_fields=["is_published"])
    tree["module"].is_published = False
    tree["module"].save(update_fields=["is_published"])
    assert auth_client.get(_quiz_url(tree)).status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_submit_valid_attempt_scores_100(auth_client, user):
    tree = _quiz_tree()
    response = _submit(auth_client, tree, key="full")
    assert response.status_code == status.HTTP_201_CREATED
    payload = response.json()
    assert payload["score_percent"] == 100
    assert payload["passed"] is True
    assert payload["pass_score"] == 70
    assert payload["quiz_version"] == 1
    assert payload["quiz_id"] == str(tree["quiz"].id)
    assert all(row["is_correct"] is True for row in payload["answers"])
    assert payload["answers"][0]["explanation"] == "Non, c'est un lab."
    assert QuizAttempt.objects.filter(owner=user).count() == 1


@pytest.mark.django_db
def test_partial_and_zero_scores_and_pass_threshold(auth_client):
    tree = _quiz_tree(pass_score=70)
    partial = _submit(auth_client, tree, answers=_answers(tree, q1="ok", q2="ko"), key="partial")
    assert partial.status_code == status.HTTP_201_CREATED
    assert partial.json()["score_percent"] == 50
    assert partial.json()["passed"] is False

    zero = _submit(auth_client, tree, answers=_answers(tree, q1="ko", q2="ko"), key="zero")
    assert zero.json()["score_percent"] == 0
    assert zero.json()["passed"] is False

    tree["quiz"].pass_score = 50
    tree["quiz"].save(update_fields=["pass_score"])
    retry = _submit(auth_client, tree, answers=_answers(tree, q1="ok", q2="ko"), key="threshold")
    assert retry.json()["score_percent"] == 50
    assert retry.json()["passed"] is True
    assert retry.json()["pass_score"] == 50


@pytest.mark.django_db
def test_foreign_question_is_rejected(auth_client):
    tree = _quiz_tree()
    other = _quiz_tree(course_slug="autre-cours")
    answers = _answers(tree)
    answers[1]["question_id"] = str(other["q2"].id)
    answers[1]["option_id"] = str(other["q2_ok"].id)
    response = _submit(auth_client, tree, answers=answers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert QuizAttempt.objects.count() == 0


@pytest.mark.django_db
def test_foreign_option_is_rejected(auth_client):
    tree = _quiz_tree()
    answers = _answers(tree)
    answers[0]["option_id"] = str(tree["q2_ok"].id)
    response = _submit(auth_client, tree, answers=answers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert QuizAttempt.objects.count() == 0


@pytest.mark.django_db
def test_duplicate_question_is_rejected(auth_client):
    tree = _quiz_tree()
    answers = [_answers(tree)[0], _answers(tree)[0]]
    response = _submit(auth_client, tree, answers=answers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert QuizAttempt.objects.count() == 0


@pytest.mark.django_db
def test_missing_answer_is_rejected(auth_client):
    tree = _quiz_tree()
    response = _submit(auth_client, tree, answers=[_answers(tree)[0]])
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert QuizAttempt.objects.count() == 0


@pytest.mark.django_db
def test_client_forged_score_is_ignored(auth_client):
    tree = _quiz_tree()
    response = _submit(
        auth_client,
        tree,
        answers=_answers(tree, q1="ko", q2="ko"),
        extra={"score": 100, "score_percent": 100, "passed": True, "is_correct": True},
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["score_percent"] == 0
    assert response.json()["passed"] is False


@pytest.mark.django_db
def test_attempts_are_isolated_between_users(auth_client, user, other_user, admin_user):
    tree = _quiz_tree()
    own = _submit(auth_client, tree, key="alice")
    assert own.status_code == status.HTTP_201_CREATED
    attempt_id = own.json()["id"]

    other_client = APIClient()
    other_client.force_authenticate(user=other_user)
    listed = other_client.get(_attempts_url(tree))
    assert listed.status_code == status.HTTP_200_OK
    assert listed.json()["count"] == 0
    hidden = other_client.get(f"{_attempts_url(tree)}{attempt_id}/")
    assert hidden.status_code == status.HTTP_404_NOT_FOUND
    assert _detail_message(hidden) == "Tentative introuvable."

    admin_api = APIClient()
    admin_api.force_authenticate(user=admin_user)
    admin_hidden = admin_api.get(f"{_attempts_url(tree)}{attempt_id}/")
    assert admin_hidden.status_code == status.HTTP_404_NOT_FOUND
    assert QuizAttempt.objects.filter(owner=user).count() == 1
    assert QuizAttempt.objects.filter(owner=other_user).count() == 0


@pytest.mark.django_db
def test_idempotent_retry_returns_same_attempt(auth_client, user):
    tree = _quiz_tree()
    first = _submit(auth_client, tree, key="same-key")
    second = _submit(auth_client, tree, key="same-key")
    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_200_OK
    assert first.json()["id"] == second.json()["id"]
    assert QuizAttempt.objects.filter(owner=user).count() == 1


@pytest.mark.django_db
def test_idempotency_key_cannot_change_payload(auth_client, user):
    tree = _quiz_tree()
    first = _submit(auth_client, tree, answers=_answers(tree, q1="ok", q2="ok"), key="locked")
    assert first.status_code == status.HTTP_201_CREATED
    conflict = _submit(auth_client, tree, answers=_answers(tree, q1="ko", q2="ko"), key="locked")
    assert conflict.status_code == status.HTTP_409_CONFLICT
    assert QuizAttempt.objects.filter(owner=user).count() == 1
    assert QuizAttempt.objects.get().score_percent == 100


@pytest.mark.django_db
def test_attempt_history_keeps_failed_and_later_tries(auth_client, user):
    tree = _quiz_tree()
    failed = _submit(auth_client, tree, answers=_answers(tree, q1="ko", q2="ko"), key="try-1")
    passed = _submit(auth_client, tree, answers=_answers(tree, q1="ok", q2="ok"), key="try-2")
    assert failed.status_code == status.HTTP_201_CREATED
    assert passed.status_code == status.HTTP_201_CREATED
    listed = auth_client.get(_attempts_url(tree))
    assert listed.status_code == status.HTTP_200_OK
    assert listed.json()["count"] == 2
    scores = [row["score_percent"] for row in listed.json()["results"]]
    assert scores == [100, 0]
    assert "is_correct" not in json.dumps(listed.json())
    detail = auth_client.get(_attempt_url(tree, QuizAttempt.objects.get(id=failed.json()["id"])))
    assert detail.status_code == status.HTTP_200_OK
    assert detail.json()["score_percent"] == 0
    assert QuizAttempt.objects.filter(owner=user).count() == 2


@pytest.mark.django_db
def test_historical_correction_uses_attempt_snapshot(auth_client):
    tree = _quiz_tree()
    first = _submit(auth_client, tree, key="v1")
    assert first.json()["score_percent"] == 100
    attempt_id = first.json()["id"]

    tree["q1_ok"].is_correct = False
    tree["q1_ok"].label = "Ancien non"
    tree["q1_ok"].save(update_fields=["is_correct", "label"])
    tree["q1_ko"].is_correct = True
    tree["q1_ko"].label = "Nouveau oui"
    tree["q1_ko"].save(update_fields=["is_correct", "label"])
    tree["q1"].explanation = "Corrigé après coup."
    tree["q1"].save(update_fields=["explanation"])
    tree["quiz"].content_version = 2
    tree["quiz"].save(update_fields=["content_version"])

    historical = auth_client.get(f"{_attempts_url(tree)}{attempt_id}/")
    assert historical.status_code == status.HTTP_200_OK
    payload = historical.json()
    assert payload["quiz_version"] == 1
    assert payload["score_percent"] == 100
    assert payload["answers"][0]["explanation"] == "Non, c'est un lab."
    assert payload["answers"][0]["correct_label"] == "Non"
    assert payload["answers"][0]["is_correct"] is True

    latest = _submit(auth_client, tree, key="v2")
    assert latest.status_code == status.HTTP_201_CREATED
    assert latest.json()["quiz_version"] == 2
    assert latest.json()["score_percent"] == 50


@pytest.mark.django_db
def test_unknown_quiz_id_is_not_found(auth_client):
    tree = _quiz_tree()
    response = auth_client.get(f"{_quiz_url(tree)}{uuid4()}/attempts/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_academy_quiz_has_no_payment_or_lnd_dependency():
    sources = []
    for path in ACADEMY_ROOT.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        sources.append(path.read_text(encoding="utf-8"))
    blob = "\n".join(sources)
    for needle in FORBIDDEN_IMPORTS:
        assert needle not in blob, needle
    assert "from smartpay.ai_assistant" not in blob
