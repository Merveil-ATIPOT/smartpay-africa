from __future__ import annotations

import logging

from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError

from smartpay.audit.models import AuditLog
from smartpay.payments.models import Payment, PaymentInvoice
from smartpay.payments.providers import get_payment_provider
from smartpay.payments.state import transition

logger = logging.getLogger("smartpay.payments")


def _client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def resolve_idempotency_key(request, payload_key: str = "") -> str:
    header = ""
    if request is not None:
        header = request.headers.get("Idempotency-Key", "") or request.META.get(
            "HTTP_IDEMPOTENCY_KEY", ""
        )
    return (header or payload_key or "").strip()


@transaction.atomic
def create_invoice(*, user, amount_sats: int, memo: str = "", expiry_seconds: int = 3600, request=None) -> Payment:
    if amount_sats < 1 or amount_sats > settings.MAX_PAYMENT_AMOUNT_SATS:
        raise ValidationError({"amount_sats": "Montant en satoshis hors limites."})
    provider = get_payment_provider()
    draft = provider.create_invoice(
        amount_sats=amount_sats,
        memo=memo,
        expiry_seconds=expiry_seconds,
    )
    payment = Payment.objects.create(
        owner=user,
        amount_sats=amount_sats,
        description=memo,
        status=Payment.Status.CREATED,
        settlement_mode=Payment.SettlementMode.MOCK,
        is_lightning_settled=False,
        network=Payment.Network.REGTEST,
        direction=Payment.Direction.INCOMING,
        provider_reference=draft.provider_reference,
        expires_at=draft.expires_at,
    )
    PaymentInvoice.objects.create(
        payment=payment,
        encoded_invoice=draft.encoded_invoice,
        payment_hash=draft.payment_hash,
        memo=memo,
        expires_at=draft.expires_at,
        is_mock=True,
    )
    transition(payment, Payment.Status.PENDING)
    AuditLog.record(
        actor=user,
        action="payment.invoice_created",
        resource_type="payment",
        resource_id=str(payment.id),
        metadata={
            "amount_sats": amount_sats,
            "settlement_mode": payment.settlement_mode,
            "is_lightning_settled": False,
        },
        ip_address=_client_ip(request),
    )
    logger.info(
        "invoice_created payment_id=%s amount_sats=%s settlement_mode=mock lightning=false",
        payment.id,
        amount_sats,
    )
    return payment


@transaction.atomic
def create_outgoing_payment(
    *,
    user,
    amount_sats: int,
    description: str = "",
    merchant=None,
    idempotency_key: str = "",
    request=None,
) -> tuple[Payment, bool]:
    if amount_sats < 1 or amount_sats > settings.MAX_PAYMENT_AMOUNT_SATS:
        raise ValidationError({"amount_sats": "Montant en satoshis hors limites."})
    if not idempotency_key:
        raise ValidationError({"idempotency_key": "La clé d'idempotence est obligatoire."})

    existing = Payment.objects.filter(owner=user, idempotency_key=idempotency_key).first()
    if existing:
        return existing, False

    payment = Payment.objects.create(
        owner=user,
        merchant=merchant,
        amount_sats=amount_sats,
        description=description,
        status=Payment.Status.CREATED,
        settlement_mode=Payment.SettlementMode.MOCK,
        is_lightning_settled=False,
        network=Payment.Network.REGTEST,
        direction=Payment.Direction.OUTGOING,
        idempotency_key=idempotency_key,
        provider_reference=f"mock_pay_{idempotency_key[:24]}",
    )
    transition(payment, Payment.Status.PENDING)
    AuditLog.record(
        actor=user,
        action="payment.created",
        resource_type="payment",
        resource_id=str(payment.id),
        metadata={
            "amount_sats": amount_sats,
            "settlement_mode": "mock",
            "is_lightning_settled": False,
            "idempotent": False,
        },
        ip_address=_client_ip(request),
    )
    logger.info(
        "payment_created payment_id=%s amount_sats=%s settlement_mode=mock lightning=false",
        payment.id,
        amount_sats,
    )
    return payment, True
