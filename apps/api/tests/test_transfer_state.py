import pytest

from smartpay.transfers.state import (
    DRAFT,
    LIGHTNING_SETTLED,
    PAYMENT_PENDING,
    QUOTED,
    READY,
    SIMULATED_CREDITED,
    InvalidTransferTransition,
    assert_transition,
)


def test_preparation_transitions():
    assert_transition(DRAFT, QUOTED)
    assert_transition(QUOTED, READY)
    assert_transition(QUOTED, DRAFT)
    assert_transition(READY, DRAFT)
    assert_transition(READY, QUOTED)


def test_public_api_cannot_settle():
    with pytest.raises(InvalidTransferTransition):
        assert_transition(READY, PAYMENT_PENDING, internal=False)
    with pytest.raises(InvalidTransferTransition):
        assert_transition(READY, LIGHTNING_SETTLED, internal=False)
    with pytest.raises(InvalidTransferTransition):
        assert_transition(DRAFT, SIMULATED_CREDITED, internal=False)


def test_internal_settlement_reserved_for_b2():
    assert_transition(READY, PAYMENT_PENDING, internal=True)
    assert_transition(PAYMENT_PENDING, LIGHTNING_SETTLED, internal=True)
    assert_transition(LIGHTNING_SETTLED, SIMULATED_CREDITED, internal=True)
    with pytest.raises(InvalidTransferTransition):
        assert_transition(SIMULATED_CREDITED, DRAFT, internal=True)
