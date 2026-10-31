"""Limitation des soumissions de quiz par utilisateur authentifié."""

from django.conf import settings
from rest_framework.throttling import UserRateThrottle


class AcademyQuizAttemptRateThrottle(UserRateThrottle):
    scope = "academy_quiz"

    def get_rate(self):
        return getattr(settings, "AUTH_ACADEMY_QUIZ_THROTTLE_RATE", "20/min")
