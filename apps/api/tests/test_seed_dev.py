import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from smartpay.accounts.management.commands.fix_demo_user_country import DEMO_MERCHANT_LEGAL_NAME
from smartpay.merchants.models import Merchant
from smartpay.transfers.corridors import get_corridor
from smartpay.transfers.models import TransferSimulation

User = get_user_model()

DEMO_EMAIL = "user@smartpay.local"


@pytest.mark.django_db
def test_seed_dev_creates_demo_user_in_senegal(settings, monkeypatch):
    settings.DEBUG = True
    monkeypatch.setenv("DEV_USER_EMAIL", DEMO_EMAIL)
    call_command("seed_dev")
    user = User.objects.get(email=DEMO_EMAIL)
    assert user.country == User.Country.SN
    assert user.role == User.Role.INDIVIDUAL
    shop = Merchant.objects.get(owner=user, legal_name=DEMO_MERCHANT_LEGAL_NAME)
    assert shop.country == User.Country.SN


@pytest.mark.django_db
def test_seed_dev_does_not_rewrite_existing_demo_country(settings, monkeypatch):
    settings.DEBUG = True
    monkeypatch.setenv("DEV_USER_EMAIL", DEMO_EMAIL)
    existing = User.objects.create_user(
        email=DEMO_EMAIL,
        password="unused-in-test",
        role=User.Role.INDIVIDUAL,
        country=User.Country.CG,
    )
    call_command("seed_dev")
    existing.refresh_from_db()
    assert existing.country == User.Country.CG


@pytest.mark.django_db
def test_fix_demo_user_country_dry_run_does_not_write(settings, monkeypatch):
    settings.DEBUG = True
    monkeypatch.setenv("DEV_USER_EMAIL", DEMO_EMAIL)
    user = User.objects.create_user(
        email=DEMO_EMAIL,
        password="unused-in-test",
        role=User.Role.INDIVIDUAL,
        country=User.Country.CG,
    )
    Merchant.objects.create(
        owner=user,
        legal_name=DEMO_MERCHANT_LEGAL_NAME,
        display_name="Boutique Demo",
        country="CG",
        status=Merchant.Status.ACTIVE,
    )
    TransferSimulation.objects.create(
        initiator=user,
        source_country="CG",
        destination_country="SN",
        amount_sats=10_000,
        status=TransferSimulation.Status.CREATED,
    )
    call_command("fix_demo_user_country")
    user.refresh_from_db()
    assert user.country == User.Country.CG
    assert Merchant.objects.get(owner=user).country == "CG"
    assert TransferSimulation.objects.filter(initiator=user).count() == 1


@pytest.mark.django_db
def test_congo_and_ivory_coast_remain_valid():
    assert User.Country.CG == "CG"
    assert User.Country.CI == "CI"
    assert get_corridor("CG") is not None
    assert get_corridor("CG").available is True
    assert get_corridor("CI") is not None
    assert get_corridor("CI").available is True
