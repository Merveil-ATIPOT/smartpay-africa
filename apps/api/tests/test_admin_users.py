import pytest
from rest_framework import status

from smartpay.accounts.models import User

LIST_URL = "/api/v1/admin/users/"
FORBIDDEN_KEYS = {
    "password",
    "is_staff",
    "is_superuser",
    "last_login",
    "groups",
    "user_permissions",
    "macaroon",
    "seed",
}


def _keys_of(payload: dict) -> set[str]:
    return set(payload.keys())


@pytest.mark.django_db
def test_list_requires_auth(api_client):
    response = api_client.get(LIST_URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_detail_requires_auth(api_client, user):
    response = api_client.get(f"{LIST_URL}{user.id}/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_list_rejects_individual(auth_client):
    response = auth_client.get(LIST_URL)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_detail_rejects_individual(auth_client, admin_user):
    response = auth_client.get(f"{LIST_URL}{admin_user.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_student_and_merchant_cannot_read_directory(api_client, other_user, user):
    api_client.force_authenticate(user=other_user)
    assert api_client.get(LIST_URL).status_code == status.HTTP_403_FORBIDDEN
    assert api_client.get(f"{LIST_URL}{user.id}/").status_code == status.HTTP_403_FORBIDDEN

    merchant = User.objects.create_user(
        email="shop@smartpay.test",
        password="test-pass-123",
        role=User.Role.MERCHANT,
        country=User.Country.SN,
    )
    api_client.force_authenticate(user=merchant)
    assert api_client.get(LIST_URL).status_code == status.HTTP_403_FORBIDDEN
    assert api_client.get(f"{LIST_URL}{user.id}/").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_lists_real_accounts_without_secrets(admin_client, user, other_user, admin_user):
    before = User.objects.count()
    response = admin_client.get(LIST_URL)
    assert response.status_code == status.HTTP_200_OK
    body = response.data
    assert body["count"] == before
    ids = {item["id"] for item in body["results"]}
    assert user.id in ids
    assert other_user.id in ids
    assert admin_user.id in ids
    assert body["summary"]["total"] == before
    assert body["summary"]["active"] >= 1
    for item in body["results"]:
        assert FORBIDDEN_KEYS.isdisjoint(_keys_of(item))
        assert "email" in item
        assert "role" in item
        assert "is_active" in item
        assert "date_joined" in item
    assert User.objects.count() == before


@pytest.mark.django_db
def test_admin_reads_existing_and_missing_user(admin_client, user):
    ok = admin_client.get(f"{LIST_URL}{user.id}/")
    assert ok.status_code == status.HTTP_200_OK
    assert ok.data["id"] == user.id
    assert ok.data["email"] == user.email
    assert FORBIDDEN_KEYS.isdisjoint(_keys_of(ok.data))
    missing = admin_client.get(f"{LIST_URL}999999/")
    assert missing.status_code == status.HTTP_404_NOT_FOUND
    assert "password" not in str(missing.data).lower()


@pytest.mark.django_db
def test_search_role_country_status_and_pagination(admin_client, user, other_user):
    inactive = User.objects.create_user(
        email="inactive@smartpay.test",
        password="test-pass-123",
        role=User.Role.MERCHANT,
        country=User.Country.CG,
        first_name="Awa",
        last_name="Diallo",
        phone_number="+242060000000",
    )
    inactive.is_active = False
    inactive.save(update_fields=["is_active"])

    by_email = admin_client.get(LIST_URL, {"q": "alice@smartpay.test"})
    assert by_email.status_code == status.HTTP_200_OK
    assert by_email.data["count"] == 1
    assert by_email.data["results"][0]["id"] == user.id

    by_name = admin_client.get(LIST_URL, {"q": "Awa"})
    assert by_name.data["count"] == 1
    assert by_name.data["results"][0]["id"] == inactive.id

    by_phone = admin_client.get(LIST_URL, {"q": "+242060000000"})
    assert by_phone.data["count"] == 1

    by_id = admin_client.get(LIST_URL, {"q": str(inactive.id)})
    assert by_id.data["count"] == 1
    assert by_id.data["results"][0]["id"] == inactive.id

    merchants = admin_client.get(LIST_URL, {"role": "merchant"})
    assert merchants.data["count"] == 1
    assert merchants.data["results"][0]["role"] == "merchant"

    congo = admin_client.get(LIST_URL, {"country": "CG"})
    assert {item["id"] for item in congo.data["results"]} >= {inactive.id}

    disabled = admin_client.get(LIST_URL, {"is_active": "false"})
    assert disabled.data["count"] == 1
    assert disabled.data["results"][0]["is_active"] is False

    unknown_role = admin_client.get(LIST_URL, {"role": "agent"})
    assert unknown_role.status_code == status.HTTP_400_BAD_REQUEST

    page = admin_client.get(LIST_URL, {"page_size": 1, "page": 1})
    assert page.status_code == status.HTTP_200_OK
    assert len(page.data["results"]) == 1
    assert page.data["count"] >= 3
    assert page.data["next"] is not None
    page_two = admin_client.get(LIST_URL, {"page_size": 1, "page": 2})
    assert page_two.data["results"][0]["id"] != page.data["results"][0]["id"]
    rows = admin_client.get(LIST_URL, {"page_size": 100}).data["results"]
    ordered = [(item["date_joined"], item["id"]) for item in rows]
    assert ordered == sorted(ordered)


@pytest.mark.django_db
def test_admin_mutations_are_rejected(admin_client, user):
    before = User.objects.count()
    email = user.email
    role = user.role
    active = user.is_active
    assert admin_client.post(LIST_URL, {"email": "nouveau@smartpay.test"}, format="json").status_code == 405
    assert (
        admin_client.patch(f"{LIST_URL}{user.id}/", {"role": "admin", "is_active": False}, format="json").status_code
        == 405
    )
    assert admin_client.delete(f"{LIST_URL}{user.id}/").status_code == 405
    user.refresh_from_db()
    assert user.email == email
    assert user.role == role
    assert user.is_active is active
    assert User.objects.count() == before
    assert "pbkdf2" not in str(admin_client.get(LIST_URL).data).lower()
