from unittest.mock import MagicMock
from datetime import datetime, timezone

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient

from smartpay.core.security import assert_hardened_settings
from smartpay.payments.lab import can_create_lab_counterparty_invoice


def test_hardened_settings_allow_debug_placeholders():
    assert_hardened_settings(
        debug=True,
        secret_key="insecure-dev-placeholder-not-for-production",
        jwt_key="change-me-jwt-local-only",
        allowed_hosts=[],
    )


def test_hardened_settings_reject_placeholders_outside_debug():
    with pytest.raises(ImproperlyConfigured, match="SECRET_KEY"):
        assert_hardened_settings(
            debug=False,
            secret_key="insecure-dev-placeholder-not-for-production",
            jwt_key="long-enough-local-jwt-signing-key-value",
            allowed_hosts=["lab.example"],
        )
    with pytest.raises(ImproperlyConfigured, match="JWT"):
        assert_hardened_settings(
            debug=False,
            secret_key="long-enough-local-django-secret-key-value",
            jwt_key="change-me-jwt-local-only",
            allowed_hosts=["lab.example"],
        )
    with pytest.raises(ImproperlyConfigured, match="ALLOWED_HOSTS"):
        assert_hardened_settings(
            debug=False,
            secret_key="long-enough-local-django-secret-key-value",
            jwt_key="long-enough-local-jwt-signing-key-value",
            allowed_hosts=["*"],
        )


def test_transfer_confirm_remains_disabled_by_default(settings):
    assert settings.TRANSFER_CONFIRM_ENABLED is False


@pytest.mark.django_db
def test_schema_is_restricted_when_debug_is_false(user, admin_user):
    anonymous = APIClient()
    ordinary = APIClient()
    ordinary.force_authenticate(user=user)
    admin = APIClient()
    admin.force_authenticate(user=admin_user)
    assert anonymous.get("/api/schema/").status_code in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    )
    assert ordinary.get("/api/docs/").status_code == status.HTTP_403_FORBIDDEN
    assert admin.get("/api/schema/").status_code == status.HTTP_200_OK


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_schema_is_open_in_debug(api_client):
    response = api_client.get("/api/schema/")
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
@override_settings(LAB_COUNTERPARTY_ENABLED=True, LAB_COUNTERPARTY_ALLOW_EMAILS=["user@smartpay.local"])
def test_lab_invoice_refuses_ordinary_user_before_provider(auth_client, monkeypatch):
    provider = MagicMock()
    monkeypatch.setattr("smartpay.payments.lab.get_lab_counterparty_provider", lambda: provider)
    response = auth_client.post(
        "/api/v1/lab/counterparty-invoice/",
        {"amount_sats": 2500},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    provider.create_invoice.assert_not_called()


@pytest.mark.django_db
@override_settings(LAB_COUNTERPARTY_ENABLED=True, LAB_COUNTERPARTY_ALLOW_EMAILS=["user@smartpay.local"])
def test_lab_invoice_allows_admin_with_mock(admin_client, monkeypatch):
    draft = MagicMock()
    draft.encoded_invoice = "lnbcrt1mocklab"
    draft.payment_hash = "aa" * 32
    draft.expires_at = datetime(2026, 11, 1, tzinfo=timezone.utc)
    provider = MagicMock()
    provider.create_invoice.return_value = draft
    monkeypatch.setattr("smartpay.payments.lab.get_lab_counterparty_provider", lambda: provider)
    response = admin_client.post(
        "/api/v1/lab/counterparty-invoice/",
        {"amount_sats": 2500},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["is_user_wallet"] is False
    provider.create_invoice.assert_called_once()


@pytest.mark.django_db
@override_settings(LAB_COUNTERPARTY_ENABLED=True, LAB_COUNTERPARTY_ALLOW_EMAILS=["alice@smartpay.test"])
def test_lab_invoice_allows_listed_lab_email(auth_client, user, monkeypatch):
    assert can_create_lab_counterparty_invoice(user) is True
    draft = MagicMock()
    draft.encoded_invoice = "lnbcrt1mocklab"
    draft.payment_hash = "bb" * 32
    draft.expires_at = datetime(2026, 11, 1, tzinfo=timezone.utc)
    provider = MagicMock()
    provider.create_invoice.return_value = draft
    monkeypatch.setattr("smartpay.payments.lab.get_lab_counterparty_provider", lambda: provider)
    response = auth_client.post(
        "/api/v1/lab/counterparty-invoice/",
        {"amount_sats": 2500},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    provider.create_invoice.assert_called_once()


@pytest.mark.django_db
def test_lab_invoice_stays_404_when_flag_off(admin_client, monkeypatch):
    provider = MagicMock()
    monkeypatch.setattr("smartpay.payments.lab.get_lab_counterparty_provider", lambda: provider)
    response = admin_client.post(
        "/api/v1/lab/counterparty-invoice/",
        {"amount_sats": 2500},
        format="json",
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    provider.create_invoice.assert_not_called()
