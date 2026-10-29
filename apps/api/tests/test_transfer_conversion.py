import pytest

from smartpay.transfers.conversion import (
    QuoteError,
    build_quote,
    fcfa_to_sats,
    sats_to_fcfa,
)


def test_reference_amount_50000_fcfa():
    assert fcfa_to_sats(50_000) == 115_473
    quote = build_quote(50_000, "XOF")
    assert quote.amount_sats == 115_473
    assert quote.fee_sats == 1
    assert quote.total_sats == 115_474
    assert quote.is_fictional_rate is True
    assert quote.is_lnd_fee_estimate is False


def test_xaf_uses_same_demo_rate():
    xof = build_quote(50_000, "XOF")
    xaf = build_quote(50_000, "XAF")
    assert xof.amount_sats == xaf.amount_sats
    assert xof.total_sats == xaf.total_sats


def test_half_up_integer_rounding():
    assert fcfa_to_sats(1) == 2
    assert isinstance(fcfa_to_sats(50_000), int)
    assert sats_to_fcfa(115_473) >= 49_999


def test_rejects_null_and_negative_amounts():
    with pytest.raises(QuoteError):
        build_quote(0, "XOF")
    with pytest.raises(QuoteError):
        fcfa_to_sats(-1)
    with pytest.raises(QuoteError):
        build_quote(-10, "XOF")


def test_rejects_excessive_and_non_fcfa_currency():
    with pytest.raises(QuoteError, match="plafond"):
        build_quote(50_000_001, "XOF")
    with pytest.raises(QuoteError, match="Devise"):
        build_quote(50_000, "EUR")
