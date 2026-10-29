"""Machine à états des paiements."""

from __future__ import annotations

from smartpay.core.exceptions import DomainError
from smartpay.payments.models import Payment

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    Payment.Status.CREATED: {Payment.Status.PENDING, Payment.Status.FAILED, Payment.Status.EXPIRED},
    Payment.Status.PENDING: {Payment.Status.CONFIRMED, Payment.Status.FAILED, Payment.Status.EXPIRED},
    Payment.Status.CONFIRMED: set(),
    Payment.Status.FAILED: set(),
    Payment.Status.EXPIRED: set(),
}


class InvalidPaymentTransition(DomainError):
    pass


def transition(
    payment: Payment,
    new_status: str,
    *,
    lightning_settled: bool = False,
    failure_reason: str = "",
) -> Payment:
    current = payment.status
    if new_status not in ALLOWED_TRANSITIONS.get(current, set()):
        raise InvalidPaymentTransition(
            f"Transition interdite: {current} -> {new_status}"
        )
    if lightning_settled:
        if payment.settlement_mode == Payment.SettlementMode.MOCK:
            raise InvalidPaymentTransition(
                "Un paiement Mock ne peut pas être marqué comme règlement Lightning."
            )
        if payment.settlement_mode != Payment.SettlementMode.LIGHTNING_REGTEST:
            raise InvalidPaymentTransition("Réseau Lightning non autorisé pour ce paiement.")
    payment.status = new_status
    payment.is_lightning_settled = bool(lightning_settled)
    if failure_reason:
        payment.failure_reason = failure_reason
    payment.save(
        update_fields=["status", "is_lightning_settled", "failure_reason", "updated_at"]
    )
    return payment
