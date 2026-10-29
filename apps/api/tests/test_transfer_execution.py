from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError

from smartpay.payments.models import Payment
from smartpay.transfers.execution import LightningPorts, confirm_execution, preview_execution, reconcile_execution
from smartpay.transfers.models import SimulatedMobileMoneyCredit, Transfer
from smartpay.transfers.services import apply_quote, create_draft, mark_ready, validate_beneficiary
from smartpay.transfers.state import FAILED, LIGHTNING_SETTLED, PENDING_RECONCILIATION, READY, SIMULATED_CREDITED
from tests.fake_lightning import FakeRegtestNetwork


def _ready_transfer(user, amount=50_000):
    transfer, _ = create_draft(
        user=user,
        data={
            "destination_country": "CI",
            "operator": "wave",
            "beneficiary_name": "Awa Koné",
            "phone_number": "07458912",
            "reason": "Soutien familial",
            "amount_local": amount,
        },
        idempotency_key=f"ready-{user.id}-{amount}",
    )
    validate_beneficiary(
        transfer,
        {
            "operator": "wave",
            "beneficiary_name": "Awa Koné",
            "phone_number": "07458912",
        },
        actor=user,
    )
    transfer = apply_quote(transfer, actor=user)
    return mark_ready(transfer, actor=user)


def _ports(network: FakeRegtestNetwork) -> LightningPorts:
    return LightningPorts(alice=network.alice, bob=network.bob, allow_fake=True)


@pytest.mark.django_db
def test_ready_success_credits_only_after_lookups(user):
    network = FakeRegtestNetwork()
    transfer = _ready_transfer(user)
    assert transfer.amount_sats == 115_473
    assert transfer.fee_sats == 1
    preview = preview_execution(transfer, ports=_ports(network))
    assert preview["can_execute"] is True
    assert preview["invoice_amount_sats"] == 115_473
    assert network.send_calls == 0
    result = confirm_execution(
        transfer,
        actor=user,
        idempotency_key="exec-1",
        ports=_ports(network),
    )
    assert result.status == SIMULATED_CREDITED
    assert result.lightning_settled_at is not None
    assert result.lnd_fee_sats_paid == 3
    assert result.total_debited_sats == 115_473 + 3
    assert result.invoice_amount_sats == 115_473
    assert result.fee_sats == 1
    credit = SimulatedMobileMoneyCredit.objects.get(transfer=result)
    assert credit.amount_local == 50_000
    assert "07458912" not in credit.disclaimer
    assert network.send_calls == 1
    attempt = result.attempts.get()
    assert "Awa" not in attempt.encoded_invoice
    assert attempt.encoded_invoice.startswith("lnbcrt")


@pytest.mark.django_db
def test_expired_quote_is_rejected(user):
    network = FakeRegtestNetwork()
    transfer = _ready_transfer(user)
    transfer.quote_expires_at = timezone.now() - timedelta(seconds=1)
    transfer.save(update_fields=["quote_expires_at"])
    with pytest.raises(ValidationError, match="Devis"):
        confirm_execution(transfer, actor=user, idempotency_key="exp", ports=_ports(network))
    transfer.refresh_from_db()
    assert transfer.status == READY
    assert network.send_calls == 0


@pytest.mark.django_db
def test_insufficient_balance(user):
    network = FakeRegtestNetwork()
    network.alice.balance = 10
    transfer = _ready_transfer(user)
    with pytest.raises(ValidationError, match="Solde"):
        confirm_execution(transfer, actor=user, idempotency_key="bal", ports=_ports(network))
    assert network.send_calls == 0
    assert SimulatedMobileMoneyCredit.objects.count() == 0


@pytest.mark.django_db
def test_incorrect_invoice_amount(user):
    network = FakeRegtestNetwork()
    transfer = _ready_transfer(user)
    original = network.bob.create_invoice

    def wrong_invoice(**kwargs):
        draft = original(**kwargs)
        network.invoices[draft.payment_hash]["amount_sats"] = 1
        return draft

    network.bob.create_invoice = wrong_invoice
    with pytest.raises(ValidationError, match="montant"):
        confirm_execution(transfer, actor=user, idempotency_key="amt", ports=_ports(network))
    assert network.send_calls == 0


@pytest.mark.django_db
def test_expired_invoice(user):
    network = FakeRegtestNetwork()
    transfer = _ready_transfer(user)
    original = network.bob.create_invoice

    def expired_invoice(**kwargs):
        draft = original(**kwargs)
        network.invoices[draft.payment_hash]["expires_at"] = timezone.now() - timedelta(seconds=1)
        return draft

    network.bob.create_invoice = expired_invoice
    with pytest.raises(ValidationError, match="expir"):
        confirm_execution(transfer, actor=user, idempotency_key="invexp", ports=_ports(network))
    assert network.send_calls == 0


@pytest.mark.django_db
def test_payment_refused(user):
    network = FakeRegtestNetwork()
    network.pay_behavior = "refused"
    transfer = _ready_transfer(user)
    confirm_execution(transfer, actor=user, idempotency_key="refused", ports=_ports(network))
    transfer.refresh_from_db()
    assert transfer.status == FAILED
    assert SimulatedMobileMoneyCredit.objects.count() == 0
    assert network.send_calls == 1


@pytest.mark.django_db
def test_uncertain_network_does_not_repay(user):
    network = FakeRegtestNetwork()
    network.pay_behavior = "unavailable"
    transfer = _ready_transfer(user)
    confirm_execution(transfer, actor=user, idempotency_key="unc", ports=_ports(network))
    transfer.refresh_from_db()
    assert transfer.status == PENDING_RECONCILIATION
    assert network.send_calls == 1
    network.pay_behavior = "succeed"
    confirm_execution(transfer, actor=user, idempotency_key="unc", ports=_ports(network))
    transfer.refresh_from_db()
    assert network.send_calls == 1
    assert transfer.status == PENDING_RECONCILIATION


@pytest.mark.django_db
def test_double_click_and_concurrent_guard(user):
    network = FakeRegtestNetwork()
    transfer = _ready_transfer(user)
    first = confirm_execution(transfer, actor=user, idempotency_key="dup", ports=_ports(network))
    second = confirm_execution(transfer, actor=user, idempotency_key="dup", ports=_ports(network))
    third = confirm_execution(transfer, actor=user, idempotency_key="other", ports=_ports(network))
    assert first.status == SIMULATED_CREDITED
    assert second.status == SIMULATED_CREDITED
    assert third.status == SIMULATED_CREDITED
    assert network.send_calls == 1
    assert SimulatedMobileMoneyCredit.objects.filter(transfer=first).count() == 1


@pytest.mark.django_db
def test_restart_after_payment_looks_up_without_resend(user):
    network = FakeRegtestNetwork()
    transfer = _ready_transfer(user)
    confirm_execution(transfer, actor=user, idempotency_key="rst", ports=_ports(network))
    transfer.refresh_from_db()
    attempt = transfer.attempts.get()
    transfer.status = LIGHTNING_SETTLED
    transfer.mobile_money_credit_status = Transfer.CreditStatus.NONE
    transfer.simulated_credit_reference = ""
    transfer.save()
    SimulatedMobileMoneyCredit.objects.filter(transfer=transfer).delete()
    attempt.status = attempt.Status.SETTLED
    attempt.save()
    confirm_execution(transfer, actor=user, idempotency_key="rst", ports=_ports(network))
    transfer.refresh_from_db()
    assert network.send_calls == 1
    assert transfer.status == SIMULATED_CREDITED


@pytest.mark.django_db
def test_credit_failure_keeps_lightning_settled(user):
    network = FakeRegtestNetwork()
    transfer = _ready_transfer(user)
    result = confirm_execution(
        transfer,
        actor=user,
        idempotency_key="cred-fail",
        ports=_ports(network),
        fail_credit=True,
    )
    assert result.status == LIGHTNING_SETTLED
    assert result.mobile_money_credit_status == Transfer.CreditStatus.FAILED
    assert SimulatedMobileMoneyCredit.objects.count() == 0
    recovered = confirm_execution(
        transfer,
        actor=user,
        idempotency_key="cred-fail",
        ports=_ports(network),
        fail_credit=False,
    )
    assert recovered.status == SIMULATED_CREDITED


@pytest.mark.django_db
def test_no_credit_without_settlement(user):
    network = FakeRegtestNetwork()
    network.pay_behavior = "in_flight"
    transfer = _ready_transfer(user)
    confirm_execution(transfer, actor=user, idempotency_key="pend", ports=_ports(network))
    transfer.refresh_from_db()
    assert transfer.status != SIMULATED_CREDITED
    assert SimulatedMobileMoneyCredit.objects.count() == 0
    assert transfer.lightning_settled_at is None


@pytest.mark.django_db
def test_isolation_and_mock_provider_does_not_pay(auth_client, user, other_user, api_client):
    transfer = _ready_transfer(user)
    listed = auth_client.get(f"/api/v1/transfers/{transfer.id}/preview-payment/")
    assert listed.status_code == status.HTTP_200_OK
    assert listed.data["can_execute"] is False
    denied = auth_client.post(
        f"/api/v1/transfers/{transfer.id}/confirm/",
        {},
        format="json",
        HTTP_IDEMPOTENCY_KEY="no-lnd",
    )
    assert denied.status_code == status.HTTP_400_BAD_REQUEST
    assert Payment.objects.filter(direction=Payment.Direction.OUTGOING).count() == 0
    api_client.force_authenticate(user=other_user)
    other = api_client.post(
        f"/api/v1/transfers/{transfer.id}/confirm/",
        {},
        format="json",
        HTTP_IDEMPOTENCY_KEY="iso",
    )
    assert other.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_reconcile_forbidden_for_owner(api_client, user):
    transfer = _ready_transfer(user)
    api_client.force_authenticate(user=user)
    forbidden = api_client.post(f"/api/v1/transfers/{transfer.id}/reconcile/", {}, format="json")
    assert forbidden.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_reconcile_admin_without_attempt(admin_client, user):
    transfer = _ready_transfer(user)
    allowed = admin_client.post(f"/api/v1/transfers/{transfer.id}/reconcile/", {}, format="json")
    assert allowed.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_result_endpoint_and_in_flight_reconcile(user):
    network = FakeRegtestNetwork()
    network.pay_behavior = "in_flight"
    transfer = _ready_transfer(user)
    confirm_execution(transfer, actor=user, idempotency_key="rec", ports=_ports(network))
    network.invoices[transfer.attempts.get().payment_hash]["settled"] = True
    network.payments[transfer.attempts.get().payment_hash] = {
        "status": "SUCCEEDED",
        "amount_sats": 115_473,
        "fee_sats": 3,
    }
    updated = reconcile_execution(transfer, actor=user, ports=_ports(network))
    assert updated.status == SIMULATED_CREDITED
    assert updated.lightning_payment_hash
    payload = preview_execution(updated, ports=_ports(network))
    assert payload["can_execute"] is False
