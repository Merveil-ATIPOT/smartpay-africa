import pytest
from rest_framework import status

from smartpay.merchants.models import Merchant
from smartpay.payments.models import Payment

LIST_URL = "/api/v1/admin/merchants/"
FORBIDDEN_KEYS = {
    "password",
    "is_staff",
    "is_superuser",
    "macaroon",
    "seed",
    "access",
    "refresh",
    "jwt",
}


def _keys_of(payload: dict) -> set[str]:
    return set(payload.keys())


@pytest.mark.django_db
def test_list_requires_auth(api_client):
    response = api_client.get(LIST_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_list_rejects_individual(auth_client):
    response = auth_client.get(LIST_URL)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_lists_real_merchants_without_secrets(admin_client, merchant):
    before = Merchant.objects.count()
    response = admin_client.get(LIST_URL)
    assert response.status_code == status.HTTP_200_OK
    body = response.data
    assert body["count"] == before
    ids = {item["id"] for item in body["results"]}
    assert merchant.id in ids
    assert body["summary"]["total"] == before
    assert body["summary"]["by_status"]["active"] >= 1
    for item in body["results"]:
        assert FORBIDDEN_KEYS.isdisjoint(_keys_of(item))
        assert "display_name" in item
        assert "status" in item
        assert "country" in item
        assert "owner" in item
        assert FORBIDDEN_KEYS.isdisjoint(_keys_of(item["owner"]))
        assert "email" in item["owner"]
        assert "password" not in str(item).lower()
    assert Merchant.objects.count() == before


@pytest.mark.django_db
def test_search_country_status_and_pagination(admin_client, merchant, other_user):
    draft = Merchant.objects.create(
        owner=other_user,
        legal_name="Atelier Yopougon",
        display_name="Atelier Yopougon",
        country="CI",
        status=Merchant.Status.DRAFT,
        registration_number="CI-992",
    )

    by_name = admin_client.get(LIST_URL, {"q": "Teranga"})
    assert by_name.status_code == status.HTTP_200_OK
    assert by_name.data["count"] == 1
    assert by_name.data["results"][0]["id"] == merchant.id

    by_id = admin_client.get(LIST_URL, {"q": str(draft.id)})
    assert by_id.data["count"] == 1
    assert by_id.data["results"][0]["id"] == draft.id

    ivory = admin_client.get(LIST_URL, {"country": "CI"})
    assert ivory.data["count"] == 1
    assert ivory.data["results"][0]["country"] == "CI"

    drafts = admin_client.get(LIST_URL, {"status": "draft"})
    assert drafts.data["count"] == 1
    assert drafts.data["results"][0]["status"] == "draft"

    unknown = admin_client.get(LIST_URL, {"status": "demo"})
    assert unknown.status_code == status.HTTP_400_BAD_REQUEST

    page = admin_client.get(LIST_URL, {"page_size": 1, "page": 1})
    assert page.status_code == status.HTTP_200_OK
    assert len(page.data["results"]) == 1
    assert page.data["count"] >= 2
    assert page.data["next"] is not None
    page_two = admin_client.get(LIST_URL, {"page_size": 1, "page": 2})
    assert page_two.data["results"][0]["id"] != page.data["results"][0]["id"]
    rows = admin_client.get(LIST_URL, {"page_size": 100}).data["results"]
    ordered = [(item["created_at"], item["id"]) for item in rows]
    assert ordered == sorted(ordered)


@pytest.mark.django_db
def test_admin_mutations_are_rejected(admin_client, merchant):
    before = Merchant.objects.count()
    name = merchant.display_name
    status_value = merchant.status
    assert admin_client.post(LIST_URL, {"display_name": "Nouveau"}, format="json").status_code == 405
    assert admin_client.patch(f"{LIST_URL}{merchant.id}/", {"status": "suspended"}, format="json").status_code == 405
    assert admin_client.delete(f"{LIST_URL}{merchant.id}/").status_code == 405
    merchant.refresh_from_db()
    assert merchant.display_name == name
    assert merchant.status == status_value
    assert Merchant.objects.count() == before
    assert "pbkdf2" not in str(admin_client.get(LIST_URL).data).lower()


@pytest.mark.django_db
def test_detail_requires_auth(api_client, merchant):
    response = api_client.get(f"{LIST_URL}{merchant.id}/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_detail_rejects_individual(auth_client, merchant):
    response = auth_client.get(f"{LIST_URL}{merchant.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_reads_existing_and_missing_merchant(admin_client, merchant):
    ok = admin_client.get(f"{LIST_URL}{merchant.id}/")
    assert ok.status_code == status.HTTP_200_OK
    assert ok.data["id"] == merchant.id
    assert ok.data["display_name"] == merchant.display_name
    assert ok.data["owner"]["email"] == merchant.owner.email
    assert "payments_summary" in ok.data
    assert ok.data["payments_summary"]["linked"] == 0
    assert FORBIDDEN_KEYS.isdisjoint(_keys_of(ok.data))
    assert FORBIDDEN_KEYS.isdisjoint(_keys_of(ok.data["owner"]))
    missing = admin_client.get(f"{LIST_URL}999999/")
    assert missing.status_code == status.HTTP_404_NOT_FOUND
    assert "password" not in str(missing.data).lower()
    assert "macaroon" not in str(ok.data).lower()
    assert "encoded_invoice" not in str(ok.data).lower()


@pytest.mark.django_db
def test_detail_isolates_merchant_payments(admin_client, merchant, other_user):
    other = Merchant.objects.create(
        owner=other_user,
        legal_name="Kiosque Poto",
        display_name="Kiosque Poto",
        country="CG",
        status=Merchant.Status.ACTIVE,
    )
    ours = Payment.objects.create(
        owner=merchant.owner,
        merchant=merchant,
        amount_sats=1500,
        description="Encaissement boutique",
        direction=Payment.Direction.INCOMING,
        status=Payment.Status.PENDING,
        encoded_invoice="lnbc_should_not_leak",
    )
    Payment.objects.create(
        owner=other_user,
        merchant=other,
        amount_sats=88000,
        description="Autre boutique",
        direction=Payment.Direction.INCOMING,
        status=Payment.Status.CONFIRMED,
    )
    Payment.objects.create(
        owner=merchant.owner,
        amount_sats=400,
        description="Sans marchand",
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.PENDING,
    )

    body = admin_client.get(f"{LIST_URL}{merchant.id}/").data
    assert body["payments_summary"]["linked"] == 1
    assert body["payments_summary"]["pending"] == 1
    assert body["payments_summary"]["django_confirmed"] == 0
    assert body["payments_summary"]["lightning_settled"] == 0
    assert body["payments_summary"]["amount_sats_linked"] == 1500
    assert len(body["recent_payments"]) == 1
    row = body["recent_payments"][0]
    assert row["id"] == str(ours.id)
    assert row["amount_sats"] == 1500
    assert "encoded_invoice" not in row
    assert "invoice" not in row
    assert "provider_reference" not in row
    assert "lnbc" not in str(body).lower()
    assert 88000 not in [item["amount_sats"] for item in body["recent_payments"]]

    other_body = admin_client.get(f"{LIST_URL}{other.id}/").data
    assert other_body["payments_summary"]["linked"] == 1
    assert other_body["payments_summary"]["django_confirmed"] == 1
    assert other_body["payments_summary"]["amount_sats_linked"] == 88000
    assert other_body["recent_payments"][0]["id"] != str(ours.id)
