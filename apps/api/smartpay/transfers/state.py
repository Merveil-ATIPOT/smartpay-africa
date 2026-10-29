"""Machine à états du transfert international.

Les transitions de règlement (paiement LND, crédit simulé) existent pour B2
mais restent inaccessibles aux endpoints publics de B1.
"""

from __future__ import annotations

from smartpay.core.exceptions import DomainError

DRAFT = "draft"
QUOTED = "quoted"
READY = "ready"
PAYMENT_PENDING = "payment_pending"
LIGHTNING_SETTLED = "lightning_settled"
SIMULATED_CREDITED = "simulated_credited"
FAILED = "failed"
PENDING_RECONCILIATION = "pending_reconciliation"

PREPARATION_STATUSES = frozenset({DRAFT, QUOTED, READY, FAILED})
SETTLEMENT_STATUSES = frozenset(
    {PAYMENT_PENDING, LIGHTNING_SETTLED, SIMULATED_CREDITED, PENDING_RECONCILIATION}
)

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    DRAFT: {QUOTED, FAILED},
    QUOTED: {DRAFT, QUOTED, READY, FAILED},
    READY: {DRAFT, QUOTED, FAILED, PAYMENT_PENDING},
    PAYMENT_PENDING: {LIGHTNING_SETTLED, FAILED, PENDING_RECONCILIATION},
    LIGHTNING_SETTLED: {SIMULATED_CREDITED, FAILED, PENDING_RECONCILIATION},
    SIMULATED_CREDITED: set(),
    FAILED: set(),
    PENDING_RECONCILIATION: {LIGHTNING_SETTLED, FAILED, SIMULATED_CREDITED},
}

PUBLIC_TRANSITIONS: dict[str, set[str]] = {
    DRAFT: {QUOTED, FAILED},
    QUOTED: {DRAFT, QUOTED, READY, FAILED},
    READY: {DRAFT, QUOTED, FAILED},
}


class InvalidTransferTransition(DomainError):
    pass


def assert_transition(current: str, new_status: str, *, internal: bool = False) -> None:
    table = ALLOWED_TRANSITIONS if internal else PUBLIC_TRANSITIONS
    allowed = table.get(current, set())
    if new_status == current:
        return
    if new_status not in allowed:
        raise InvalidTransferTransition(f"Transition interdite: {current} -> {new_status}")
    if not internal and new_status in SETTLEMENT_STATUSES:
        raise InvalidTransferTransition("Les statuts de règlement ne sont pas accessibles via une modification client.")
