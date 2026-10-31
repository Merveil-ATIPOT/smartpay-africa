from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status

from smartpay.audit.directory import sanitize_metadata
from smartpay.audit.models import AuditLog
from smartpay.payments.models import Payment
from smartpay.wallets.models import WalletConnection

User = get_user_model()

URL = "/api/v1/admin/audit/"

ALLOWED_KEYS = {
    "id",
    "created_at",
    "action",
    "resource_type",
    "resource_id",
    "actor",
    "category",
    "severity",
    "metadata_safe",
}

FORBIDDEN_TOKENS = (
    "ip_address",
    "encoded_invoice",
    "macaroon",
    "password",
    "jwt",
    "/run/lnd",
    "lnbcrt",
)


@pytest.fixture
def merchant_user(db):
    return User.objects.create_user(
        email="shop-audit@smartpay.test",
        password="test-pass-123",
        role=User.Role.MERCHANT,
        country=User.Country.SN,
    )


def _record(*, actor=None, action="payment.created", resource_type="payment", resource_id="pay-1", metadata=None):
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata or {"amount_sats": 1000, "settlement_mode": "lightning_regtest"},
        ip_address="192.168.1.45",
    )


def test_requires_auth(api_client):
    assert api_client.get(URL).status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_rejects_non_admin(api_client, user, other_user, merchant_user):
    for account in (user, other_user, merchant_user):
        api_client.force_authenticate(user=account)
        assert api_client.get(URL).status_code == status.HTTP_403_FORBIDDEN, account.role


@pytest.mark.django_db
def test_admin_list_whitelist_hides_secrets_and_ip(admin_client, user, monkeypatch):
    monkeypatch.setattr(
        "smartpay.payments.reconciliation.reconcile_payment",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("reconcile interdit")),
    )
    monkeypatch.setattr(
        "smartpay.payments.providers.lnd_client.LndRestClient.getinfo",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("LND interdit")),
    )
    _record(
        actor=user,
        metadata={
            "amount_sats": 2500,
            "settlement_mode": "lightning_regtest",
            "encoded_invoice": "lnbcrt2500n1secret",
            "password": "nope",
            "nested": {"seed": "abc"},
            "phone": "+221770000000",
        },
    )
    _record(actor=None, action="payment.lightning_settled", resource_id="pay-2", metadata={"status": "SETTLED"})
    before = (
        AuditLog.objects.count(),
        Payment.objects.count(),
        WalletConnection.objects.count(),
    )
    response = admin_client.get(URL)
    assert response.status_code == status.HTTP_200_OK
    assert "no-store" in response["Cache-Control"]
    body = response.data
    assert body["count"] == 2
    assert body["summary"]["total"] == 2
    assert body["summary"]["payment"] == 2
    assert body["summary"]["transfer"] == 0
    blob = str(body).lower()
    for token in FORBIDDEN_TOKENS:
        assert token not in blob
    assert "192.168.1.45" not in str(body)
    assert "lnbcrt" not in blob
    first = body["results"][0]
    assert set(first.keys()) == ALLOWED_KEYS
    assert "ip_address" not in first
    assert "metadata" not in first
    settled = next(item for item in body["results"] if item["action"] == "payment.lightning_settled")
    assert settled["actor"] is None
    created = next(item for item in body["results"] if item["action"] == "payment.created")
    assert created["actor"] == {"id": user.id, "email": user.email}
    assert created["category"] == "payment"
    assert created["severity"]["key"] == "info"
    assert created["metadata_safe"] == {"amount_sats": 2500, "settlement_mode": "lightning_regtest"}
    assert (
        AuditLog.objects.count(),
        Payment.objects.count(),
        WalletConnection.objects.count(),
    ) == before


@pytest.mark.django_db
def test_mutations_not_allowed(admin_client):
    assert admin_client.post(URL, {}, format="json").status_code == 405
    assert admin_client.patch(URL, {}, format="json").status_code == 405
    assert admin_client.put(URL, {}, format="json").status_code == 405
    assert admin_client.delete(URL).status_code == 405


@pytest.mark.django_db
def test_pagination_order_and_filters(admin_client, user):
    older = _record(actor=user, action="transfer.created", resource_type="transfer", resource_id="tr-old")
    newer = _record(actor=user, action="transfer.validation_failed", resource_type="transfer", resource_id="tr-new")
    AuditLog.objects.filter(pk=older.pk).update(created_at=timezone.now() - timedelta(days=2))
    older.refresh_from_db()

    page = admin_client.get(URL, {"page_size": 1})
    assert page.status_code == status.HTTP_200_OK
    assert page.data["count"] == 2
    assert page.data["results"][0]["id"] == newer.id
    assert page.data["results"][0]["severity"]["key"] == "warning"

    by_action = admin_client.get(URL, {"action": "transfer.created"})
    assert by_action.data["count"] == 1
    assert by_action.data["results"][0]["id"] == older.id

    by_type = admin_client.get(URL, {"resource_type": "transfer"})
    assert by_type.data["count"] == 2

    by_resource = admin_client.get(URL, {"resource_id": "tr-new"})
    assert by_resource.data["count"] == 1

    by_actor = admin_client.get(URL, {"actor": str(user.id)})
    assert by_actor.data["count"] == 2

    empty_actor = admin_client.get(URL, {"actor": "99999"})
    assert empty_actor.data["count"] == 0

    after = admin_client.get(URL, {"created_after": (timezone.now() - timedelta(days=1)).isoformat()})
    assert after.data["count"] == 1
    assert after.data["results"][0]["id"] == newer.id


@pytest.mark.django_db
def test_invalid_filters_are_rejected(admin_client):
    assert admin_client.get(URL, {"actor": "abc"}).status_code == 400
    assert admin_client.get(URL, {"resource_type": "wallet"}).status_code == 400
    assert admin_client.get(URL, {"action": "DROP TABLE"}).status_code == 400
    assert admin_client.get(URL, {"created_after": "hier"}).status_code == 400
    inverted = admin_client.get(
        URL,
        {"created_after": "2026-10-31T00:00:00Z", "created_before": "2026-10-01T00:00:00Z"},
    )
    assert inverted.status_code == 400


def test_sanitize_metadata_drops_secrets_and_nested():
    assert sanitize_metadata(
        {
            "amount_sats": 2500,
            "is_lightning_settled": True,
            "encoded_invoice": "lnbcrt2500n1secret",
            "nested": {"seed": "abc"},
            "reason": "montant trop élevé",
            "phone": "+221770000000",
        }
    ) == {"amount_sats": 2500, "is_lightning_settled": True, "reason": "montant trop élevé"}


@pytest.mark.django_db
def test_unknown_action_is_unclassified(admin_client):
    _record(action="mystery.event", resource_type="other", resource_id="x")
    body = admin_client.get(URL).data["results"][0]
    assert body["category"] == "other"
    assert body["severity"]["key"] == "unclassified"
    assert "menace" not in body["severity"]["label"].lower()
