from unittest.mock import MagicMock

import pytest
from rest_framework import status

from smartpay.payments.models import Payment
from smartpay.payments.providers.base import DecodedInvoice, LookupResult, NodeInfo
from smartpay.payments.services import PaymentHashConflict, create_outgoing_payment


def _lnd_fake(*, payment_hash: str, destination: str = "02bob"):
    fake = MagicMock()
    fake.name = "lnd_regtest"
    fake.settlement_mode = "lightning_regtest"
    fake.decode_invoice.return_value = DecodedInvoice(
        payment_hash=payment_hash,
        amount_sats=1200,
        description="lab",
        expiry_seconds=3600,
        destination=destination,
        encoded_invoice="lnbcrt1sec",
    )
    fake.get_node_info.return_value = NodeInfo(connected=True, pubkey="02alice", alias="alice")
    fake.send_payment.return_value = payment_hash
    fake.lookup_payment.return_value = LookupResult(found=True, settled=False, status="IN_FLIGHT")
    return fake


@pytest.mark.django_db
def test_create_payment_requires_explicit_confirm(auth_client, monkeypatch):
    fake = MagicMock()
    fake.send_payment = MagicMock()
    monkeypatch.setattr("smartpay.payments.services.get_payment_provider", lambda: fake)
    monkeypatch.setattr("smartpay.payments.views.get_payment_provider", lambda: fake)

    missing = auth_client.post(
        "/api/v1/payments/",
        {"amount_sats": 900, "idempotency_key": "no-confirm"},
        format="json",
    )
    assert missing.status_code == status.HTTP_400_BAD_REQUEST
    assert "confirm" in str(missing.data).lower()

    denied = auth_client.post(
        "/api/v1/payments/",
        {"amount_sats": 900, "idempotency_key": "confirm-false", "confirm": False},
        format="json",
    )
    assert denied.status_code == status.HTTP_400_BAD_REQUEST
    assert "confirm" in str(denied.data).lower()

    invalid = auth_client.post(
        "/api/v1/payments/",
        {"amount_sats": 900, "idempotency_key": "confirm-bad", "confirm": "oui"},
        format="json",
    )
    assert invalid.status_code == status.HTTP_400_BAD_REQUEST

    assert Payment.objects.count() == 0
    fake.send_payment.assert_not_called()


@pytest.mark.django_db
def test_create_payment_accepts_confirm_true(auth_client):
    created = auth_client.post(
        "/api/v1/payments/",
        {"amount_sats": 900, "idempotency_key": "confirm-true", "confirm": True},
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED
    assert created.data["amount_sats"] == 900
    assert Payment.objects.filter(idempotency_key="confirm-true").count() == 1


@pytest.mark.django_db
def test_payment_hash_is_isolated_between_users(user, other_user, settings):
    settings.PAYMENT_PROVIDER = "lnd_regtest"
    payment_hash = "ab" * 32
    fake = _lnd_fake(payment_hash=payment_hash)
    from smartpay.payments import reconciliation, services

    original = services.get_payment_provider
    original_rec = reconciliation.get_payment_provider
    services.get_payment_provider = lambda: fake
    reconciliation.get_payment_provider = lambda: fake
    try:
        first, created = create_outgoing_payment(
            user=user,
            amount_sats=1200,
            idempotency_key="owner-key",
            encoded_invoice="lnbcrt1sec",
        )
        assert created is True
        replay, created_again = create_outgoing_payment(
            user=user,
            amount_sats=1200,
            idempotency_key="owner-key",
            encoded_invoice="lnbcrt1sec",
        )
        assert created_again is False
        assert replay.id == first.id

        same_hash, same_owner_created = create_outgoing_payment(
            user=user,
            amount_sats=1200,
            idempotency_key="owner-other-key",
            encoded_invoice="lnbcrt1sec",
        )
        assert same_owner_created is False
        assert same_hash.id == first.id

        with pytest.raises(PaymentHashConflict):
            create_outgoing_payment(
                user=other_user,
                amount_sats=1200,
                idempotency_key="intruder",
                encoded_invoice="lnbcrt1sec",
            )
    finally:
        services.get_payment_provider = original
        reconciliation.get_payment_provider = original_rec

    assert Payment.objects.filter(owner=user).count() == 1
    assert Payment.objects.filter(owner=other_user).count() == 0
    assert fake.send_payment.call_count == 1


@pytest.mark.django_db
def test_foreign_payment_hash_is_rejected_on_http(auth_client, user, other_user, api_client, settings):
    settings.PAYMENT_PROVIDER = "lnd_regtest"
    payment_hash = "cd" * 32
    fake = _lnd_fake(payment_hash=payment_hash)
    from smartpay.payments import reconciliation, services

    original = services.get_payment_provider
    original_rec = reconciliation.get_payment_provider
    services.get_payment_provider = lambda: fake
    reconciliation.get_payment_provider = lambda: fake
    try:
        owned, _ = create_outgoing_payment(
            user=user,
            amount_sats=1200,
            idempotency_key="http-owner",
            encoded_invoice="lnbcrt1sec",
        )
        api_client.force_authenticate(user=other_user)
        response = api_client.post(
            "/api/v1/payments/",
            {
                "amount_sats": 1200,
                "encoded_invoice": "lnbcrt1sec",
                "idempotency_key": "http-intruder",
                "confirm": True,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_409_CONFLICT
        api_client.force_authenticate(user=user)
        detail = api_client.get(f"/api/v1/payments/{owned.id}/")
        assert detail.status_code == status.HTTP_200_OK
        api_client.force_authenticate(user=other_user)
        hidden = api_client.get(f"/api/v1/payments/{owned.id}/")
        assert hidden.status_code == status.HTTP_403_FORBIDDEN
    finally:
        services.get_payment_provider = original
        reconciliation.get_payment_provider = original_rec

    assert Payment.objects.filter(pk=owned.id, owner=user).exists()
    assert Payment.objects.filter(owner=other_user).count() == 0
