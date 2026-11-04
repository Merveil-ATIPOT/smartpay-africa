"""Quota dédié du login. N'affiche jamais de mot de passe ni de JWT."""

from unittest.mock import Mock

import pytest
from django.core.cache import cache
from django.test.utils import override_settings
from rest_framework import status
from rest_framework.test import APIRequestFactory

from smartpay.accounts.throttling import LoginRateThrottle

TOKEN_URL = "/api/v1/auth/token/"
REFRESH_URL = "/api/v1/auth/token/refresh/"
REGISTER_URL = "/api/v1/auth/register/"
ME_URL = "/api/v1/me/"

VALID_PASSWORD = "Teranga-Demo-42!"


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def _register_payload(email: str) -> dict:
    return {
        "first_name": "Awa",
        "last_name": "Diallo",
        "email": email,
        "password": VALID_PASSWORD,
        "country": "SN",
        "phone_number": "778492011",
        "accepted_terms": True,
    }


def test_login_ident_uses_remote_addr_not_xff():
    """Identification documentée : REMOTE_ADDR seul, X-Forwarded-For ignoré."""
    request = APIRequestFactory().post(TOKEN_URL)
    request.META["REMOTE_ADDR"] = "192.168.1.40"
    request.META["HTTP_X_FORWARDED_FOR"] = "203.0.113.9, 10.0.0.1"
    assert LoginRateThrottle().get_ident(request) == "192.168.1.40"


def test_login_ident_unknown_without_remote_addr():
    request = Mock()
    request.META = {}
    assert LoginRateThrottle().get_ident(request) == "unknown"


@pytest.mark.django_db
@override_settings(AUTH_LOGIN_THROTTLE_RATE="2/min")
def test_repeated_login_attempts_return_429(api_client):
    first = api_client.post(TOKEN_URL, {"email": "nobody@example.sn", "password": "wrong"}, format="json")
    second = api_client.post(TOKEN_URL, {"email": "nobody@example.sn", "password": "wrong"}, format="json")
    third = api_client.post(TOKEN_URL, {"email": "nobody@example.sn", "password": "wrong"}, format="json")
    assert first.status_code == status.HTTP_401_UNAUTHORIZED
    assert second.status_code == status.HTTP_401_UNAUTHORIZED
    assert third.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert not (isinstance(third.data, dict) and third.data.get("access"))


@pytest.mark.django_db
@override_settings(AUTH_LOGIN_THROTTLE_RATE="2/min")
def test_legitimate_login_succeeds_under_limit(api_client, user):
    response = api_client.post(
        TOKEN_URL,
        {"email": user.email, "password": "test-pass-123"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data
    assert "refresh" in response.data


@pytest.mark.django_db
def test_login_response_shape_unchanged(api_client, user):
    ok = api_client.post(
        TOKEN_URL,
        {"email": user.email, "password": "test-pass-123"},
        format="json",
    )
    assert ok.status_code == status.HTTP_200_OK
    assert set(ok.data) >= {"access", "refresh"}
    denied = api_client.post(
        TOKEN_URL,
        {"email": user.email, "password": "bad-password"},
        format="json",
    )
    assert denied.status_code == status.HTTP_401_UNAUTHORIZED
    assert "access" not in denied.data


@pytest.mark.django_db
@override_settings(AUTH_LOGIN_THROTTLE_RATE="2/min")
def test_login_throttle_does_not_limit_register(api_client):
    first = api_client.post(REGISTER_URL, _register_payload("t1@example.sn"), format="json")
    second = api_client.post(REGISTER_URL, _register_payload("t2@example.sn"), format="json")
    third = api_client.post(REGISTER_URL, _register_payload("t3@example.sn"), format="json")
    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_201_CREATED
    assert third.status_code == status.HTTP_201_CREATED
    assert "access" not in first.data


@pytest.mark.django_db
@override_settings(AUTH_LOGIN_THROTTLE_RATE="2/min")
def test_refresh_is_not_login_throttled(api_client, user):
    token = api_client.post(
        TOKEN_URL,
        {"email": user.email, "password": "test-pass-123"},
        format="json",
    )
    assert token.status_code == status.HTTP_200_OK
    refresh = token.data["refresh"]
    statuses = []
    for _ in range(3):
        response = api_client.post(REFRESH_URL, {"refresh": refresh}, format="json")
        statuses.append(response.status_code)
        assert "refresh" in response.data or response.status_code == status.HTTP_200_OK
        assert "access" in response.data
    assert statuses == [status.HTTP_200_OK, status.HTTP_200_OK, status.HTTP_200_OK]


@pytest.mark.django_db
def test_protected_me_still_requires_valid_jwt(api_client, user):
    token = api_client.post(
        TOKEN_URL,
        {"email": user.email, "password": "test-pass-123"},
        format="json",
    )
    assert token.status_code == status.HTTP_200_OK
    me = api_client.get(ME_URL, HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    assert me.status_code == status.HTTP_200_OK
    assert me.data["email"] == user.email
    assert api_client.get(ME_URL).status_code in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    )
