from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock

import pytest
from django.utils import timezone
from rest_framework import status
from smartpay.payments.models import Payment
from smartpay.payments.providers.base import DecodedInvoice, LookupResult, NodeInfo
from smartpay.payments.providers.errors import LndInvoiceError, LndUnavailable
from smartpay.payments.providers.factory import get_payment_provider
from smartpay.payments.providers.lnd_client import payment_hash_to_hex
from smartpay.payments.providers.lnd_regtest import LndRegtestPaymentProvider, SELF_PAY_WARNING
from smartpay.payments.providers.mock import MockPaymentProvider
from smartpay.payments.reconciliation import reconcile_payment
from smartpay.payments.services import create_outgoing_payment


def _provider_with_client(client) -> LndRegtestPaymentProvider:
    return LndRegtestPaymentProvider(client=client)


def test_factory_returns_lnd(settings):
    settings.PAYMENT_PROVIDER = "lnd_regtest"
    provider = get_payment_provider()
    assert isinstance(provider, LndRegtestPaymentProvider)


def test_payment_hash_hex_from_base64():
    raw = bytes.fromhex("ab" * 32)
    import base64

    encoded = base64.b64encode(raw).decode()
    assert payment_hash_to_hex(encoded) == ("ab" * 32)


def test_lnd_connection_error():
    client = MagicMock()
    client.getinfo.side_effect = LndUnavailable("Nœud LND injoignable.")
    provider = _provider_with_client(client)
    info = provider.get_node_info()
    assert info.connected is False


def test_lnd_create_invoice_regtest_prefix():
    client = MagicMock()
    client.add_invoice.return_value = {
        "payment_request": "lnbcrt1fakeinvoice",
        "r_hash": "aa" * 32,
    }
    provider = _provider_with_client(client)
    draft = provider.create_invoice(amount_sats=1000, memo="test", expiry_seconds=600)
    assert draft.is_mock is False
    assert draft.settlement_mode == "lightning_regtest"
    assert draft.is_lightning_settled is False
    assert draft.encoded_invoice.startswith("lnbcrt")


def test_lnd_rejects_non_regtest_invoice_prefix():
    client = MagicMock()
    client.add_invoice.return_value = {
        "payment_request": "lnbc1mainnet",
        "r_hash": "aa" * 32,
    }
    provider = _provider_with_client(client)
    with pytest.raises(LndInvoiceError, match="Regtest"):
        provider.create_invoice(amount_sats=1000, memo="x", expiry_seconds=600)


def test_expired_bolt11_is_rejected():
    client = MagicMock()
    past = int((timezone.now() - timedelta(hours=2)).timestamp())
    client.decode_pay_req.return_value = {
        "num_satoshis": "1500",
        "payment_hash": "bb" * 32,
        "description": "expirée",
        "expiry": "60",
        "timestamp": str(past),
        "destination": "02" + "ab" * 32,
    }
    provider = _provider_with_client(client)
    with pytest.raises(LndInvoiceError, match="expir"):
        provider.decode_invoice("lnbcrt1expired")


def test_preview_warns_on_alice_self_invoice():
    local = "02" + "aa" * 32
    client = MagicMock()
    client.decode_pay_req.return_value = {
        "num_satoshis": "5000",
        "payment_hash": "cc" * 32,
        "description": "self",
        "expiry": "3600",
        "timestamp": str(int(timezone.now().timestamp())),
        "destination": local,
    }
    client.estimate_route_fee.return_value = {"unavailable": True}
    client.getinfo.return_value = {"identity_pubkey": local, "alias": "alice", "synced_to_chain": True}
    provider = _provider_with_client(client)
    preview = provider.preview(amount_sats=5000, encoded_invoice="lnbcrt1self")
    assert preview.is_lightning_settled is False
    assert SELF_PAY_WARNING in preview.warnings


@pytest.mark.django_db
def test_http_200_is_not_settlement(user, settings):
    settings.PAYMENT_PROVIDER = "lnd_regtest"
    payment = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.PENDING,
        settlement_mode=Payment.SettlementMode.LIGHTNING_REGTEST,
        provider_reference="cc" * 32,
    )
    fake = MagicMock()
    fake.name = "lnd_regtest"
    fake.lookup_payment.return_value = LookupResult(found=True, settled=False, status="IN_FLIGHT")
    from smartpay.payments import reconciliation

    original = reconciliation.get_payment_provider
    reconciliation.get_payment_provider = lambda: fake
    try:
        updated = reconcile_payment(payment)
    finally:
        reconciliation.get_payment_provider = original
    assert updated.status == Payment.Status.PENDING
    assert updated.is_lightning_settled is False


@pytest.mark.django_db
def test_lookup_settled_marks_lightning(user, settings):
    settings.PAYMENT_PROVIDER = "lnd_regtest"
    payment = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.PENDING,
        settlement_mode=Payment.SettlementMode.LIGHTNING_REGTEST,
        provider_reference="dd" * 32,
    )
    fake = MagicMock()
    fake.name = "lnd_regtest"
    fake.lookup_payment.return_value = LookupResult(found=True, settled=True, status="SUCCEEDED")
    fake.lookup_invoice.return_value = LookupResult(found=False, settled=False, status="unknown")
    from smartpay.payments import reconciliation

    monkey_provider = fake
    original = reconciliation.get_payment_provider
    reconciliation.get_payment_provider = lambda: monkey_provider
    try:
        updated = reconcile_payment(payment)
    finally:
        reconciliation.get_payment_provider = original
    assert updated.is_lightning_settled is True
    assert updated.status == Payment.Status.CONFIRMED


@pytest.mark.django_db
def test_expired_pending_invoice_is_expired(user):
    payment = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.INCOMING,
        status=Payment.Status.PENDING,
        settlement_mode=Payment.SettlementMode.MOCK,
        expires_at=timezone.now() - timedelta(minutes=1),
    )
    updated = reconcile_payment(payment)
    assert updated.status == Payment.Status.EXPIRED
    assert updated.is_lightning_settled is False


@pytest.mark.django_db
def test_lnd_idempotence_does_not_double_send(user, settings):
    settings.PAYMENT_PROVIDER = "lnd_regtest"
    client = MagicMock()
    decoded = DecodedInvoice(
        payment_hash="ee" * 32,
        amount_sats=1200,
        description="idem",
        expiry_seconds=3600,
        destination="02abc",
        encoded_invoice="lnbcrt1abc",
    )
    fake = MagicMock()
    fake.name = "lnd_regtest"
    fake.settlement_mode = "lightning_regtest"
    fake.decode_invoice.return_value = decoded
    fake.send_payment.return_value = "ee" * 32
    fake.lookup_payment.return_value = LookupResult(found=True, settled=False, status="IN_FLIGHT")
    from smartpay.payments import services

    original = services.get_payment_provider
    from smartpay.payments import reconciliation

    original_rec = reconciliation.get_payment_provider
    services.get_payment_provider = lambda: fake
    reconciliation.get_payment_provider = lambda: fake
    try:
        first, created = create_outgoing_payment(
            user=user,
            amount_sats=1200,
            idempotency_key="same-key",
            encoded_invoice="lnbcrt1abc",
        )
        second, created_again = create_outgoing_payment(
            user=user,
            amount_sats=1200,
            idempotency_key="same-key",
            encoded_invoice="lnbcrt1abc",
        )
    finally:
        services.get_payment_provider = original
        reconciliation.get_payment_provider = original_rec
    assert created is True
    assert created_again is False
    assert first.id == second.id
    assert fake.send_payment.call_count == 1


@pytest.mark.django_db
def test_lnd_unavailable_on_pay(auth_client, settings, monkeypatch):
    settings.PAYMENT_PROVIDER = "lnd_regtest"
    fake = MagicMock()
    fake.name = "lnd_regtest"
    fake.settlement_mode = "lightning_regtest"
    fake.decode_invoice.side_effect = LndUnavailable("Nœud LND injoignable.")
    monkeypatch.setattr("smartpay.payments.services.get_payment_provider", lambda: fake)
    response = auth_client.post(
        "/api/v1/payments/",
        {"amount_sats": 1000, "encoded_invoice": "lnbcrt1x", "idempotency_key": "k-lnd"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_mock_still_separated_from_lnd():
    mock = MockPaymentProvider()
    preview = mock.preview(amount_sats=10)
    assert preview.settlement_mode == "mock"
    assert preview.is_lightning_settled is False
    with pytest.raises(Exception):
        mock.send_payment(encoded_invoice="lnbcrt1x", timeout_seconds=5)


@pytest.mark.django_db
def test_self_payment_alice_to_alice_is_rejected(user, settings):
    settings.PAYMENT_PROVIDER = "lnd_regtest"
    local = "02" + "aa" * 32
    fake = MagicMock()
    fake.name = "lnd_regtest"
    fake.settlement_mode = "lightning_regtest"
    fake.decode_invoice.return_value = DecodedInvoice(
        payment_hash="ff" * 32,
        amount_sats=2500,
        description="self",
        expiry_seconds=3600,
        destination=local,
        encoded_invoice="lnbcrt1self",
    )
    fake.get_node_info.return_value = NodeInfo(connected=True, pubkey=local, alias="alice")
    from smartpay.payments import services

    original = services.get_payment_provider
    services.get_payment_provider = lambda: fake
    try:
        with pytest.raises(Exception, match="Alice"):
            create_outgoing_payment(
                user=user,
                amount_sats=2500,
                idempotency_key="self-pay",
                encoded_invoice="lnbcrt1self",
            )
    finally:
        services.get_payment_provider = original
    assert Payment.objects.count() == 0
    fake.send_payment.assert_not_called()
