from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from smartpay.audit.models import AuditLog
from smartpay.payments.models import Payment
from smartpay.transfers.models import Transfer
from smartpay.transfers.state import DRAFT, QUOTED, READY


def _create(auth_client, key="draft-1", extra=None):
    payload = {
        "destination_country": "CI",
        "operator": "wave",
        "beneficiary_name": "Awa Koné",
        "phone_number": "07458912",
        "reason": "Soutien familial",
        "amount_local": 50_000,
    }
    if extra:
        payload.update(extra)
    return auth_client.post(
        "/api/v1/transfers/",
        payload,
        format="json",
        HTTP_IDEMPOTENCY_KEY=key,
    )


@pytest.mark.django_db
def test_catalog_and_operators(auth_client):
    listed = auth_client.get("/api/v1/transfers/destinations/")
    assert listed.status_code == status.HTTP_200_OK
    assert listed.data["count"] == 7
    assert "simul" in listed.data["disclaimer"].lower()
    france = next(item for item in listed.data["results"] if item["code"] == "FR")
    assert france["available"] is False
    ops = auth_client.get("/api/v1/transfers/destinations/SN/operators/")
    assert ops.status_code == status.HTTP_200_OK
    assert {item["id"] for item in ops.data["operators"]} == {"wave", "orange", "free"}
    fr_ops = auth_client.get("/api/v1/transfers/destinations/FR/operators/")
    assert fr_ops.data["available"] is False
    assert fr_ops.data["operators"] == []


@pytest.mark.django_db
def test_standalone_quote_is_server_computed(auth_client):
    response = auth_client.post(
        "/api/v1/transfers/quotes/",
        {"amount_local": 50_000, "destination_country": "CI", "amount_sats": 1},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.data["amount_sats"] == 115_473
    assert response.data["total_sats"] == 115_474
    assert response.data["is_fictional_rate"] is True
    assert response.data["is_lnd_fee_estimate"] is False
    assert Payment.objects.count() == 0


@pytest.mark.django_db
def test_france_quote_rejected(auth_client):
    response = auth_client.post(
        "/api/v1/transfers/quotes/",
        {"amount_local": 50_000, "destination_country": "FR"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_create_draft_quote_ready_flow(auth_client, user):
    created = _create(auth_client, key="flow-1")
    assert created.status_code == status.HTTP_201_CREATED
    assert created.data["status"] == DRAFT
    assert created.data["source_country"] == "SN"
    transfer_id = created.data["id"]
    quoted = auth_client.post(f"/api/v1/transfers/{transfer_id}/quote/", {}, format="json")
    assert quoted.status_code == status.HTTP_200_OK
    assert quoted.data["status"] == QUOTED
    assert quoted.data["amount_sats"] == 115_473
    assert quoted.data["total_sats"] == 115_474
    ready = auth_client.post(
        f"/api/v1/transfers/{transfer_id}/ready/",
        {},
        format="json",
        HTTP_IDEMPOTENCY_KEY="ready-1",
    )
    assert ready.status_code == status.HTTP_200_OK
    assert ready.data["status"] == READY
    detail = auth_client.get(f"/api/v1/transfers/{transfer_id}/")
    assert detail.data["beneficiary_name"] == "Awa Koné"
    assert detail.data["phone_number"] == "+22507458912"
    assert detail.data["amount_sats"] == 115_473
    st = auth_client.get(f"/api/v1/transfers/{transfer_id}/status/")
    assert st.data["status"] == READY
    assert AuditLog.objects.filter(action="transfer.created", resource_id=transfer_id).exists()
    assert AuditLog.objects.filter(action="transfer.quoted").exists()
    assert AuditLog.objects.filter(action="transfer.quote_validated").exists()
    for log in AuditLog.objects.filter(resource_id=transfer_id):
        assert "07458912" not in str(log.metadata)
        assert "phone" not in log.metadata


@pytest.mark.django_db
def test_create_requires_idempotency(auth_client):
    missing = auth_client.post("/api/v1/transfers/", {"destination_country": "SN"}, format="json")
    assert missing.status_code == status.HTTP_400_BAD_REQUEST
    first = _create(auth_client, key="idem-1")
    second = _create(auth_client, key="idem-1")
    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_200_OK
    assert first.data["id"] == second.data["id"]
    assert Transfer.objects.filter(idempotency_key="idem-1").count() == 1


@pytest.mark.django_db
def test_isolation_between_users(auth_client, api_client, other_user):
    created = _create(auth_client, key="iso-1")
    transfer_id = created.data["id"]
    api_client.force_authenticate(user=other_user)
    response = api_client.get(f"/api/v1/transfers/{transfer_id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    listed = api_client.get("/api/v1/transfers/")
    assert listed.data["count"] == 0


@pytest.mark.django_db
def test_admin_can_read_other_transfer(admin_client, auth_client):
    created = _create(auth_client, key="admin-1")
    response = admin_client.get(f"/api/v1/transfers/{created.data['id']}/")
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_patch_destination_resets_incompatible_operator(auth_client):
    created = _create(auth_client, key="reset-1")
    transfer_id = created.data["id"]
    patched = auth_client.patch(
        f"/api/v1/transfers/{transfer_id}/",
        {"destination_country": "CG"},
        format="json",
    )
    assert patched.status_code == status.HTTP_200_OK
    assert patched.data["destination_country"] == "CG"
    assert patched.data["operator"] == ""
    assert patched.data["status"] == DRAFT
    assert patched.data["amount_sats"] == 0


@pytest.mark.django_db
def test_incompatible_operator_and_phone_rejected(auth_client):
    created = _create(auth_client, key="bad-op")
    transfer_id = created.data["id"]
    bad_op = auth_client.post(
        f"/api/v1/transfers/{transfer_id}/beneficiary/",
        {"operator": "airtel"},
        format="json",
    )
    assert bad_op.status_code == status.HTTP_400_BAD_REQUEST
    bad_phone = auth_client.post(
        f"/api/v1/transfers/{transfer_id}/beneficiary/",
        {"phone_number": "12"},
        format="json",
    )
    assert bad_phone.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_expired_quote_cannot_become_ready(auth_client):
    created = _create(auth_client, key="exp-1")
    transfer_id = created.data["id"]
    auth_client.post(f"/api/v1/transfers/{transfer_id}/quote/", {}, format="json")
    transfer = Transfer.objects.get(pk=transfer_id)
    transfer.quote_expires_at = timezone.now() - timedelta(seconds=1)
    transfer.save(update_fields=["quote_expires_at"])
    ready = auth_client.post(f"/api/v1/transfers/{transfer_id}/ready/", {}, format="json")
    assert ready.status_code == status.HTTP_400_BAD_REQUEST
    transfer.refresh_from_db()
    assert transfer.status == QUOTED


@pytest.mark.django_db
def test_cannot_force_settlement_status(auth_client):
    created = _create(auth_client, key="force-1")
    transfer_id = created.data["id"]
    patched = auth_client.patch(
        f"/api/v1/transfers/{transfer_id}/",
        {"status": "lightning_settled", "lightning_payment_hash": "abc"},
        format="json",
    )
    assert patched.status_code == status.HTTP_200_OK
    assert patched.data["status"] == DRAFT
    assert patched.data["lightning_payment_hash"] == ""
    assert Payment.objects.count() == 0


@pytest.mark.django_db
def test_ready_is_idempotent(auth_client):
    created = _create(auth_client, key="ready-id")
    transfer_id = created.data["id"]
    auth_client.post(f"/api/v1/transfers/{transfer_id}/quote/", {}, format="json")
    first = auth_client.post(f"/api/v1/transfers/{transfer_id}/ready/", {}, format="json")
    second = auth_client.post(f"/api/v1/transfers/{transfer_id}/ready/", {}, format="json")
    assert first.data["status"] == READY
    assert second.data["status"] == READY
    assert Transfer.objects.filter(pk=transfer_id, status=READY).count() == 1


@pytest.mark.django_db
def test_payments_untouched_by_transfer_flow(auth_client):
    before = Payment.objects.count()
    created = _create(auth_client, key="pay-safe")
    auth_client.post(f"/api/v1/transfers/{created.data['id']}/quote/", {}, format="json")
    auth_client.post(f"/api/v1/transfers/{created.data['id']}/ready/", {}, format="json")
    assert Payment.objects.count() == before
    listed = auth_client.get("/api/v1/payments/")
    assert listed.status_code == status.HTTP_200_OK
    assert listed.data["count"] == 0
