from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from smartpay.transfers.admin_corridors import TRANSFER_FIELDS, corridors_payload_contains_secrets
from smartpay.transfers.models import TRANSFER_MODE, Transfer, TransferSimulation
from smartpay.transfers.state import DRAFT, QUOTED, SIMULATED_CREDITED

URL = "/api/v1/admin/corridors/"

FORBIDDEN_TOKENS = (
    "beneficiary_name",
    "phone_number",
    "encoded_invoice",
    "lightning_payment_hash",
    "macaroon",
    "password",
    "jwt",
    "seed",
    "/run/lnd",
    "lnbcrt",
    "awa koné",
    "+22507458912",
)

STITCH_TOKENS = (
    "48 240 000",
    "37 500 000",
    "21 900 000",
    "scn-dkr-abj",
    "dakar node",
    "abidjan peer",
    "116 280",
)


def _transfer(owner, *, ref, source="SN", destination="CI", currency="XOF", amount_local=10_000, amount_sats=23_095, status=QUOTED):
    return Transfer.objects.create(
        owner=owner,
        public_reference=ref,
        source_country=source,
        destination_country=destination,
        currency=currency,
        operator="wave",
        beneficiary_name="Awa Koné",
        phone_number="+22507458912",
        amount_local=amount_local,
        amount_sats=amount_sats,
        status=status,
        execution_mode=TRANSFER_MODE,
        lightning_payment_hash="abc123hash",
    )


@pytest.fixture
def merchant_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        email="shop-corridor@smartpay.test",
        password="test-pass-123",
        role=User.Role.MERCHANT,
        country=User.Country.SN,
    )


def test_requires_auth(api_client):
    assert api_client.get(URL).status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_rejects_non_admin(api_client, user, other_user, merchant_user):
    for account in (user, other_user, merchant_user):
        api_client.force_authenticate(user=account)
        assert api_client.get(URL).status_code == status.HTTP_403_FORBIDDEN, account.role


@pytest.mark.django_db
def test_mutations_not_allowed(admin_client):
    assert admin_client.post(URL, {}, format="json").status_code == 405
    assert admin_client.patch(URL, {}, format="json").status_code == 405
    assert admin_client.put(URL, {}, format="json").status_code == 405
    assert admin_client.delete(URL).status_code == 405


@pytest.mark.django_db
def test_empty_directory(admin_client, monkeypatch):
    monkeypatch.setattr(
        "smartpay.payments.providers.lnd_client.LndRestClient.getinfo",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("LND interdit")),
    )
    monkeypatch.setattr(
        "smartpay.transfers.execution.confirm_execution",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("confirm interdit")),
    )
    response = admin_client.get(URL)
    assert response.status_code == status.HTTP_200_OK
    assert "no-store" in response["Cache-Control"]
    body = response.data
    assert body["count"] == 0
    assert body["results"] == []
    assert body["summary"]["transfers_total"] == 0
    assert body["summary"]["amounts"]["XOF"]["amount_local"] == 0
    assert body["summary"]["amounts"]["XAF"]["amount_local"] == 0
    assert "total_fcfa" not in body["summary"]
    assert [item["code"] for item in body["catalog"]["primary"]] == ["SN", "CI", "CG"]
    assert [item["code"] for item in body["catalog"]["secondary"]] == ["CM", "BJ", "TG"]
    assert all(item["availability_label"] == "Configuré pour simulation" for item in body["catalog"]["primary"])
    assert all(item["simulated_gateway"] is True for item in body["catalog"]["primary"])
    assert all(op["simulated"] is True for item in body["catalog"]["primary"] for op in item["operators"])
    assert body["historical_simulations"]["count"] == 0
    blob = str(body).lower()
    for token in STITCH_TOKENS:
        assert token not in blob


@pytest.mark.django_db
def test_whitelist_separates_currencies_and_hides_pii(admin_client, user, monkeypatch):
    monkeypatch.setattr(
        "smartpay.payments.reconciliation.reconcile_payment",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("reconcile interdit")),
    )
    monkeypatch.setattr(
        "smartpay.payments.providers.lnd_client.LndRestClient.getinfo",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("LND interdit")),
    )
    before_transfers = Transfer.objects.count()
    before_sims = TransferSimulation.objects.count()
    _transfer(user, ref="SPA-XOF1", destination="CI", currency="XOF", amount_local=20_000, amount_sats=46_189)
    _transfer(
        user,
        ref="SPA-XAF1",
        source="SN",
        destination="CG",
        currency="XAF",
        amount_local=15_000,
        amount_sats=34_642,
        status=SIMULATED_CREDITED,
    )
    TransferSimulation.objects.create(
        initiator=user,
        source_country="SN",
        destination_country="CI",
        amount_sats=999,
        status=TransferSimulation.Status.CREATED,
    )

    response = admin_client.get(URL)
    assert response.status_code == status.HTTP_200_OK
    body = response.data
    assert body["count"] == 2
    first = body["results"][0]
    assert set(first.keys()) == set(TRANSFER_FIELDS)
    assert first["is_simulation"] is True
    assert first["execution_mode"] == TRANSFER_MODE
    blob = str(body).lower()
    for token in FORBIDDEN_TOKENS:
        assert token not in blob, token
    assert corridors_payload_contains_secrets(body) is False

    amounts = body["summary"]["amounts"]
    assert amounts["XOF"]["amount_local"] == 20_000
    assert amounts["XAF"]["amount_local"] == 15_000
    assert amounts["XOF"]["transfer_count"] == 1
    assert amounts["XAF"]["transfer_count"] == 1
    assert "volume_indicatif" not in body["summary"]
    assert "total_fcfa" not in body["summary"]
    assert body["summary"]["by_status"][QUOTED] == 1
    assert body["summary"]["by_status"][SIMULATED_CREDITED] == 1
    assert body["summary"]["transfers_total"] == 2

    cg = next(item for item in body["catalog"]["primary"] if item["code"] == "CG")
    assert cg["transfers_as_destination"] == 1
    assert cg["recorded_amount_local"] == 15_000
    assert cg["amounts_are_settled"] is False

    hist = body["historical_simulations"]
    assert hist["count"] == 1
    assert hist["results"][0]["amount_sats"] == 999
    assert hist["results"][0]["is_historical_simulation"] is True
    assert hist["count"] != body["summary"]["transfers_total"]
    assert Transfer.objects.count() == before_transfers + 2
    assert TransferSimulation.objects.count() == before_sims + 1


@pytest.mark.django_db
def test_filters_pagination_and_empty_search(admin_client, user):
    older = _transfer(user, ref="SPA-OLD1", destination="CI", status=DRAFT)
    newer = _transfer(user, ref="SPA-NEW1", destination="CG", currency="XAF", amount_local=8_000, status=QUOTED)
    Transfer.objects.filter(pk=older.pk).update(created_at=timezone.now() - timedelta(days=2))

    page = admin_client.get(URL, {"page_size": 1})
    assert page.status_code == status.HTTP_200_OK
    assert page.data["count"] == 2
    assert page.data["results"][0]["public_reference"] == newer.public_reference
    assert page.data["next"] is not None

    by_dest = admin_client.get(URL, {"destination_country": "CI"})
    assert by_dest.data["count"] == 1
    assert by_dest.data["results"][0]["public_reference"] == older.public_reference

    by_source = admin_client.get(URL, {"source_country": "SN"})
    assert by_source.data["count"] == 2

    by_status = admin_client.get(URL, {"status": DRAFT})
    assert by_status.data["count"] == 1

    after = admin_client.get(URL, {"created_after": (timezone.now() - timedelta(days=1)).isoformat()})
    assert after.data["count"] == 1
    assert after.data["results"][0]["public_reference"] == newer.public_reference

    empty = admin_client.get(URL, {"destination_country": "BJ"})
    assert empty.data["count"] == 0
    assert empty.data["results"] == []
    assert empty.data["summary"]["transfers_total"] == 2


@pytest.mark.django_db
def test_invalid_filters_are_rejected(admin_client):
    assert admin_client.get(URL, {"source_country": "FR"}).status_code == 400
    assert admin_client.get(URL, {"destination_country": "US"}).status_code == 400
    assert admin_client.get(URL, {"status": "paid_live"}).status_code == 400
    assert admin_client.get(URL, {"created_after": "hier"}).status_code == 400
    inverted = admin_client.get(
        URL,
        {"created_after": "2026-10-31T00:00:00Z", "created_before": "2026-10-01T00:00:00Z"},
    )
    assert inverted.status_code == 400
