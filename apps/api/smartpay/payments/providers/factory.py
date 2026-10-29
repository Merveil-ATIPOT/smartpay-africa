from pathlib import Path

from django.conf import settings

from smartpay.payments.providers.lnd_client import LndRestClient
from smartpay.payments.providers.lnd_regtest import LndRegtestPaymentProvider
from smartpay.payments.providers.mock import MockPaymentProvider


def get_payment_provider():
    name = getattr(settings, "PAYMENT_PROVIDER", "mock")
    if name == "mock":
        return MockPaymentProvider()
    if name == "lnd_regtest":
        return LndRegtestPaymentProvider()
    raise ValueError(f"Fournisseur de paiement inconnu: {name}")


def lab_counterparty_configured() -> bool:
    url = getattr(settings, "LND_BOB_REST_URL", "") or ""
    macaroon = getattr(settings, "LND_BOB_MACAROON_PATH", "") or ""
    cert = getattr(settings, "LND_BOB_TLS_CERT_PATH", "") or ""
    return bool(url and Path(macaroon).is_file() and Path(cert).is_file())


def get_lab_counterparty_provider() -> LndRegtestPaymentProvider | None:
    """Nœud Bob — jamais utilisé comme portefeuille de l'utilisateur."""
    if not getattr(settings, "LAB_COUNTERPARTY_ENABLED", False):
        return None
    if not lab_counterparty_configured():
        return None
    return LndRegtestPaymentProvider(
        client=LndRestClient(
            rest_url=settings.LND_BOB_REST_URL,
            macaroon_path=settings.LND_BOB_MACAROON_PATH,
            tls_cert_path=settings.LND_BOB_TLS_CERT_PATH,
            timeout_seconds=float(getattr(settings, "LND_TIMEOUT_SECONDS", 30)),
        )
    )
