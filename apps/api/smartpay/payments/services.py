from __future__ import annotations

import logging
import time
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from smartpay.audit.models import AuditLog
from smartpay.payments.models import Payment, PaymentInvoice
from smartpay.payments.providers import get_payment_provider
from smartpay.payments.providers.errors import LndError, LndInvoiceError, LndPaymentError, LndUnavailable
from smartpay.payments.reconciliation import reconcile_payment
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


def _settlement_mode(provider) -> str:
    return getattr(provider, "settlement_mode", "mock")


@transaction.atomic
def create_invoice(*, user, amount_sats: int, memo: str = "", expiry_seconds: int = 3600, request=None) -> Payment:
    if amount_sats < 1 or amount_sats > settings.MAX_PAYMENT_AMOUNT_SATS:
        raise ValidationError({"amount_sats": "Montant en satoshis hors limites."})
    provider = get_payment_provider()
    try:
        draft = provider.create_invoice(
            amount_sats=amount_sats,
            memo=memo,
            expiry_seconds=expiry_seconds,
        )
    except LndUnavailable as exc:
        raise ValidationError({"lightning": str(exc)}) from exc
    except LndError as exc:
        raise ValidationError({"invoice": str(exc)}) from exc

    mode = draft.settlement_mode
    payment = Payment.objects.create(
        owner=user,
        amount_sats=amount_sats,
        description=memo,
        status=Payment.Status.CREATED,
        settlement_mode=mode,
        is_lightning_settled=False,
        network=Payment.Network.REGTEST,
        direction=Payment.Direction.INCOMING,
        provider_reference=draft.provider_reference,
        encoded_invoice=draft.encoded_invoice,
        expires_at=draft.expires_at,
    )
    PaymentInvoice.objects.create(
        payment=payment,
        encoded_invoice=draft.encoded_invoice,
        payment_hash=draft.payment_hash,
        memo=memo,
        expires_at=draft.expires_at,
        is_mock=draft.is_mock,
    )
    transition(payment, Payment.Status.PENDING)
    AuditLog.record(
        actor=user,
        action="payment.invoice_created",
        resource_type="payment",
        resource_id=str(payment.id),
        metadata={
            "amount_sats": amount_sats,
            "settlement_mode": mode,
            "is_lightning_settled": False,
        },
        ip_address=_client_ip(request),
    )
    logger.info(
        "invoice_created payment_id=%s amount_sats=%s settlement_mode=%s lightning=false",
        payment.id,
        amount_sats,
        mode,
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
    encoded_invoice: str = "",
    request=None,
) -> tuple[Payment, bool]:
    if amount_sats < 1 or amount_sats > settings.MAX_PAYMENT_AMOUNT_SATS:
        raise ValidationError({"amount_sats": "Montant en satoshis hors limites."})
    if not idempotency_key:
        raise ValidationError({"idempotency_key": "La clé d'idempotence est obligatoire."})

    existing = Payment.objects.filter(owner=user, idempotency_key=idempotency_key).first()
    if existing:
        return reconcile_payment(existing), False

    provider = get_payment_provider()
    mode = _settlement_mode(provider)
    payment_hash = ""
    expires_at = None

    if encoded_invoice:
        try:
            decoded = provider.decode_invoice(encoded_invoice)
        except LndInvoiceError as exc:
            raise ValidationError({"encoded_invoice": str(exc)}) from exc
        except LndUnavailable as exc:
            raise ValidationError({"lightning": str(exc)}) from exc
        if decoded.amount_sats and decoded.amount_sats != amount_sats:
            raise ValidationError({"amount_sats": "Montant différent de la facture BOLT11."})
        local_pubkey = ""
        try:
            local_pubkey = provider.get_node_info().pubkey or ""
        except (LndUnavailable, LndError):
            local_pubkey = ""
        if local_pubkey and decoded.destination and decoded.destination == local_pubkey:
            raise ValidationError(
                {
                    "encoded_invoice": (
                        "Cette facture a été émise par le nœud payeur (Alice). "
                        "Un paiement Alice → Alice n'est pas un transfert Alice → Bob. "
                        "Utilisez une facture de la contrepartie Bob."
                    )
                }
            )
        payment_hash = decoded.payment_hash
        duplicate = Payment.objects.filter(
            provider_reference=payment_hash,
            settlement_mode=Payment.SettlementMode.LIGHTNING_REGTEST,
        ).exclude(provider_reference="").first()
        if duplicate:
            return reconcile_payment(duplicate), False
        if decoded.expiry_seconds:
            expires_at = timezone.now() + timedelta(seconds=decoded.expiry_seconds)

    if mode == Payment.SettlementMode.LIGHTNING_REGTEST and not encoded_invoice:
        raise ValidationError(
            {"encoded_invoice": "Une facture BOLT11 est obligatoire pour un paiement LND Regtest."}
        )

    payment = Payment.objects.create(
        owner=user,
        merchant=merchant,
        amount_sats=amount_sats,
        description=description,
        status=Payment.Status.CREATED,
        settlement_mode=mode,
        is_lightning_settled=False,
        network=Payment.Network.REGTEST,
        direction=Payment.Direction.OUTGOING,
        idempotency_key=idempotency_key,
        provider_reference=payment_hash or f"mock_pay_{idempotency_key[:24]}",
        encoded_invoice=encoded_invoice,
        expires_at=expires_at,
    )
    transition(payment, Payment.Status.PENDING)
    AuditLog.record(
        actor=user,
        action="payment.created",
        resource_type="payment",
        resource_id=str(payment.id),
        metadata={
            "amount_sats": amount_sats,
            "settlement_mode": mode,
            "is_lightning_settled": False,
            "idempotent": False,
        },
        ip_address=_client_ip(request),
    )
    logger.info(
        "payment_created payment_id=%s amount_sats=%s settlement_mode=%s lightning=false",
        payment.id,
        amount_sats,
        mode,
    )

    if encoded_invoice and mode == Payment.SettlementMode.LIGHTNING_REGTEST:
        try:
            sent_hash = provider.send_payment(
                encoded_invoice=encoded_invoice,
                timeout_seconds=int(getattr(settings, "LND_TIMEOUT_SECONDS", 30)),
            )
            if sent_hash:
                payment.provider_reference = sent_hash
                payment.save(update_fields=["provider_reference", "updated_at"])
        except (LndUnavailable, LndPaymentError, LndError) as exc:
            transition(payment, Payment.Status.FAILED, failure_reason=str(exc)[:255])
            logger.info("payment_send_failed payment_id=%s", payment.id)
            return payment, True
        payment = _wait_for_lightning_lookup(payment)
    return payment, True


def _wait_for_lightning_lookup(payment: Payment) -> Payment:
    attempts = max(1, int(getattr(settings, "LND_LOOKUP_RETRY_ATTEMPTS", 8)))
    delay = float(getattr(settings, "LND_LOOKUP_RETRY_DELAY_SECONDS", 0.4))
    last = payment
    for index in range(attempts):
        last = reconcile_payment(last)
        if last.is_lightning_settled or last.status in {
            Payment.Status.FAILED,
            Payment.Status.EXPIRED,
            Payment.Status.CONFIRMED,
        }:
            return last
        if index + 1 < attempts and delay > 0:
            time.sleep(delay)
    return last
