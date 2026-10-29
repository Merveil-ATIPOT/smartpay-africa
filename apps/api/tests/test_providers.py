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


def test_mock_preview_rejects_bolt11():
    with pytest.raises(Exception, match="BOLT11"):
        MockPaymentProvider().preview(amount_sats=1500, encoded_invoice="lnbcrt1ppreview")


def test_mock_preview_requires_amount_without_invoice_amount():
    with pytest.raises(Exception, match="Montant"):
        MockPaymentProvider().preview(amount_sats=0, encoded_invoice="mockln1abc")


def test_lnd_regtest_is_disconnected_without_config():
    provider = LndRegtestPaymentProvider()
    info = provider.get_node_info()
    assert info.connected is False
