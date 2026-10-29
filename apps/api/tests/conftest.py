import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from smartpay.merchants.models import Merchant

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="alice@smartpay.test",
        password="test-pass-123",
        role=User.Role.INDIVIDUAL,
        country=User.Country.SN,
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="bob@smartpay.test",
        password="test-pass-123",
        role=User.Role.STUDENT,
        country=User.Country.CI,
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email="admin@smartpay.test",
        password="test-pass-123",
        country=User.Country.CG,
    )


@pytest.fixture
def merchant(user):
    return Merchant.objects.create(
        owner=user,
        legal_name="Café Teranga",
        display_name="Café Teranga",
        country="SN",
        status=Merchant.Status.ACTIVE,
    )


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client
