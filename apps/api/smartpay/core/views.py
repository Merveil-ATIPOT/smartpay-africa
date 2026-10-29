from django.db import connection
from django.http import JsonResponse
from django.utils import timezone
from django.views import View
from rest_framework.permissions import AllowAny


class HealthView(View):
    """Santé publique de l'API. N'expose aucun secret."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request, *args, **kwargs):
        database_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            database_ok = True
        except Exception:
            database_ok = False

        status = "ok" if database_ok else "degraded"
        http_status = 200 if database_ok else 503
        return JsonResponse(
            {
                "status": status,
                "service": "smartpay-api",
                "version": "0.1.0",
                "network": "regtest",
                "payment_provider": "mock",
                "lightning": "not_connected",
                "database": "up" if database_ok else "down",
                "checked_at": timezone.now().isoformat(),
                "warnings": [
                    "P01: fournisseur Mock uniquement. Aucun règlement Lightning.",
                    "Aucune conversion FCFA réelle. Aucun dépôt Wave / Orange Money / MTN.",
                ],
            },
            status=http_status,
        )
