import pytest
from django.core.cache import cache
from django.db import IntegrityError
from django.test.utils import override_settings
from rest_framework import status

from smartpay.accounts.models import User
from smartpay.accounts.serializers import EMAIL_ALREADY_USED
from smartpay.merchants.models import Merchant
from smartpay.payments.models import Payment
from smartpay.wallets.models import WalletConnection

REGISTER_URL = "/api/v1/auth/register/"
TOKEN_URL = "/api/v1/auth/token/"
ME_URL = "/api/v1/me/"

VALID_PASSWORD = "Teranga-Demo-42!"

DEMO_EMAIL = "user@smartpay.local"
DEMO_PASSWORD = "changeme-local-only"


def _payload(**overrides):
    data = {
        "first_name": "Awa",
        "last_name": "Diallo",
        "email": "awa@example.sn",
        "password": VALID_PASSWORD,
        "country": "SN",
        "phone_number": "778492011",
        "accepted_terms": True,
    }
    data.update(overrides)
    return data


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("country", "phone", "e164"),
    [
        ("SN", "778492011", "+221778492011"),
        ("CI", "07458912", "+22507458912"),
        ("CG", "066112233", "+242066112233"),
    ],
)
def test_register_valid_for_supported_countries(api_client, country, phone, e164):
    email = f"user.{country.lower()}@example.test"
    response = api_client.post(
        REGISTER_URL,
        _payload(email=email, country=country, phone_number=phone),
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["email"] == email
    assert body["first_name"] == "Awa"
    assert body["last_name"] == "Diallo"
    assert body["phone_number"] == e164
    assert body["role"] == User.Role.INDIVIDUAL
    assert body["country"] == country
    assert isinstance(body["id"], int)
    user = User.objects.get(pk=body["id"])
    assert user.email == email
    assert user.role == User.Role.INDIVIDUAL
    assert user.phone_number == e164


@pytest.mark.django_db
def test_register_duplicate_email(api_client):
    first = api_client.post(REGISTER_URL, _payload(), format="json")
    assert first.status_code == status.HTTP_201_CREATED
    second = api_client.post(REGISTER_URL, _payload(), format="json")
    assert second.status_code == status.HTTP_400_BAD_REQUEST
    assert EMAIL_ALREADY_USED in str(second.json())
    assert User.objects.filter(email="awa@example.sn").count() == 1


@pytest.mark.django_db
def test_register_duplicate_email_different_case(api_client):
    first = api_client.post(REGISTER_URL, _payload(email="Awa@Example.SN"), format="json")
    assert first.status_code == status.HTTP_201_CREATED
    assert first.json()["email"] == "awa@example.sn"
    second = api_client.post(REGISTER_URL, _payload(email="AWA@example.sn"), format="json")
    assert second.status_code == status.HTTP_400_BAD_REQUEST
    assert EMAIL_ALREADY_USED in str(second.json())
    assert User.objects.filter(email__iexact="awa@example.sn").count() == 1


@pytest.mark.django_db
def test_register_duplicate_email_integrity_error(api_client, monkeypatch):
    def boom(*args, **kwargs):
        raise IntegrityError("unique email")

    monkeypatch.setattr(User.objects, "create_user", boom)
    response = api_client.post(REGISTER_URL, _payload(email="race@example.sn"), format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert EMAIL_ALREADY_USED in str(response.json())


@pytest.mark.django_db
def test_register_invalid_country(api_client):
    response = api_client.post(REGISTER_URL, _payload(country="FR"), format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert User.objects.filter(email="awa@example.sn").exists() is False


@pytest.mark.django_db
def test_register_invalid_phone(api_client):
    response = api_client.post(REGISTER_URL, _payload(phone_number="12"), format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    detail = str(response.json())
    assert "phone_number" in detail
    assert User.objects.filter(email="awa@example.sn").exists() is False


@pytest.mark.django_db
def test_register_weak_password(api_client):
    response = api_client.post(REGISTER_URL, _payload(password="123"), format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in str(response.json())
    assert User.objects.filter(email="awa@example.sn").exists() is False


@pytest.mark.django_db
def test_register_missing_required_fields(api_client):
    response = api_client.post(REGISTER_URL, {}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    detail = response.json()["detail"]
    for field in (
        "first_name",
        "last_name",
        "email",
        "password",
        "country",
        "phone_number",
        "accepted_terms",
    ):
        assert field in detail


@pytest.mark.django_db
def test_register_terms_not_accepted(api_client):
    response = api_client.post(REGISTER_URL, _payload(accepted_terms=False), format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "accepted_terms" in str(response.json())
    assert User.objects.filter(email="awa@example.sn").exists() is False


@pytest.mark.django_db
def test_register_ignores_admin_role_injection(api_client):
    payload = _payload()
    payload["role"] = User.Role.ADMIN
    response = api_client.post(REGISTER_URL, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["role"] == User.Role.INDIVIDUAL
    user = User.objects.get(pk=response.json()["id"])
    assert user.role == User.Role.INDIVIDUAL
    assert user.is_staff is False
    assert user.is_superuser is False


@pytest.mark.django_db
def test_register_ignores_privileged_attributes(api_client):
    payload = _payload(email="priv@example.sn")
    payload.update(
        {
            "is_staff": True,
            "is_superuser": True,
            "is_active": False,
            "role": "merchant",
        }
    )
    response = api_client.post(REGISTER_URL, payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    user = User.objects.get(pk=response.json()["id"])
    assert user.role == User.Role.INDIVIDUAL
    assert user.is_staff is False
    assert user.is_superuser is False
    assert user.is_active is True


@pytest.mark.django_db
def test_register_password_is_hashed(api_client):
    response = api_client.post(REGISTER_URL, _payload(), format="json")
    assert response.status_code == status.HTTP_201_CREATED
    user = User.objects.get(pk=response.json()["id"])
    assert user.password != VALID_PASSWORD
    assert VALID_PASSWORD not in user.password
    assert user.check_password(VALID_PASSWORD)
    assert user.has_usable_password()


@pytest.mark.django_db
def test_register_response_has_no_password_or_jwt(api_client):
    response = api_client.post(REGISTER_URL, _payload(), format="json")
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    for key in ("password", "access", "refresh", "token"):
        assert key not in body
    assert set(body) == {
        "id",
        "email",
        "first_name",
        "last_name",
        "phone_number",
        "role",
        "country",
    }


@pytest.mark.django_db
def test_jwt_login_after_register(api_client):
    created = api_client.post(REGISTER_URL, _payload(), format="json")
    assert created.status_code == status.HTTP_201_CREATED
    token = api_client.post(
        TOKEN_URL,
        {"email": "awa@example.sn", "password": VALID_PASSWORD},
        format="json",
    )
    assert token.status_code == status.HTTP_200_OK
    assert "access" in token.data
    assert "refresh" in token.data
    me = api_client.get(ME_URL, HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    assert me.status_code == status.HTTP_200_OK
    assert me.data["email"] == "awa@example.sn"
    assert me.data["role"] == User.Role.INDIVIDUAL
    assert me.data["id"] == created.json()["id"]


@pytest.mark.django_db
def test_register_does_not_create_merchant(api_client):
    before = Merchant.objects.count()
    response = api_client.post(REGISTER_URL, _payload(), format="json")
    assert response.status_code == status.HTTP_201_CREATED
    user = User.objects.get(pk=response.json()["id"])
    assert Merchant.objects.count() == before
    assert user.merchants.count() == 0


@pytest.mark.django_db
def test_register_creates_mock_wallet_via_existing_signal(api_client):
    response = api_client.post(REGISTER_URL, _payload(), format="json")
    assert response.status_code == status.HTTP_201_CREATED
    user = User.objects.get(pk=response.json()["id"])
    wallet = WalletConnection.objects.get(user=user, provider=WalletConnection.Provider.MOCK)
    assert wallet.public_identifier == f"mock-wallet-{user.pk}"
    assert wallet.alias == "Portefeuille Mock P01"
    assert wallet.mock_balance_sats == 0
    assert wallet.is_active is True
    assert WalletConnection.objects.filter(user=user).count() == 1


@pytest.mark.django_db
def test_demo_account_unchanged_after_register(api_client):
    demo = User.objects.create_user(
        email=DEMO_EMAIL,
        password=DEMO_PASSWORD,
        first_name="Demo",
        last_name="User",
        country=User.Country.SN,
        phone_number="+221770000000",
        role=User.Role.INDIVIDUAL,
    )
    demo_password = demo.password
    response = api_client.post(REGISTER_URL, _payload(), format="json")
    assert response.status_code == status.HTTP_201_CREATED
    demo.refresh_from_db()
    assert User.objects.filter(email=DEMO_EMAIL).count() == 1
    assert demo.email == DEMO_EMAIL
    assert demo.country == User.Country.SN
    assert demo.role == User.Role.INDIVIDUAL
    assert demo.password == demo_password
    assert demo.check_password(DEMO_PASSWORD)


@pytest.mark.django_db
@override_settings(AUTH_REGISTER_THROTTLE_RATE="2/hour")
def test_register_rate_limit(api_client):
    cache.clear()
    first = api_client.post(REGISTER_URL, _payload(email="t1@example.sn"), format="json")
    second = api_client.post(REGISTER_URL, _payload(email="t2@example.sn"), format="json")
    third = api_client.post(REGISTER_URL, _payload(email="t3@example.sn"), format="json")
    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_201_CREATED
    assert third.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert User.objects.filter(email="t3@example.sn").exists() is False


@pytest.mark.django_db
def test_register_does_not_call_lnd_or_create_payments(api_client, monkeypatch):
    def fail_lnd(*args, **kwargs):
        raise AssertionError("LND ne doit pas être appelé à l'inscription.")

    monkeypatch.setattr(
        "smartpay.payments.providers.lnd_client.LndRestClient.__init__",
        fail_lnd,
    )
    before = Payment.objects.count()
    response = api_client.post(REGISTER_URL, _payload(), format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert Payment.objects.count() == before


@pytest.mark.django_db
def test_register_normalizes_name_and_email_spaces(api_client):
    response = api_client.post(
        REGISTER_URL,
        _payload(
            first_name="  Awa  Ndèye ",
            last_name=" Diallo  ",
            email="  Awa.Diallo@Example.SN ",
        ),
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["first_name"] == "Awa Ndèye"
    assert body["last_name"] == "Diallo"
    assert body["email"] == "awa.diallo@example.sn"


@pytest.mark.django_db
def test_register_is_public(api_client):
    response = api_client.post(REGISTER_URL, _payload(), format="json")
    assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("country", "phone", "e164"),
    [
        ("SN", "+221 77 849 20 11", "+221778492011"),
        ("SN", "0778492011", "+221778492011"),
        ("CI", "07 45 89 12", "+22507458912"),
        ("CG", "+242066112233", "+242066112233"),
    ],
)
def test_register_phone_spaces_prefix_and_trunk_zero(api_client, country, phone, e164):
    digits = "".join(ch for ch in phone if ch.isdigit())
    email = f"phone.{country.lower()}.{digits[-6:]}@example.test"
    response = api_client.post(
        REGISTER_URL,
        _payload(email=email, country=country, phone_number=phone),
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["phone_number"] == e164


@pytest.mark.django_db
def test_register_rejects_letters_wrong_prefix_and_bad_length(api_client):
    letters = api_client.post(
        REGISTER_URL,
        _payload(email="letters@example.sn", phone_number="77abc8492011"),
        format="json",
    )
    assert letters.status_code == status.HTTP_400_BAD_REQUEST
    wrong = api_client.post(
        REGISTER_URL,
        _payload(email="wrong@example.sn", phone_number="+22507458912"),
        format="json",
    )
    assert wrong.status_code == status.HTTP_400_BAD_REQUEST
    long_phone = api_client.post(
        REGISTER_URL,
        _payload(email="long@example.sn", phone_number="77849201199"),
        format="json",
    )
    assert long_phone.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_existing_token_and_me_routes_unchanged(api_client, user):
    token = api_client.post(
        TOKEN_URL,
        {"email": user.email, "password": "test-pass-123"},
        format="json",
    )
    assert token.status_code == status.HTTP_200_OK
    me = api_client.get(ME_URL, HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    assert me.status_code == status.HTTP_200_OK
    assert me.data["email"] == user.email
    unauth = api_client.get(ME_URL)
    assert unauth.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
