"""Limitation dédiée à l'inscription publique."""

from django.conf import settings
from rest_framework.throttling import AnonRateThrottle


class RegisterRateThrottle(AnonRateThrottle):
    """Quota d'inscription par adresse IP source.

    Le débit est lu à chaque requête depuis AUTH_REGISTER_THROTTLE_RATE
    (défaut 5/heure) afin de rester configurable sans redémarrer les classes DRF.
    """

    scope = "register"

    def get_rate(self):
        return getattr(settings, "AUTH_REGISTER_THROTTLE_RATE", "5/hour")
