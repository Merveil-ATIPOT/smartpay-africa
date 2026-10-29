from django.conf import settings

from smartpay.payments.providers.lnd_regtest import LndRegtestPaymentProvider
from smartpay.payments.providers.mock import MockPaymentProvider


def get_payment_provider():
    name = getattr(settings, "PAYMENT_PROVIDER", "mock")
    if name == "mock":
        return MockPaymentProvider()
    if name == "lnd_regtest":
        return LndRegtestPaymentProvider()
    raise ValueError(f"Fournisseur de paiement inconnu: {name}")
