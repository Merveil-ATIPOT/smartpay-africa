"""Révocation du refresh token. N'affiche jamais de JWT ni de mot de passe."""

from datetime import timedelta
from unittest.mock import Mock, patch

import pytest
from django.core.cache import cache
from django.test.utils import override_settings
from rest_framework import status
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from smartpay.accounts.throttling import LoginRateThrottle, LogoutRateThrottle

TOKEN_URL = "/api/v1/auth/token/"
REFRESH_URL = "/api/v1/auth/token/refresh/"
LOGOUT_URL = "/api/v1/auth/logout/"
ME_URL = "/api/v1/me/"


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def _login(api_client, user):
    response = api_client.post(
        TOKEN_URL,
        {"email": user.email, "password": "test-pass-123"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    return response.data["access"], response.data["refresh"]


def test_logout_ident_uses_remote_addr_not_xff():
    request = APIRequestFactory().post(LOGOUT_URL)
    request.META["REMOTE_ADDR"] = "192.168.1.40"
    request.META["HTTP_X_FORWARDED_FOR"] = "203.0.113.9, 10.0.0.1"
    assert LogoutRateThrottle().get_ident(request) == "192.168.1.40"
    assert LoginRateThrottle().get_ident(request) == "192.168.1.40"


def test_logout_ident_unknown_without_remote_addr():
    request = Mock()
    request.META = {}
    assert LogoutRateThrottle().get_ident(request) == "unknown"


@pytest.mark.django_db
def test_login_returns_access_and_refresh(api_client, user):
    access, refresh = _login(api_client, user)
    assert access
    assert refresh
    assert access != refresh


@pytest.mark.django_db
def test_refresh_valid_before_logout(api_client, user):
    _access, refresh = _login(api_client, user)
    renewed = api_client.post(REFRESH_URL, {"refresh": refresh}, format="json")
    assert renewed.status_code == status.HTTP_200_OK
    assert renewed.data.get("access")


@pytest.mark.django_db
def test_logout_returns_204(api_client, user):
    _access, refresh = _login(api_client, user)
    response = api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert response.data in (None, "", b"", {})


@pytest.mark.django_db
def test_refresh_after_logout_returns_401(api_client, user):
    _access, refresh = _login(api_client, user)
    assert api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json").status_code == (
        status.HTTP_204_NO_CONTENT
    )
    denied = api_client.post(REFRESH_URL, {"refresh": refresh}, format="json")
    assert denied.status_code == status.HTTP_401_UNAUTHORIZED
    assert "access" not in (denied.data or {})


@pytest.mark.django_db
def test_repeated_logout_returns_204(api_client, user):
    _access, refresh = _login(api_client, user)
    first = api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json")
    second = api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json")
    assert first.status_code == status.HTTP_204_NO_CONTENT
    assert second.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
def test_expired_refresh_logout_returns_204(api_client, user):
    token = RefreshToken.for_user(user)
    token.set_exp(lifetime=timedelta(seconds=-1))
    response = api_client.post(LOGOUT_URL, {"refresh": str(token)}, format="json")
    assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
def test_invalid_refresh_logout_returns_204(api_client):
    """Jeton malformé : champ présent → 204, sans distinguer un compte existant."""
    response = api_client.post(LOGOUT_URL, {"refresh": "not-a-jwt"}, format="json")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    body = response.content.decode("utf-8") if response.content else ""
    assert "not-a-jwt" not in body


@pytest.mark.django_db
@pytest.mark.parametrize("payload", [{}, {"refresh": ""}, {"refresh": "   "}])
def test_logout_missing_or_empty_refresh_returns_400(api_client, payload):
    response = api_client.post(LOGOUT_URL, payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "refresh" in str(response.data)


@pytest.mark.django_db
def test_logout_unexpected_error_is_not_masked(api_client):
    api_client.raise_request_exception = False
    with patch("smartpay.accounts.views.RefreshToken", side_effect=RuntimeError("store-failure")):
        response = api_client.post(
            LOGOUT_URL,
            {"refresh": "placeholder-refresh"},
            format="json",
        )
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert response.status_code != status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
def test_me_works_after_new_login_following_logout(api_client, user):
    access, refresh = _login(api_client, user)
    assert api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json").status_code == (
        status.HTTP_204_NO_CONTENT
    )
    new_access, _new_refresh = _login(api_client, user)
    me = api_client.get(ME_URL, HTTP_AUTHORIZATION=f"Bearer {new_access}")
    assert me.status_code == status.HTTP_200_OK
    assert me.data["email"] == user.email


@pytest.mark.django_db
def test_access_token_remains_valid_until_expiry_after_logout(api_client, user):
    """Réserve documentée : l'access déjà émis n'est pas révoqué."""
    access, refresh = _login(api_client, user)
    assert api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json").status_code == (
        status.HTTP_204_NO_CONTENT
    )
    me = api_client.get(ME_URL, HTTP_AUTHORIZATION=f"Bearer {access}")
    assert me.status_code == status.HTTP_200_OK
    assert me.data["email"] == user.email


@pytest.mark.django_db
@override_settings(AUTH_LOGIN_THROTTLE_RATE="2/min")
def test_login_throttle_does_not_limit_logout(api_client, user):
    _access, refresh = _login(api_client, user)
    statuses = []
    for _ in range(3):
        response = api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json")
        statuses.append(response.status_code)
    assert statuses == [
        status.HTTP_204_NO_CONTENT,
        status.HTTP_204_NO_CONTENT,
        status.HTTP_204_NO_CONTENT,
    ]


@pytest.mark.django_db
@override_settings(AUTH_LOGOUT_THROTTLE_RATE="2/min")
def test_repeated_logout_attempts_return_429(api_client):
    first = api_client.post(LOGOUT_URL, {"refresh": "not-a-jwt"}, format="json")
    second = api_client.post(LOGOUT_URL, {"refresh": "not-a-jwt"}, format="json")
    third = api_client.post(LOGOUT_URL, {"refresh": "not-a-jwt"}, format="json")
    assert first.status_code == status.HTTP_204_NO_CONTENT
    assert second.status_code == status.HTTP_204_NO_CONTENT
    assert third.status_code == status.HTTP_429_TOO_MANY_REQUESTS
