"""Gestion des conversations. N'appelle ni LND ni les paiements."""

from __future__ import annotations

import logging
import re

from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from smartpay.ai_assistant.engine import AnswerEngine, get_default_engine
from smartpay.ai_assistant.models import Conversation, Message


def resolve_message_idempotency_key(request, payload_key: str = "") -> str:
    header = ""
    if request is not None:
        header = request.headers.get("Idempotency-Key", "") or request.META.get(
            "HTTP_IDEMPOTENCY_KEY",
            "",
        )
    return (header or payload_key or "").strip()[:64]

logger = logging.getLogger(__name__)

DEFAULT_TITLE = "Nouvelle conversation"
MAX_QUESTION_LENGTH = 1000
MAX_TITLE_LENGTH = 80

_JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")
_HEX_SECRET_RE = re.compile(r"\b[a-fA-F0-9]{64,}\b")


def looks_like_secret(text: str) -> bool:
    raw = text.strip()
    if _JWT_RE.search(raw):
        return True
    if _HEX_SECRET_RE.search(raw.replace(" ", "")):
        return True
    return False


def get_owned_conversation(user, conversation_id) -> Conversation:
    try:
        conversation = Conversation.objects.get(pk=conversation_id, owner=user)
    except Conversation.DoesNotExist as exc:
        raise NotFound("Conversation introuvable.") from exc
    return conversation


def create_conversation(*, user, title: str = "") -> Conversation:
    cleaned = (title or "").strip()[:120]
    return Conversation.objects.create(
        owner=user,
        title=cleaned or DEFAULT_TITLE,
    )


def _title_from_question(content: str) -> str:
    compact = " ".join(content.split())
    if len(compact) <= MAX_TITLE_LENGTH:
        return compact
    return f"{compact[: MAX_TITLE_LENGTH - 1]}…"


@transaction.atomic
def post_user_message(
    *,
    user,
    conversation_id,
    content: str,
    idempotency_key: str = "",
    request=None,
    engine: AnswerEngine | None = None,
) -> tuple[Message, Message, bool]:
    conversation = get_owned_conversation(user, conversation_id)
    text = (content or "").strip()
    if not text:
        raise ValidationError({"content": "Le message ne peut pas être vide."})
    if len(text) > MAX_QUESTION_LENGTH:
        raise ValidationError({"content": f"Le message dépasse {MAX_QUESTION_LENGTH} caractères."})
    if looks_like_secret(text):
        raise ValidationError(
            {
                "content": (
                    "Ce message ressemble à un secret (jeton, clé ou empreinte). "
                    "Il n'a pas été enregistré. Ne partagez jamais de seed, JWT ou macaroon."
                )
            }
        )

    key = resolve_message_idempotency_key(request, idempotency_key)
    if key:
        existing = (
            Message.objects.select_related("conversation")
            .filter(conversation=conversation, role=Message.Role.USER, idempotency_key=key)
            .first()
        )
        if existing:
            reply = existing.replies.filter(role=Message.Role.ASSISTANT).first()
            if reply:
                logger.info(
                    "ai_assistant.idempotent conversation=%s user_message=%s",
                    conversation.id,
                    existing.id,
                )
                return existing, reply, True

    engine = engine or get_default_engine()
    try:
        answer = engine.answer(text)
    except Exception:
        logger.exception("ai_assistant.engine_error conversation=%s", conversation.id)
        answer_content = (
            "L'assistant est temporairement indisponible. "
            "Réessayez plus tard. Aucune donnée financière n'a été consultée."
        )
        response_type = Message.ResponseType.ERROR
    else:
        answer_content = answer.content
        response_type = answer.response_type

    user_message = Message.objects.create(
        conversation=conversation,
        role=Message.Role.USER,
        content=text,
        idempotency_key=key,
    )
    assistant_message = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content=answer_content,
        response_type=response_type,
        in_reply_to=user_message,
    )
    updates = ["updated_at"]
    if conversation.title == DEFAULT_TITLE:
        conversation.title = _title_from_question(text)
        updates.append("title")
    conversation.save(update_fields=updates)
    logger.info(
        "ai_assistant.replied conversation=%s user_message=%s assistant_message=%s type=%s",
        conversation.id,
        user_message.id,
        assistant_message.id,
        response_type,
    )
    return user_message, assistant_message, False
