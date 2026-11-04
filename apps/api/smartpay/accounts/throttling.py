"""Limitations dédiées à l'inscription, la connexion et la déconnexion publiques."""

from django.conf import settings
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Quota de connexion par REMOTE_ADDR uniquement.

    X-Forwarded-For n'est pas lu : aucun proxy de confiance n'est configuré.
    Derrière Docker publish, plusieurs clients LAN peuvent partager la même
    adresse source (pont/NAT). Ce n'est pas une identité client fiable.
    """

    scope = "login"

    def get_rate(self):
        return getattr(settings, "AUTH_LOGIN_THROTTLE_RATE", "10/min")

    def get_ident(self, request):
        return request.META.get("REMOTE_ADDR") or "unknown"


class LogoutRateThrottle(AnonRateThrottle):
    """Quota de déconnexion par REMOTE_ADDR uniquement.

    Distinct du login : un client qui se déconnecte ne consomme pas
    AUTH_LOGIN_THROTTLE. X-Forwarded-For n'est pas lu.
    """

    scope = "logout"

    def get_rate(self):
        return getattr(settings, "AUTH_LOGOUT_THROTTLE_RATE", "20/min")

    def get_ident(self, request):
        return request.META.get("REMOTE_ADDR") or "unknown"


class RegisterRateThrottle(AnonRateThrottle):
    """Quota d'inscription par adresse IP source.

    Le débit est lu à chaque requête depuis AUTH_REGISTER_THROTTLE_RATE
    (défaut 5/heure) afin de rester configurable sans redémarrer les classes DRF.
    """

    scope = "register"

    def get_rate(self):
        return getattr(settings, "AUTH_REGISTER_THROTTLE_RATE", "5/hour")
