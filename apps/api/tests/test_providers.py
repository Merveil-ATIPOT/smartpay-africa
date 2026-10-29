import pytest

from smartpay.payments.providers.factory import get_payment_provider
from smartpay.payments.providers.lnd_regtest import LndRegtestPaymentProvider
from smartpay.payments.providers.mock import MockPaymentProvider


def test_factory_returns_mock(settings):
    settings.PAYMENT_PROVIDER = "mock"
    provider = get_payment_provider()
    assert isinstance(provider, MockPaymentProvider)


def test_mock_invoice_is_clearly_not_lightning():
    draft = MockPaymentProvider().create_invoice(amount_sats=1500, memo="café", expiry_seconds=600)
    assert draft.encoded_invoice.startswith("mockln1")
    assert draft.payment_hash.startswith("mockhash_")
    assert draft.is_lightning_settled is False
    assert draft.is_mock is True
    assert draft.settlement_mode == "mock"


def test_mock_preview_warns():
    preview = MockPaymentProvider().preview(amount_sats=1500)
    assert preview.fee_sats == 0
    assert preview.is_lightning_settled is False
    assert any("Lightning" in warning for warning in preview.warnings)


def test_lnd_regtest_is_not_implemented():
    provider = LndRegtestPaymentProvider()
    with pytest.raises(NotImplementedError, match="P01"):
        provider.create_invoice(amount_sats=1, memo="", expiry_seconds=60)
    with pytest.raises(NotImplementedError, match="P01"):
        provider.preview(amount_sats=1)
