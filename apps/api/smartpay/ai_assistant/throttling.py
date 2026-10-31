"""Limitation des messages IA par utilisateur authentifié."""

from django.conf import settings
from rest_framework.throttling import UserRateThrottle


class AssistantMessageRateThrottle(UserRateThrottle):
    scope = "ai_message"

    def get_rate(self):
        return getattr(settings, "AUTH_AI_MESSAGE_THROTTLE_RATE", "20/min")
