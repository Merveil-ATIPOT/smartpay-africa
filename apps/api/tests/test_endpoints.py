import pytest
from rest_framework import status

from smartpay.audit.models import AuditLog
from smartpay.payments.models import Payment
from smartpay.transfers.models import TransferSimulation


@pytest.mark.django_db
def test_health_is_public(api_client):
    response = api_client.get("/api/v1/health/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "ok"
    assert body["network"] == "regtest"
    assert body["payment_provider"] == "mock"
    assert body["lightning"] == "not_connected"


@pytest.mark.django_db
def test_me_returns_authenticated_user(auth_client, user):
    response = auth_client.get(" /api/v1/me/".strip())
    assert response.status_code == status.HTTP_200_OK
    assert response.data["email"] == user.email
    assert response.data["role"] == user.role
    assert response.data["country"] == "SN"


@pytest.mark.django_db
def test_wallet_returns_mock_connection(auth_client):
    response = auth_client.get("/api/v1/wallet/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["provider"] == "mock"
    assert response.data["is_lightning_connected"] is False
    assert response.data["mock_balance_sats"] == 0
    assert any("Lightning" in warning for warning in response.data["warnings"])


@pytest.mark.django_db
def test_create_invoice_mock_is_not_lightning(auth_client):
    response = auth_client.post(
        "/api/v1/payments/invoices/",
        {"amount_sats": 2500, "memo": "déjeuner"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["amount_sats"] == 2500
    assert response.data["status"] == Payment.Status.PENDING
    assert response.data["settlement_mode"] == "mock"
    assert response.data["is_lightning_settled"] is False
    assert response.data["lightning_status"] == "not_applicable"
    assert response.data["invoice"]["encoded_invoice"].startswith("mockln1")
    assert response.data["invoice"]["is_mock"] is True
    assert AuditLog.objects.filter(action="payment.invoice_created").exists()


@pytest.mark.django_db
def test_invoice_rejects_invalid_amount(auth_client):
    response = auth_client.post(
        "/api/v1/payments/invoices/",
        {"amount_sats": 0},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_preview_payment(auth_client):
    response = auth_client.post(
        "/api/v1/payments/preview/",
        {"amount_sats": 10_000},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.data["fee_sats"] == 0
    assert response.data["is_lightning_settled"] is False
    assert response.data["settlement_mode"] == "mock"


@pytest.mark.django_db
def test_create_payment_idempotent(auth_client):
    payload = {"amount_sats": 4200, "description": "frais scolarité"}
    first = auth_client.post(
        "/api/v1/payments/",
        payload,
        format="json",
        HTTP_IDEMPOTENCY_KEY="key-42",
    )
    second = auth_client.post(
        "/api/v1/payments/",
        payload,
        format="json",
        HTTP_IDEMPOTENCY_KEY="key-42",
    )
    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_200_OK
    assert first.data["id"] == second.data["id"]
    assert first.data["is_lightning_settled"] is False
    assert Payment.objects.filter(idempotency_key="key-42").count() == 1


@pytest.mark.django_db
def test_create_payment_requires_idempotency_key(auth_client):
    response = auth_client.post("/api/v1/payments/", {"amount_sats": 100}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_list_and_retrieve_payment(auth_client):
    created = auth_client.post(
        "/api/v1/payments/",
        {"amount_sats": 900, "idempotency_key": "abc"},
        format="json",
    )
    listed = auth_client.get("/api/v1/payments/")
    assert listed.status_code == status.HTTP_200_OK
    assert listed.data["count"] == 1
    detail = auth_client.get(f"/api/v1/payments/{created.data['id']}/")
    assert detail.status_code == status.HTTP_200_OK
    assert detail.data["amount_sats"] == 900


@pytest.mark.django_db
def test_transfer_simulations_list(auth_client, user):
    TransferSimulation.objects.create(
        initiator=user,
        source_country="SN",
        destination_country="CI",
        amount_sats=8000,
    )
    response = auth_client.get("/api/v1/transfers/simulations/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert "SIMULATION" in response.data["results"][0]["disclaimer"]
