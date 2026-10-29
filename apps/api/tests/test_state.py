import pytest

from smartpay.payments.models import Payment
from smartpay.payments.state import InvalidPaymentTransition, transition


@pytest.mark.django_db
def test_created_to_pending_to_confirmed_mock_is_not_lightning(user):
    payment = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.CREATED,
        settlement_mode=Payment.SettlementMode.MOCK,
    )
    transition(payment, Payment.Status.PENDING)
    payment.refresh_from_db()
    assert payment.status == Payment.Status.PENDING
    transition(payment, Payment.Status.CONFIRMED, lightning_settled=False)
    payment.refresh_from_db()
    assert payment.status == Payment.Status.CONFIRMED
    assert payment.is_lightning_settled is False


@pytest.mark.django_db
def test_mock_cannot_transition_to_lightning_settled(user):
    payment = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.PENDING,
        settlement_mode=Payment.SettlementMode.MOCK,
    )
    with pytest.raises(InvalidPaymentTransition, match="Lightning"):
        transition(payment, Payment.Status.CONFIRMED, lightning_settled=True)


@pytest.mark.django_db
def test_pending_to_failed_and_expired(user):
    failed = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.PENDING,
    )
    transition(failed, Payment.Status.FAILED, failure_reason="insufficient_mock_balance")
    failed.refresh_from_db()
    assert failed.status == Payment.Status.FAILED
    assert failed.failure_reason == "insufficient_mock_balance"

    expired = Payment.objects.create(
        owner=user,
        amount_sats=2000,
        direction=Payment.Direction.INCOMING,
        status=Payment.Status.PENDING,
    )
    transition(expired, Payment.Status.EXPIRED)
    expired.refresh_from_db()
    assert expired.status == Payment.Status.EXPIRED


@pytest.mark.django_db
def test_terminal_states_are_final(user):
    payment = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.FAILED,
    )
    with pytest.raises(InvalidPaymentTransition):
        transition(payment, Payment.Status.CONFIRMED)
