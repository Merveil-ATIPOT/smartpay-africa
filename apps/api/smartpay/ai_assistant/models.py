from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_conversations",
    )
    title = models.CharField(max_length=120, default="Nouvelle conversation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        indexes = [
            models.Index(fields=["owner", "-updated_at"]),
        ]

    def __str__(self) -> str:
        return self.title


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user", _("Utilisateur")
        ASSISTANT = "assistant", _("Assistant")

    class ResponseType(models.TextChoices):
        FAQ = "faq", _("FAQ")
        UNSUPPORTED = "unsupported", _("Non couvert")
        ERROR = "error", _("Erreur")
        BLOCKED = "blocked", _("Refusé")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=16, choices=Role.choices)
    content = models.TextField()
    response_type = models.CharField(max_length=16, choices=ResponseType.choices, blank=True)
    idempotency_key = models.CharField(max_length=64, blank=True)
    in_reply_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at", "id")
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "idempotency_key"],
                condition=~models.Q(idempotency_key="") & models.Q(role="user"),
                name="ai_message_idempotency_per_conversation",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.role}:{self.id}"
