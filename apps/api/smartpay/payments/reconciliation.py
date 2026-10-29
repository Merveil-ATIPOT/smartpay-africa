"""Réconciliation des paiements Lightning. Un HTTP 200 n'est jamais une preuve de règlement."""

from __future__ import annotations

import logging

from django.utils import timezone

from smartpay.audit.models import AuditLog
from smartpay.payments.models import Payment
from smartpay.payments.providers import get_payment_provider
from smartpay.payments.providers.base import LookupResult
from smartpay.payments.state import InvalidPaymentTransition, transition

logger = logging.getLogger("smartpay.payments")


def _lookup(payment: Payment, provider) -> LookupResult:
    if payment.direction == Payment.Direction.INCOMING:
        return provider.lookup_invoice(payment.provider_reference)
    return provider.lookup_payment(payment.provider_reference)


def reconcile_payment(payment: Payment) -> Payment:
    if payment.settlement_mode == Payment.SettlementMode.MOCK:
        if payment.expires_at and payment.expires_at <= timezone.now() and payment.status == Payment.Status.PENDING:
            return transition(payment, Payment.Status.EXPIRED, failure_reason="expired")
        return payment

    if payment.status in {Payment.Status.CONFIRMED, Payment.Status.FAILED, Payment.Status.EXPIRED}:
        return payment

    if payment.expires_at and payment.expires_at <= timezone.now() and not payment.is_lightning_settled:
        try:
            return transition(payment, Payment.Status.EXPIRED, failure_reason="invoice_expired")
        except InvalidPaymentTransition:
            return payment

    provider = get_payment_provider()
    if provider.name != "lnd_regtest":
        return payment

    result = _lookup(payment, provider)
    if result.settled:
        updated = transition(
            payment,
            Payment.Status.CONFIRMED,
            lightning_settled=True,
        )
        AuditLog.record(
            actor=None,
            action="payment.lightning_settled",
            resource_type="payment",
            resource_id=str(payment.id),
            metadata={"status": result.status, "settlement_mode": "lightning_regtest"},
        )
        logger.info(
            "payment_settled payment_id=%s status=%s lightning=true",
            payment.id,
            result.status,
        )
        return updated
    if result.failure_reason or result.status in {"FAILED", "FAILURE", "CANCELED"}:
        return transition(
            payment,
            Payment.Status.FAILED,
            failure_reason=result.failure_reason or result.status,
        )
    logger.info(
        "payment_unsettled payment_id=%s lookup_status=%s found=%s",
        payment.id,
        result.status,
        result.found,
    )
    return payment
