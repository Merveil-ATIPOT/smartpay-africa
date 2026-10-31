from pathlib import Path

import pytest
from django.core.cache import cache
from django.test.utils import override_settings
from rest_framework import status

from smartpay.ai_assistant.engine import FAQ_CATALOG, FaqEngine, UNSUPPORTED_REPLY
from smartpay.ai_assistant.models import Conversation, Message
from smartpay.ai_assistant.services import MAX_QUESTION_LENGTH

CONV_URL = "/api/v1/ai/conversations/"
AI_ROOT = Path(__file__).resolve().parents[1] / "smartpay" / "ai_assistant"

FORBIDDEN_ENGINE = (
    "SN-8924",
    "0,8 seconde",
    "0.8 seconde",
    "99,9",
    "99.9",
    "SmartPay AI v2.4",
    "lnd.macaroon",
)

FORBIDDEN_IMPORTS = (
    "send_payment",
    "reconcile_payment",
    "create_invoice",
    "create_outgoing_payment",
    "production_ports",
    "get_payment_provider",
)


@pytest.fixture(autouse=True)
def _clear_ai_throttle():
    cache.clear()
    yield
    cache.clear()


def _messages_url(conversation_id) -> str:
    return f"{CONV_URL}{conversation_id}/messages/"


@pytest.mark.django_db
def test_create_conversation_requires_jwt(api_client):
    response = api_client.post(CONV_URL, {}, format="json")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_create_and_list_own_conversations(auth_client, user, other_user):
    Conversation.objects.create(owner=other_user, title="Chez Bob")
    created = auth_client.post(CONV_URL, {"title": "Ma FAQ"}, format="json")
    assert created.status_code == status.HTTP_201_CREATED
    assert created.data["title"] == "Ma FAQ"
    listed = auth_client.get(CONV_URL)
    assert listed.status_code == status.HTTP_200_OK
    assert listed.data["count"] == 1
    assert listed.data["results"][0]["id"] == created.data["id"]
    assert listed.data["results"][0]["message_count"] == 0
    assert all(item["title"] != "Chez Bob" for item in listed.data["results"])


@pytest.mark.django_db
def test_conversation_list_paginates_without_dropping_older_rows(auth_client, user):
    for index in range(21):
        Conversation.objects.create(owner=user, title=f"FAQ {index}")
    first = auth_client.get(CONV_URL + "?page_size=20")
    assert first.status_code == status.HTTP_200_OK
    assert first.data["count"] == 21
    assert len(first.data["results"]) == 20
    assert first.data["next"]
    second = auth_client.get(CONV_URL + "?page=2&page_size=20")
    assert second.status_code == status.HTTP_200_OK
    assert len(second.data["results"]) == 1
    ids = {item["id"] for item in first.data["results"]} | {item["id"] for item in second.data["results"]}
    assert len(ids) == 21


@pytest.mark.django_db
def test_other_user_and_admin_cannot_read_private_conversation(auth_client, api_client, admin_client, other_user):
    created = auth_client.post(CONV_URL, {}, format="json")
    url = f"{CONV_URL}{created.data['id']}/"
    api_client.force_authenticate(user=other_user)
    assert api_client.get(url).status_code == status.HTTP_404_NOT_FOUND
    assert admin_client.get(url).status_code == status.HTTP_404_NOT_FOUND
    assert admin_client.get(_messages_url(created.data["id"])).status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_post_message_persists_user_and_assistant(auth_client):
    conversation = auth_client.post(CONV_URL, {}, format="json").data
    response = auth_client.post(
        _messages_url(conversation["id"]),
        {"content": "Qu'est-ce que le Lightning Network ?"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["user_message"]["role"] == "user"
    assert response.data["assistant_message"]["role"] == "assistant"
    assert response.data["assistant_message"]["response_type"] == "faq"
    assert "Lightning" in response.data["assistant_message"]["content"]
    assert Message.objects.filter(conversation_id=conversation["id"]).count() == 2
    listed = auth_client.get(CONV_URL)
    assert listed.data["results"][0]["message_count"] == 2


@pytest.mark.django_db
def test_history_survives_new_client(auth_client, api_client, user):
    conversation = auth_client.post(CONV_URL, {}, format="json").data
    auth_client.post(
        _messages_url(conversation["id"]),
        {"content": "Qu'est-ce qu'un satoshi ?"},
        format="json",
    )
    api_client.force_authenticate(user=user)
    history = api_client.get(_messages_url(conversation["id"]))
    assert history.status_code == status.HTTP_200_OK
    assert history.data["count"] == 2
    roles = [item["role"] for item in history.data["results"]]
    assert roles == ["user", "assistant"]


@pytest.mark.django_db
def test_empty_and_too_long_messages(auth_client):
    conversation = auth_client.post(CONV_URL, {}, format="json").data
    empty = auth_client.post(_messages_url(conversation["id"]), {"content": "   "}, format="json")
    assert empty.status_code == status.HTTP_400_BAD_REQUEST
    long_one = auth_client.post(
        _messages_url(conversation["id"]),
        {"content": "x" * (MAX_QUESTION_LENGTH + 1)},
        format="json",
    )
    assert long_one.status_code == status.HTTP_400_BAD_REQUEST
    assert Message.objects.filter(conversation_id=conversation["id"]).count() == 0


@pytest.mark.django_db
def test_unknown_question_is_honest(auth_client):
    conversation = auth_client.post(CONV_URL, {}, format="json").data
    response = auth_client.post(
        _messages_url(conversation["id"]),
        {"content": "Quel est le cours réel du bitcoin aujourd'hui ?"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["assistant_message"]["response_type"] == "unsupported"
    assert response.data["assistant_message"]["content"] == UNSUPPORTED_REPLY


@pytest.mark.django_db
def test_idempotent_message_replay(auth_client):
    conversation = auth_client.post(CONV_URL, {}, format="json").data
    payload = {"content": "Qu'est-ce que Bitcoin ?", "idempotency_key": "ai-1"}
    first = auth_client.post(_messages_url(conversation["id"]), payload, format="json")
    second = auth_client.post(_messages_url(conversation["id"]), payload, format="json")
    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_200_OK
    assert first.data["user_message"]["id"] == second.data["user_message"]["id"]
    assert first.data["assistant_message"]["id"] == second.data["assistant_message"]["id"]
    assert Message.objects.filter(conversation_id=conversation["id"]).count() == 2


@pytest.mark.django_db
@override_settings(AUTH_AI_MESSAGE_THROTTLE_RATE="1/min")
def test_message_rate_limit(auth_client):
    cache.clear()
    conversation = auth_client.post(CONV_URL, {}, format="json").data
    first = auth_client.post(
        _messages_url(conversation["id"]),
        {"content": "Qu'est-ce que Bitcoin ?"},
        format="json",
    )
    second = auth_client.post(
        _messages_url(conversation["id"]),
        {"content": "Qu'est-ce qu'un satoshi ?"},
        format="json",
    )
    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.django_db
def test_method_not_allowed_and_secret_rejected(auth_client):
    conversation = auth_client.post(CONV_URL, {}, format="json").data
    deleted = auth_client.delete(f"{CONV_URL}{conversation['id']}/")
    assert deleted.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
    secret = auth_client.post(
        _messages_url(conversation["id"]),
        {"content": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.abc"},
        format="json",
    )
    assert secret.status_code == status.HTTP_400_BAD_REQUEST
    assert Message.objects.filter(conversation_id=conversation["id"]).count() == 0


@pytest.mark.django_db
def test_messages_are_chronological(auth_client):
    conversation = auth_client.post(CONV_URL, {}, format="json").data
    auth_client.post(_messages_url(conversation["id"]), {"content": "Qu'est-ce que Bitcoin ?"}, format="json")
    auth_client.post(_messages_url(conversation["id"]), {"content": "Qu'est-ce qu'un satoshi ?"}, format="json")
    history = auth_client.get(_messages_url(conversation["id"]) + "?page_size=100")
    created = [item["created_at"] for item in history.data["results"]]
    assert created == sorted(created)
    assert history.data["count"] == 4


def test_engine_covers_themes_without_invented_claims():
    engine = FaqEngine()
    samples = {
        "Qu'est-ce que Bitcoin ?": "faq",
        "Qu'est-ce qu'un satoshi ?": "faq",
        "À quoi sert un portefeuille ?": "faq",
        "Qu'est-ce que Lightning ?": "faq",
        "Comment fonctionne un canal ?": "faq",
        "Qu'est-ce qu'une facture BOLT11 ?": "faq",
        "Pourquoi un paiement peut-il échouer ?": "faq",
        "Comment fonctionnent les frais Lightning ?": "faq",
        "Quelle différence entre Lightning et un virement bancaire ?": "faq",
        "À quoi sert SmartPay Africa ?": "faq",
        "Quelle différence entre Regtest et Mainnet ?": "faq",
        "Pourquoi les transferts Mobile Money sont-ils simulés ?": "faq",
        "Pourquoi une opération préparée n'est-elle pas nécessairement réglée ?": "faq",
        "Comment protéger son portefeuille ?": "faq",
        "Pourquoi ne jamais partager une seed ?": "faq",
        "Que faire en cas de paiement non confirmé ?": "faq",
        "Quel est le prix exact du bitcoin en bourse ?": "unsupported",
    }
    for question, expected in samples.items():
        answer = engine.answer(question)
        assert answer.response_type == expected, question
        blob = answer.content
        for forbidden in FORBIDDEN_ENGINE:
            assert forbidden.lower() not in blob.lower(), forbidden


def test_ai_module_does_not_call_payments_or_lnd():
    sources = []
    for path in AI_ROOT.rglob("*.py"):
        if "__pycache__" in path.parts or path.name.startswith("test_"):
            continue
        sources.append(path.read_text(encoding="utf-8"))
    blob = "\n".join(sources)
    assert "from smartpay.payments" not in blob
    assert "import smartpay.payments" not in blob
    assert "from smartpay.transfers" not in blob
    for needle in FORBIDDEN_IMPORTS:
        assert needle not in blob
    assert len(FAQ_CATALOG) >= 10
