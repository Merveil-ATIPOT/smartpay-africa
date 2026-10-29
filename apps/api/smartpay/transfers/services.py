"""Services de préparation du transfert. Aucun appel LND, aucun paiement."""

from __future__ import annotations

import logging
import uuid

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from smartpay.audit.models import AuditLog
from smartpay.transfers.conversion import QuoteError, build_quote, demo_fcfa_per_btc, quote_version
from smartpay.transfers.corridors import (
    CATALOG_DISCLAIMER,
    destination_available,
    get_corridor,
    operator_allowed,
)
from smartpay.transfers.models import TRANSFER_MODE, Transfer
from smartpay.transfers.phone import normalize_e164
from smartpay.transfers.state import (
    DRAFT,
    QUOTED,
    READY,
    SETTLEMENT_STATUSES,
    InvalidTransferTransition,
    assert_transition,
)

logger = logging.getLogger("smartpay.transfers")

RESOURCE = "transfer"


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


def _audit(transfer: Transfer, action: str, *, actor, request=None, extra: dict | None = None):
    metadata = {
        "destination_country": transfer.destination_country,
        "operator": transfer.operator,
        "quote_version": transfer.quote_version,
        "status": transfer.status,
        "correlation_id": str(transfer.id),
    }
    if extra:
        metadata.update(extra)
    AuditLog.record(
        actor=actor,
        action=action,
        resource_type=RESOURCE,
        resource_id=str(transfer.id),
        metadata=metadata,
        ip_address=_client_ip(request),
    )


def _public_reference() -> str:
    return f"SPA-{uuid.uuid4().hex[:12].upper()}"


def _set_status(transfer: Transfer, new_status: str) -> None:
    current = transfer.status
    try:
        assert_transition(current, new_status, internal=False)
    except InvalidTransferTransition as exc:
        raise ValidationError({"status": str(exc)}) from exc
    transfer.status = new_status


def _clear_quote(transfer: Transfer) -> None:
    transfer.demo_rate_fcfa_per_btc = 0
    transfer.amount_sats = 0
    transfer.fee_sats = 0
    transfer.total_sats = 0
    transfer.quote_version = ""
    transfer.quoted_at = None
    transfer.quote_expires_at = None


def quote_is_current(transfer: Transfer) -> bool:
    if transfer.status not in {QUOTED, READY}:
        return False
    if not transfer.quoted_at or not transfer.quote_expires_at:
        return False
    if timezone.now() > transfer.quote_expires_at:
        return False
    if transfer.quote_version != quote_version():
        return False
    if transfer.demo_rate_fcfa_per_btc != demo_fcfa_per_btc():
        return False
    corridor = get_corridor(transfer.destination_country)
    if corridor is None or transfer.currency != corridor.currency:
        return False
    try:
        expected = build_quote(int(transfer.amount_local), transfer.currency)
    except QuoteError:
        return False
    return (
        expected.amount_sats == transfer.amount_sats
        and expected.fee_sats == transfer.fee_sats
        and expected.total_sats == transfer.total_sats
    )


def compute_standalone_quote(amount_local: int, destination_country: str) -> dict:
    corridor = get_corridor(destination_country)
    if corridor is None or not corridor.available:
        raise ValidationError({"destination_country": "Destination indisponible dans cette démonstration."})
    try:
        quote = build_quote(int(amount_local), corridor.currency)
    except QuoteError as exc:
        raise ValidationError({"amount_local": str(exc)}) from exc
    return quote.as_dict()


def _apply_destination(transfer: Transfer, code: str) -> None:
    corridor = get_corridor(code)
    if corridor is None:
        raise ValidationError({"destination_country": "Pays de destination inconnu."})
    if not corridor.available:
        raise ValidationError({"destination_country": "Destination indisponible dans cette démonstration."})
    if transfer.destination_country != corridor.code:
        transfer.destination_country = corridor.code
        transfer.currency = corridor.currency
        if transfer.operator and not operator_allowed(corridor.code, transfer.operator):
            transfer.operator = ""
            transfer.beneficiary_name = ""
            transfer.phone_number = ""
        _clear_quote(transfer)
        _set_status(transfer, DRAFT)
    elif not transfer.currency:
        transfer.currency = corridor.currency


def _apply_operator(transfer: Transfer, operator: str) -> None:
    if not transfer.destination_country:
        raise ValidationError({"destination_country": "Choisissez un pays avant l'opérateur."})
    if not operator_allowed(transfer.destination_country, operator):
        raise ValidationError({"operator": "Opérateur incompatible avec le pays sélectionné."})
    transfer.operator = operator


def _apply_phone(transfer: Transfer, phone: str) -> None:
    if not transfer.destination_country:
        raise ValidationError({"destination_country": "Choisissez un pays avant le numéro."})
    try:
        transfer.phone_number = normalize_e164(transfer.destination_country, phone)
    except ValueError as exc:
        raise ValidationError({"phone_number": str(exc)}) from exc


def beneficiary_errors(transfer: Transfer) -> dict[str, str]:
    errors: dict[str, str] = {}
    if not destination_available(transfer.destination_country):
        errors["destination_country"] = "Pays de destination manquant ou indisponible."
    if not operator_allowed(transfer.destination_country, transfer.operator):
        errors["operator"] = "Choisissez un opérateur Mobile Money du pays sélectionné."
    if len(transfer.beneficiary_name.strip()) < 3:
        errors["beneficiary_name"] = "Indiquez le nom complet du bénéficiaire."
    if not transfer.phone_number:
        errors["phone_number"] = "Indiquez un numéro Mobile Money."
    else:
        try:
            normalize_e164(transfer.destination_country, transfer.phone_number)
        except ValueError as exc:
            errors["phone_number"] = str(exc)
    return errors


@transaction.atomic
def create_draft(*, user, data: dict, idempotency_key: str, request=None) -> tuple[Transfer, bool]:
    if not idempotency_key:
        raise ValidationError({"idempotency_key": "Une clé d'idempotence est obligatoire pour créer un transfert."})
    existing = Transfer.objects.filter(owner=user, idempotency_key=idempotency_key).first()
    if existing:
        return existing, False

    source = (data.get("source_country") or getattr(user, "country", "") or "").upper()
    if source and source not in {"SN", "CG", "CI"}:
        raise ValidationError({"source_country": "Pays d'origine non pris en charge."})
    transfer = Transfer(
        owner=user,
        public_reference=_public_reference(),
        idempotency_key=idempotency_key,
        source_country=source,
        execution_mode=TRANSFER_MODE,
        status=DRAFT,
    )
    if data.get("destination_country"):
        _apply_destination(transfer, data["destination_country"])
    if data.get("operator"):
        _apply_operator(transfer, data["operator"])
    if data.get("beneficiary_name"):
        transfer.beneficiary_name = data["beneficiary_name"].strip()
    if data.get("phone_number"):
        _apply_phone(transfer, data["phone_number"])
    if data.get("reason") is not None:
        transfer.reason = str(data.get("reason") or "").strip()
    if data.get("amount_local"):
        transfer.amount_local = int(data["amount_local"])
    transfer.save()
    logger.info("transfer.created id=%s status=%s", transfer.id, transfer.status)
    _audit(transfer, "transfer.created", actor=user, request=request)
    return transfer, True


@transaction.atomic
def update_transfer(transfer: Transfer, data: dict, *, actor, request=None) -> Transfer:
    if transfer.status in SETTLEMENT_STATUSES:
        raise ValidationError({"status": "Ce transfert n'est plus modifiable."})
    previous = transfer.status
    changed_quote_inputs = False

    if "destination_country" in data and data["destination_country"]:
        before = transfer.destination_country
        _apply_destination(transfer, data["destination_country"])
        changed_quote_inputs = changed_quote_inputs or before != transfer.destination_country
    if "operator" in data and data["operator"]:
        _apply_operator(transfer, data["operator"])
    if "beneficiary_name" in data:
        transfer.beneficiary_name = str(data.get("beneficiary_name") or "").strip()
    if "phone_number" in data and data["phone_number"]:
        _apply_phone(transfer, data["phone_number"])
    if "reason" in data:
        transfer.reason = str(data.get("reason") or "").strip()
    if "amount_local" in data and data["amount_local"] is not None:
        amount = int(data["amount_local"])
        if amount != transfer.amount_local:
            transfer.amount_local = amount
            changed_quote_inputs = True
    if "source_country" in data and data["source_country"]:
        source = str(data["source_country"]).upper()
        if source not in {"SN", "CG", "CI"}:
            raise ValidationError({"source_country": "Pays d'origine non pris en charge."})
        transfer.source_country = source

    if changed_quote_inputs:
        _clear_quote(transfer)
        _set_status(transfer, DRAFT)

    transfer.save()
    extra = {"from_status": previous, "to_status": transfer.status}
    if "beneficiary_name" in data or "phone_number" in data or "operator" in data:
        _audit(transfer, "transfer.beneficiary_updated", actor=actor, request=request, extra=extra)
    if previous != transfer.status:
        _audit(transfer, "transfer.status_changed", actor=actor, request=request, extra=extra)
    return transfer


@transaction.atomic
def apply_quote(transfer: Transfer, *, actor, request=None, amount_local: int | None = None) -> Transfer:
    if transfer.status in SETTLEMENT_STATUSES:
        raise ValidationError({"status": "Ce transfert n'accepte plus de devis de préparation."})
    if amount_local is not None:
        transfer.amount_local = int(amount_local)
    corridor = get_corridor(transfer.destination_country)
    if corridor is None or not corridor.available:
        raise ValidationError({"destination_country": "Choisissez une destination disponible avant le devis."})
    transfer.currency = corridor.currency
    previous = transfer.status
    try:
        quote = build_quote(int(transfer.amount_local), transfer.currency)
    except QuoteError as exc:
        _audit(
            transfer,
            "transfer.validation_failed",
            actor=actor,
            request=request,
            extra={"reason": "quote", "from_status": previous},
        )
        raise ValidationError({"amount_local": str(exc)}) from exc

    transfer.demo_rate_fcfa_per_btc = quote.demo_rate_fcfa_per_btc
    transfer.amount_sats = quote.amount_sats
    transfer.fee_sats = quote.fee_sats
    transfer.total_sats = quote.total_sats
    transfer.quote_version = quote.quote_version
    transfer.quoted_at = quote.quoted_at
    transfer.quote_expires_at = quote.expires_at
    _set_status(transfer, QUOTED)
    transfer.save()
    extra = {"from_status": previous, "to_status": QUOTED}
    _audit(transfer, "transfer.quoted", actor=actor, request=request, extra=extra)
    if previous != QUOTED:
        _audit(transfer, "transfer.status_changed", actor=actor, request=request, extra=extra)
    logger.info("transfer.quoted id=%s version=%s", transfer.id, transfer.quote_version)
    return transfer


@transaction.atomic
def validate_beneficiary(transfer: Transfer, data: dict, *, actor, request=None) -> Transfer:
    transfer = update_transfer(transfer, data, actor=actor, request=request)
    errors = beneficiary_errors(transfer)
    if errors:
        _audit(
            transfer,
            "transfer.validation_failed",
            actor=actor,
            request=request,
            extra={"reason": "beneficiary", "from_status": transfer.status},
        )
        raise ValidationError(errors)
    return transfer


@transaction.atomic
def mark_ready(transfer: Transfer, *, actor, request=None, idempotency_key: str = "") -> Transfer:
    if transfer.status == READY and quote_is_current(transfer) and not beneficiary_errors(transfer):
        return transfer
    errors = beneficiary_errors(transfer)
    if errors:
        _audit(
            transfer,
            "transfer.validation_failed",
            actor=actor,
            request=request,
            extra={"reason": "ready_beneficiary"},
        )
        raise ValidationError(errors)
    if not quote_is_current(transfer):
        _audit(
            transfer,
            "transfer.validation_failed",
            actor=actor,
            request=request,
            extra={"reason": "expired_or_stale_quote", "from_status": transfer.status},
        )
        raise ValidationError({"quote": "Devis expiré ou incohérent. Recalculez le devis côté serveur."})
    previous = transfer.status
    _set_status(transfer, READY)
    transfer.save(update_fields=["status", "updated_at"])
    extra = {"from_status": previous, "to_status": READY}
    _audit(transfer, "transfer.quote_validated", actor=actor, request=request, extra=extra)
    _audit(transfer, "transfer.status_changed", actor=actor, request=request, extra=extra)
    logger.info("transfer.ready id=%s", transfer.id)
    return transfer


def get_owned_transfer(user, transfer_id) -> Transfer:
    try:
        transfer = Transfer.objects.get(pk=transfer_id)
    except Transfer.DoesNotExist as exc:
        from rest_framework.exceptions import NotFound

        raise NotFound("Transfert introuvable.") from exc
    if transfer.owner_id != user.id and not getattr(user, "is_admin_role", False):
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied("Ce transfert ne vous appartient pas.")
    return transfer


def catalog_payload() -> dict:
    from smartpay.transfers.corridors import list_destinations

    results = []
    for item in list_destinations():
        results.append(
            {
                "code": item.code,
                "name": item.name,
                "currency": item.currency,
                "region": item.region,
                "recommended": item.recommended,
                "available": item.available,
                "simulated_gateway": item.simulated_gateway,
                "dial_code": item.dial_code,
                "operators": [
                    {"id": op.id, "label": op.label, "short_label": op.short_label}
                    for op in item.operators
                ],
            }
        )
    return {"disclaimer": CATALOG_DISCLAIMER, "count": len(results), "results": results}
