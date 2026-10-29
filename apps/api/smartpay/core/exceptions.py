from __future__ import annotations

from rest_framework.views import exception_handler


def smartpay_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None
    detail = response.data
    payload = {
        "error": True,
        "status_code": response.status_code,
        "detail": detail,
    }
    response.data = payload
    return response


class DomainError(Exception):
    """Erreur métier contrôlée."""
