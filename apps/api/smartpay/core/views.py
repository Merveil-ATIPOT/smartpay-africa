from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.utils import timezone
from django.views import View
from rest_framework.permissions import AllowAny

from smartpay.payments.providers import get_payment_provider, lab_counterparty_configured
from smartpay.payments.providers.errors import LndUnavailable


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

        provider_name = getattr(settings, "PAYMENT_PROVIDER", "mock")
        lightning = "not_connected"
        try:
            info = get_payment_provider().get_node_info()
            if info.connected:
                lightning = "regtest"
        except LndUnavailable:
            lightning = "not_connected"
        except Exception:
            lightning = "not_connected"

        status = "ok" if database_ok else "degraded"
        http_status = 200 if database_ok else 503
        warnings = [
            "Aucune conversion FCFA réelle. Aucun dépôt Wave / Orange Money / MTN.",
            "Réseau Bitcoin Regtest uniquement. Pas de Mainnet.",
        ]
        if provider_name == "mock":
            warnings.insert(0, "Fournisseur Mock : aucun règlement Lightning.")
        elif lightning != "regtest":
            warnings.insert(0, "LND Regtest configuré mais nœud injoignable.")
        return JsonResponse(
            {
                "status": status,
                "service": "smartpay-api",
                "version": "0.4.0",
                "network": getattr(settings, "BITCOIN_NETWORK", "regtest"),
                "payment_provider": provider_name,
                "lightning": lightning,
                "lab_counterparty": lab_counterparty_configured()
                and bool(getattr(settings, "LAB_COUNTERPARTY_ENABLED", False)),
                "database": "up" if database_ok else "down",
                "checked_at": timezone.now().isoformat(),
                "warnings": warnings,
            },
            status=http_status,
        )
