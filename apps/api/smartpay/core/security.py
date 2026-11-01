"""Contrôles de configuration. Ne loggent jamais la valeur d'un secret."""

from __future__ import annotations

from django.core.exceptions import ImproperlyConfigured

_INSECURE_NEEDLES = (
    "insecure-dev-placeholder",
    "change-me",
    "changeme",
    "test-secret-key-not-for-production",
    "not-for-production",
)


def _looks_insecure(value: str) -> bool:
    lowered = (value or "").strip().lower()
    if not lowered:
        return True
    return any(needle in lowered for needle in _INSECURE_NEEDLES)


def assert_hardened_settings(
    *,
    debug: bool,
    secret_key: str,
    jwt_key: str,
    allowed_hosts: list[str],
) -> None:
    """Refuse les placeholders hors développement. N'affiche pas les secrets."""
    if debug:
        return
    if _looks_insecure(secret_key):
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY est absent ou ressemble à un placeholder. "
            "Un environnement non-développement exige une clé locale dédiée."
        )
    if _looks_insecure(jwt_key):
        raise ImproperlyConfigured(
            "JWT_SIGNING_KEY est absent ou ressemble à un placeholder. "
            "Un environnement non-développement exige une clé JWT dédiée."
        )
    hosts = [item.strip() for item in allowed_hosts if item and item.strip()]
    if not hosts or "*" in hosts:
        raise ImproperlyConfigured(
            "ALLOWED_HOSTS doit être une liste explicite hors développement."
        )
