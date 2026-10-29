import pytest
from django.db import IntegrityError

from smartpay.accounts.models import User
from smartpay.exchange_rates.models import ExchangeRate
from smartpay.payments.models import Payment
from smartpay.transfers.models import TransferSimulation
from smartpay.wallets.models import WalletConnection


@pytest.mark.django_db
def test_user_email_is_unique():
    User.objects.create_user(email="unique@smartpay.test", password="x")
    with pytest.raises(IntegrityError):
        User.objects.create_user(email="unique@smartpay.test", password="y")


@pytest.mark.django_db
def test_user_gets_mock_wallet(user):
    wallet = WalletConnection.objects.get(user=user, provider=WalletConnection.Provider.MOCK)
    assert wallet.public_identifier.startswith("mock-wallet-")
    assert wallet.mock_balance_sats == 0


@pytest.mark.django_db
def test_payment_amount_must_be_positive(user):
    with pytest.raises(IntegrityError):
        Payment.objects.create(
            owner=user,
            amount_sats=0,
            direction=Payment.Direction.OUTGOING,
            settlement_mode=Payment.SettlementMode.MOCK,
        )


@pytest.mark.django_db
def test_mock_payment_cannot_be_lightning_settled(user):
    with pytest.raises(IntegrityError):
        Payment.objects.create(
            owner=user,
            amount_sats=1000,
            direction=Payment.Direction.OUTGOING,
            settlement_mode=Payment.SettlementMode.MOCK,
            is_lightning_settled=True,
        )


@pytest.mark.django_db
def test_amounts_are_integers_in_satoshis(user):
    payment = Payment.objects.create(
        owner=user,
        amount_sats=2500,
        direction=Payment.Direction.INCOMING,
    )
    assert isinstance(payment.amount_sats, int)
    assert payment.network == Payment.Network.REGTEST
    assert payment.is_lightning_settled is False


@pytest.mark.django_db
def test_exchange_rate_is_placeholder_without_value():
    rate = ExchangeRate.objects.create(pair="BTC_XOF_PLACEHOLDER")
    assert rate.is_placeholder is True
    assert rate.value is None
    assert rate.source == "not_a_market_rate"


@pytest.mark.django_db
def test_transfer_simulation_disclaimer(user):
    sim = TransferSimulation.objects.create(
        initiator=user,
        source_country="SN",
        destination_country="CG",
        amount_sats=5000,
    )
    assert "SIMULATION" in sim.disclaimer
    assert "Wave" in sim.disclaimer
