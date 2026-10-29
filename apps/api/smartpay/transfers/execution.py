"""Orchestration Lightning Regtest + crédit Mobile Money simulé.

Aucun appel Wave / Orange / MTN. Un HTTP 200 n'est jamais une preuve de règlement.
Les transactions PostgreSQL ne restent pas ouvertes pendant un appel LND.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from smartpay.payments.models import Payment
from smartpay.payments.providers import get_lab_counterparty_provider, get_payment_provider
from smartpay.payments.providers.errors import LndError, LndInvoiceError, LndPaymentError, LndUnavailable
from smartpay.payments.reconciliation import reconcile_payment
from smartpay.payments.state import transition as transition_payment
from smartpay.transfers.models import CREDIT_DISCLAIMER, SimulatedMobileMoneyCredit, Transfer, TransferAttempt
from smartpay.transfers.services import _audit, quote_is_current
from smartpay.transfers.state import (
    FAILED,
    LIGHTNING_SETTLED,
    PAYMENT_PENDING,
    PENDING_RECONCILIATION,
    READY,
    SIMULATED_CREDITED,
    InvalidTransferTransition,
    assert_transition,
)

logger = logging.getLogger("smartpay.transfers")

INVOICE_MEMO_PREFIX = "SPA"


@dataclass(frozen=True)
class LightningPorts:
    alice: object
    bob: object
    allow_fake: bool = False


def production_ports() -> LightningPorts:
    if getattr(settings, "BITCOIN_NETWORK", "regtest") != "regtest":
        raise ValidationError({"network": "Seuls les paiements Bitcoin Regtest sont autorisés."})
    alice = get_payment_provider()
    bob = get_lab_counterparty_provider()
    if alice.name != "lnd_regtest" or bob is None:
        raise ValidationError(
            {
                "lightning": (
                    "Exécution indisponible : Alice LND Regtest et la contrepartie Bob sont requises. "
                    "Le fournisseur Mock ne déclenche aucun paiement de corridor."
                )
            }
        )
    return LightningPorts(alice=alice, bob=bob)


def _transition(transfer: Transfer, new_status: str) -> None:
    try:
        assert_transition(transfer.status, new_status, internal=True)
    except InvalidTransferTransition as exc:
        raise ValidationError({"status": str(exc)}) from exc
    transfer.status = new_status


def _save_transfer(transfer: Transfer, fields: list[str]) -> None:
    transfer.save(update_fields=[*fields, "updated_at"])


def preview_execution(transfer: Transfer, *, ports: LightningPorts | None = None) -> dict:
    """Prévisualisation. Ne crée aucun paiement et n'appelle pas send_payment."""
    invoice_amount = int(transfer.amount_sats)
    demo_fee = int(transfer.fee_sats)
    estimated = int(transfer.lnd_fee_sats_estimated)
    balance = 0
    connected = False
    can_execute = False
    warnings = [
        "Cette prévisualisation ne déclenche aucun paiement Lightning.",
        "fee_sats est un frais de démonstration B1, distinct des frais réseau LND.",
    ]
    try:
        ports = ports or production_ports()
        info = ports.alice.get_node_info()
        connected = bool(info.connected)
        balance = int(ports.alice.get_channel_balance_sats())
        can_execute = transfer.status == READY and quote_is_current(transfer)
        if invoice_amount and balance < invoice_amount:
            can_execute = False
            warnings.append("Solde de canal insuffisant pour le montant principal.")
    except ValidationError as exc:
        warnings.append(str(exc.detail.get("lightning") if isinstance(exc.detail, dict) else exc.detail))
        can_execute = False

    if transfer.status != READY:
        can_execute = False
        if transfer.status in {LIGHTNING_SETTLED, SIMULATED_CREDITED, PAYMENT_PENDING, PENDING_RECONCILIATION}:
            warnings.append("Le transfert a déjà une exécution en cours ou terminée.")
    elif not quote_is_current(transfer):
        can_execute = False
        warnings.append("Devis expiré ou incompatible. Recalculez le devis avant confirmation.")

    return {
        "transfer_id": str(transfer.id),
        "public_reference": transfer.public_reference,
        "status": transfer.status,
        "amount_local": int(transfer.amount_local),
        "currency": transfer.currency,
        "invoice_amount_sats": invoice_amount,
        "demo_fee_sats": demo_fee,
        "indicative_total_sats": invoice_amount + demo_fee,
        "lnd_fee_sats_estimated": estimated,
        "lnd_fee_estimate_available": estimated > 0,
        "lnd_fee_sats_paid": transfer.lnd_fee_sats_paid,
        "channel_balance_sats": balance,
        "lightning_connected": connected,
        "can_execute": can_execute,
        "execution_mode": transfer.execution_mode,
        "warnings": warnings,
    }


def confirm_execution(
    transfer: Transfer,
    *,
    actor,
    idempotency_key: str,
    request=None,
    ports: LightningPorts | None = None,
    fail_credit: bool = False,
) -> Transfer:
    if not idempotency_key:
        raise ValidationError({"idempotency_key": "Une clé d'idempotence est obligatoire pour confirmer."})
    ports = ports or production_ports()
    if getattr(ports.alice, "name", "") == "mock" or getattr(ports.bob, "name", "") == "mock":
        raise ValidationError({"lightning": "Le fournisseur Mock ne déclenche aucun paiement de corridor."})

    action, attempt_id = _lock_and_plan(transfer.id, actor, idempotency_key, ports, request)
    transfer = Transfer.objects.get(pk=transfer.id)
    if action == "done" or attempt_id is None:
        return transfer
    attempt = TransferAttempt.objects.get(pk=attempt_id)
    if action == "prepare_then_pay":
        _prepare_bob_invoice(attempt, ports)
        attempt.refresh_from_db()
        _pay_alice_once(attempt, ports, actor, request)
        attempt.refresh_from_db()
    _verify_lookups(attempt, ports, actor, request, fail_credit=fail_credit)
    return Transfer.objects.get(pk=transfer.id)


def reconcile_execution(
    transfer: Transfer,
    *,
    actor,
    request=None,
    ports: LightningPorts | None = None,
    fail_credit: bool = False,
) -> Transfer:
    ports = ports or production_ports()
    attempt = transfer.attempts.order_by("-created_at").first()
    if attempt is None:
        raise ValidationError({"attempt": "Aucune tentative d'exécution à rapprocher."})
    _verify_lookups(attempt, ports, actor, request, fail_credit=fail_credit)
    return Transfer.objects.get(pk=transfer.id)


def _lock_and_plan(transfer_id, actor, idempotency_key, ports: LightningPorts, request) -> tuple[str, uuid.UUID | None]:
    with transaction.atomic():
        transfer = Transfer.objects.select_for_update().get(pk=transfer_id)
        existing = transfer.attempts.filter(idempotency_key=idempotency_key).first()
        if transfer.status in {SIMULATED_CREDITED, LIGHTNING_SETTLED}:
            latest = existing or transfer.attempts.order_by("-created_at").first()
            return "done" if transfer.status == SIMULATED_CREDITED else "lookup_only", latest.id if latest else None
        if transfer.status == FAILED:
            raise ValidationError({"status": "Ce transfert est en échec confirmé et ne peut pas être relancé automatiquement."})
        if transfer.status in {PAYMENT_PENDING, PENDING_RECONCILIATION}:
            latest = existing or transfer.attempts.order_by("-created_at").first()
            if latest is None:
                raise ValidationError({"attempt": "Exécution en cours sans tentative enregistrée."})
            return "lookup_only", latest.id
        if transfer.status != READY:
            raise ValidationError({"status": "Le transfert doit être READY pour être confirmé."})
        if not quote_is_current(transfer):
            raise ValidationError({"quote": "Devis expiré ou incompatible. Recalculez le devis côté serveur."})
        invoice_amount = int(transfer.amount_sats)
        if invoice_amount < 1 or invoice_amount > settings.MAX_PAYMENT_AMOUNT_SATS:
            raise ValidationError({"amount_sats": "Montant principal hors limites."})
        try:
            balance = int(ports.alice.get_channel_balance_sats())
        except (LndUnavailable, LndError) as exc:
            raise ValidationError({"lightning": str(exc)}) from exc
        if balance < invoice_amount:
            raise ValidationError({"balance": "Solde de canal insuffisant pour le montant principal."})
        if existing:
            return "prepare_then_pay", existing.id
        attempt = TransferAttempt.objects.create(
            transfer=transfer,
            idempotency_key=idempotency_key,
            invoice_amount_sats=invoice_amount,
            demo_fee_sats=int(transfer.fee_sats),
            estimated_routing_fee_sats=0,
            status=TransferAttempt.Status.PREPARED,
        )
        transfer.invoice_amount_sats = invoice_amount
        _transition(transfer, PAYMENT_PENDING)
        _save_transfer(transfer, ["invoice_amount_sats", "status"])
        _audit(
            transfer,
            "transfer.status_changed",
            actor=actor,
            request=request,
            extra={"from_status": READY, "to_status": PAYMENT_PENDING, "attempt_id": str(attempt.id)},
        )
        logger.info("transfer.execution_planned id=%s attempt=%s", transfer.id, attempt.id)
        return "prepare_then_pay", attempt.id


def _prepare_bob_invoice(attempt: TransferAttempt, ports: LightningPorts) -> None:
    if attempt.encoded_invoice and attempt.payment_hash:
        return
    expiry = int(getattr(settings, "TRANSFER_INVOICE_EXPIRY_SECONDS", 600))
    memo = f"{INVOICE_MEMO_PREFIX} {attempt.transfer.public_reference}"
    try:
        draft = ports.bob.create_invoice(
            amount_sats=attempt.invoice_amount_sats,
            memo=memo,
            expiry_seconds=expiry,
        )
    except (LndUnavailable, LndInvoiceError, LndError) as exc:
        _fail_attempt(attempt, f"facture_bob:{exc}", transfer_status=FAILED)
        raise ValidationError({"invoice": str(exc)}) from exc
    if not (draft.encoded_invoice or "").startswith("lnbcrt"):
        _fail_attempt(attempt, "facture_non_regtest", transfer_status=FAILED)
        raise ValidationError({"invoice": "La facture Bob n'est pas une BOLT11 Regtest."})
    estimated = 0
    try:
        preview = ports.alice.preview(
            amount_sats=attempt.invoice_amount_sats,
            encoded_invoice=draft.encoded_invoice,
        )
        estimated = int(preview.fee_sats or 0)
    except (LndUnavailable, LndInvoiceError, LndError):
        estimated = 0
    with transaction.atomic():
        locked = TransferAttempt.objects.select_for_update().get(pk=attempt.id)
        if locked.encoded_invoice:
            return
        locked.encoded_invoice = draft.encoded_invoice
        locked.payment_hash = draft.payment_hash
        locked.bob_expires_at = draft.expires_at
        locked.estimated_routing_fee_sats = estimated
        locked.save(
            update_fields=[
                "encoded_invoice",
                "payment_hash",
                "bob_expires_at",
                "estimated_routing_fee_sats",
                "updated_at",
            ]
        )
        transfer = Transfer.objects.select_for_update().get(pk=locked.transfer_id)
        transfer.lightning_payment_hash = draft.payment_hash
        transfer.lnd_fee_sats_estimated = estimated
        _save_transfer(transfer, ["lightning_payment_hash", "lnd_fee_sats_estimated"])
    logger.info("transfer.invoice_prepared attempt=%s", attempt.id)


def _pay_alice_once(attempt: TransferAttempt, ports: LightningPorts, actor, request) -> None:
    attempt.refresh_from_db()
    if attempt.send_attempted:
        return
    if not attempt.encoded_invoice:
        return
    try:
        decoded = ports.alice.decode_invoice(attempt.encoded_invoice)
    except LndInvoiceError as exc:
        _fail_attempt(attempt, str(exc)[:255], transfer_status=FAILED)
        raise ValidationError({"encoded_invoice": str(exc)}) from exc
    except LndUnavailable as exc:
        _mark_uncertain(attempt, str(exc))
        return
    if decoded.amount_sats and decoded.amount_sats != attempt.invoice_amount_sats:
        _fail_attempt(attempt, "montant_facture_incoherent", transfer_status=FAILED)
        raise ValidationError({"amount_sats": "Le montant de la facture Bob ne correspond pas au devis."})
    try:
        local = ports.alice.get_node_info()
    except (LndUnavailable, LndError):
        local = None
    if local and local.pubkey and decoded.destination and decoded.destination == local.pubkey:
        _fail_attempt(attempt, "self_pay_interdit", transfer_status=FAILED)
        raise ValidationError({"encoded_invoice": "Paiement Alice → Alice interdit. Facture Bob requise."})

    payment = _register_payment_intent(attempt)
    with transaction.atomic():
        locked = TransferAttempt.objects.select_for_update().get(pk=attempt.id)
        if locked.send_attempted:
            return
        locked.send_attempted = True
        locked.status = TransferAttempt.Status.PAYING
        locked.lightning_payment = payment
        locked.save(update_fields=["send_attempted", "status", "lightning_payment", "updated_at"])
        transfer = Transfer.objects.select_for_update().get(pk=locked.transfer_id)
        transfer.lightning_payment_id = payment.id
        _save_transfer(transfer, ["lightning_payment_id"])

    timeout = int(getattr(settings, "LND_TIMEOUT_SECONDS", 30))
    fee_limit = int(getattr(settings, "TRANSFER_MAX_ROUTING_FEE_SATS", 50))
    try:
        sent_hash = ports.alice.send_payment(
            encoded_invoice=attempt.encoded_invoice,
            timeout_seconds=timeout,
            fee_limit_sats=fee_limit,
        )
    except LndUnavailable as exc:
        _mark_uncertain(attempt, str(exc))
        return
    except (LndPaymentError, LndError) as exc:
        _fail_attempt(attempt, str(exc)[:255], transfer_status=FAILED)
        if payment:
            try:
                transition_payment(payment, Payment.Status.FAILED, failure_reason=str(exc)[:255])
            except Exception:
                pass
        return
    if sent_hash and sent_hash != attempt.payment_hash:
        TransferAttempt.objects.filter(pk=attempt.id).update(payment_hash=sent_hash, updated_at=timezone.now())
        Transfer.objects.filter(pk=attempt.transfer_id).update(
            lightning_payment_hash=sent_hash,
            updated_at=timezone.now(),
        )


def _register_payment_intent(attempt: TransferAttempt) -> Payment:
    transfer = attempt.transfer
    existing = Payment.objects.filter(idempotency_key=f"xfer-{attempt.id}").first()
    if existing:
        return existing
    payment = Payment.objects.create(
        owner=transfer.owner,
        amount_sats=attempt.invoice_amount_sats,
        description=f"{INVOICE_MEMO_PREFIX} {transfer.public_reference}",
        status=Payment.Status.CREATED,
        settlement_mode=Payment.SettlementMode.LIGHTNING_REGTEST,
        is_lightning_settled=False,
        network=Payment.Network.REGTEST,
        direction=Payment.Direction.OUTGOING,
        idempotency_key=f"xfer-{attempt.id}",
        provider_reference=attempt.payment_hash,
        encoded_invoice=attempt.encoded_invoice,
        expires_at=attempt.bob_expires_at,
    )
    transition_payment(payment, Payment.Status.PENDING)
    return payment


def _verify_lookups(attempt, ports: LightningPorts, actor, request, *, fail_credit: bool) -> None:
    attempt.refresh_from_db()
    transfer = Transfer.objects.get(pk=attempt.transfer_id)
    if transfer.status in {SIMULATED_CREDITED, FAILED}:
        return
    if attempt.status == TransferAttempt.Status.FAILED:
        return
    if not attempt.payment_hash:
        return
    try:
        alice_result = ports.alice.lookup_payment(attempt.payment_hash)
        bob_result = ports.bob.lookup_invoice(attempt.payment_hash)
    except LndUnavailable as exc:
        _mark_uncertain(attempt, str(exc))
        return

    TransferAttempt.objects.filter(pk=attempt.id).update(
        alice_status=alice_result.status,
        bob_status=bob_result.status,
        updated_at=timezone.now(),
    )
    if attempt.lightning_payment_id:
        reconcile_payment(attempt.lightning_payment)

    alice_failed = bool(alice_result.failure_reason) or alice_result.status in {"FAILED", "FAILURE", "CANCELED"}
    if alice_failed and not alice_result.settled:
        _fail_attempt(attempt, alice_result.failure_reason or alice_result.status, transfer_status=FAILED)
        return

    if alice_result.settled and bob_result.settled:
        if bob_result.amount_sats and bob_result.amount_sats != attempt.invoice_amount_sats:
            _mark_uncertain(attempt, "divergence_montant_bob")
            return
        paid_fee = alice_result.fee_sats
        total = attempt.invoice_amount_sats + int(paid_fee or 0)
        with transaction.atomic():
            locked = TransferAttempt.objects.select_for_update().get(pk=attempt.id)
            locked.status = TransferAttempt.Status.SETTLED
            locked.paid_routing_fee_sats = paid_fee
            locked.total_debited_sats = total
            locked.save(update_fields=["status", "paid_routing_fee_sats", "total_debited_sats", "updated_at"])
            xfer = Transfer.objects.select_for_update().get(pk=locked.transfer_id)
            previous = xfer.status
            xfer.lnd_fee_sats_paid = paid_fee
            xfer.total_debited_sats = total
            xfer.lightning_settled_at = timezone.now()
            if previous != LIGHTNING_SETTLED and previous != SIMULATED_CREDITED:
                _transition(xfer, LIGHTNING_SETTLED)
            _save_transfer(
                xfer,
                ["lnd_fee_sats_paid", "total_debited_sats", "lightning_settled_at", "status"],
            )
            if previous != LIGHTNING_SETTLED:
                _audit(
                    xfer,
                    "transfer.status_changed",
                    actor=actor,
                    request=request,
                    extra={"from_status": previous, "to_status": LIGHTNING_SETTLED},
                )
        logger.info("transfer.lightning_settled id=%s", attempt.transfer_id)
        _record_simulated_credit(attempt.transfer_id, actor, request, fail_credit=fail_credit)
        return

    if attempt.send_attempted and not alice_result.found and not bob_result.settled:
        _mark_uncertain(attempt, "lookup_introuvable_apres_envoi")
        return
    TransferAttempt.objects.filter(pk=attempt.id).update(
        status=TransferAttempt.Status.LOOKUP_PENDING,
        updated_at=timezone.now(),
    )


def _record_simulated_credit(transfer_id, actor, request, *, fail_credit: bool) -> None:
    if fail_credit:
        Transfer.objects.filter(pk=transfer_id).update(
            mobile_money_credit_status=Transfer.CreditStatus.FAILED,
            updated_at=timezone.now(),
        )
        transfer = Transfer.objects.get(pk=transfer_id)
        _audit(
            transfer,
            "transfer.validation_failed",
            actor=actor,
            request=request,
            extra={"reason": "simulated_credit_failed", "from_status": transfer.status},
        )
        logger.info("transfer.credit_simulated_failed id=%s lightning_kept=true", transfer_id)
        return
    with transaction.atomic():
        transfer = Transfer.objects.select_for_update().get(pk=transfer_id)
        if transfer.status == SIMULATED_CREDITED and transfer.simulated_credit_reference:
            return
        credit, created = SimulatedMobileMoneyCredit.objects.get_or_create(
            transfer=transfer,
            defaults={
                "destination_country": transfer.destination_country,
                "operator": transfer.operator,
                "beneficiary_name": transfer.beneficiary_name,
                "amount_local": transfer.amount_local,
                "currency": transfer.currency,
                "reference": f"MM-SIM-{uuid.uuid4().hex[:12].upper()}",
                "disclaimer": CREDIT_DISCLAIMER,
            },
        )
        previous = transfer.status
        transfer.mobile_money_credit_status = Transfer.CreditStatus.SIMULATED
        transfer.simulated_credit_reference = credit.reference
        _transition(transfer, SIMULATED_CREDITED)
        _save_transfer(transfer, ["mobile_money_credit_status", "simulated_credit_reference", "status"])
        if created or previous != SIMULATED_CREDITED:
            _audit(
                transfer,
                "transfer.status_changed",
                actor=actor,
                request=request,
                extra={"from_status": previous, "to_status": SIMULATED_CREDITED, "credit_ref": credit.reference},
            )
    logger.info("transfer.credit_simulated id=%s", transfer_id)


def _fail_attempt(attempt: TransferAttempt, reason: str, *, transfer_status: str) -> None:
    with transaction.atomic():
        locked = TransferAttempt.objects.select_for_update().get(pk=attempt.id)
        locked.status = TransferAttempt.Status.FAILED
        locked.failure_reason = reason[:255]
        locked.save(update_fields=["status", "failure_reason", "updated_at"])
        transfer = Transfer.objects.select_for_update().get(pk=locked.transfer_id)
        if transfer.status not in {LIGHTNING_SETTLED, SIMULATED_CREDITED}:
            _transition(transfer, transfer_status)
            _save_transfer(transfer, ["status"])


def _mark_uncertain(attempt: TransferAttempt, reason: str) -> None:
    with transaction.atomic():
        locked = TransferAttempt.objects.select_for_update().get(pk=attempt.id)
        locked.status = TransferAttempt.Status.UNCERTAIN
        locked.failure_reason = reason[:255]
        locked.save(update_fields=["status", "failure_reason", "updated_at"])
        transfer = Transfer.objects.select_for_update().get(pk=locked.transfer_id)
        if transfer.status not in {LIGHTNING_SETTLED, SIMULATED_CREDITED, FAILED}:
            _transition(transfer, PENDING_RECONCILIATION)
            _save_transfer(transfer, ["status"])
    logger.info("transfer.pending_reconciliation id=%s", attempt.transfer_id)


def result_payload(transfer: Transfer) -> dict:
    attempt = transfer.attempts.order_by("-created_at").first()
    credit = getattr(transfer, "simulated_credit", None)
    lightning_confirmed = transfer.status in {LIGHTNING_SETTLED, SIMULATED_CREDITED} and bool(
        transfer.lightning_settled_at
    )
    return {
        "id": str(transfer.id),
        "public_reference": transfer.public_reference,
        "status": transfer.status,
        "amount_local": int(transfer.amount_local),
        "currency": transfer.currency,
        "operator": transfer.operator,
        "destination_country": transfer.destination_country,
        "beneficiary_name": transfer.beneficiary_name,
        "invoice_amount_sats": int(transfer.invoice_amount_sats or transfer.amount_sats),
        "demo_fee_sats": int(transfer.fee_sats),
        "lnd_fee_sats_estimated": int(transfer.lnd_fee_sats_estimated),
        "lnd_fee_sats_paid": transfer.lnd_fee_sats_paid,
        "total_debited_sats": int(transfer.total_debited_sats),
        "lightning_payment_hash": transfer.lightning_payment_hash,
        "lightning_settled_at": transfer.lightning_settled_at,
        "lightning_confirmed": lightning_confirmed,
        "alice_status": attempt.alice_status if attempt else "",
        "bob_status": attempt.bob_status if attempt else "",
        "mobile_money_credit_status": transfer.mobile_money_credit_status,
        "simulated_credit_reference": transfer.simulated_credit_reference,
        "credited_amount_local": int(credit.amount_local) if credit else 0,
        "credit_disclaimer": CREDIT_DISCLAIMER,
        "warnings": [
            "Les frais de démonstration B1 ne sont pas des frais LND.",
            "Un HTTP 200 n'est pas une preuve de règlement.",
            CREDIT_DISCLAIMER if transfer.mobile_money_credit_status == Transfer.CreditStatus.SIMULATED else "Aucun crédit Mobile Money réel n'a été exécuté.",
        ],
    }
