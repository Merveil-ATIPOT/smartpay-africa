"""Lecture seule des journaux AuditLog. Aucune mutation. Aucun LND."""

from __future__ import annotations

import re
from datetime import datetime

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import ValidationError

from smartpay.audit.models import AuditLog

METADATA_SAFE_KEYS = frozenset(
    {
        "amount_sats",
        "settlement_mode",
        "is_lightning_settled",
        "idempotent",
        "destination_country",
        "operator",
        "quote_version",
        "status",
        "correlation_id",
        "from_status",
        "to_status",
        "reason",
        "attempt_id",
        "credit_ref",
    }
)

KNOWN_ACTIONS = frozenset(
    {
        "payment.invoice_created",
        "payment.created",
        "payment.lightning_settled",
        "transfer.created",
        "transfer.beneficiary_updated",
        "transfer.quoted",
        "transfer.quote_validated",
        "transfer.status_changed",
        "transfer.validation_failed",
    }
)

KNOWN_RESOURCE_TYPES = frozenset({"payment", "transfer"})

ACTION_PATTERN = re.compile(r"^[a-z0-9._-]{1,64}$")
RESOURCE_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,64}$")
SECRET_MARKERS = (
    "password",
    "jwt",
    "macaroon",
    "seed",
    "private",
    "encoded_invoice",
    "lnbcrt",
    "lnbc",
    "/run/lnd",
    "eyj",
    "rpcpassword",
    "phone",
)
MAX_TEXT = 128


def audit_category(action: str) -> str:
    value = (action or "").strip()
    if value.startswith("payment."):
        return "payment"
    if value.startswith("transfer."):
        return "transfer"
    return "other"


def audit_severity(action: str) -> dict[str, str]:
    value = (action or "").strip()
    if value == "transfer.validation_failed":
        return {
            "key": "warning",
            "label": "Avertissement — classification applicative",
        }
    if value in KNOWN_ACTIONS:
        return {
            "key": "info",
            "label": "Information — classification applicative",
        }
    return {
        "key": "unclassified",
        "label": "Non classé — action inconnue",
    }


def _looks_secret(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in SECRET_MARKERS)


def sanitize_metadata(raw) -> dict:
    if not isinstance(raw, dict):
        return {}
    safe: dict = {}
    for key, value in raw.items():
        if key not in METADATA_SAFE_KEYS:
            continue
        if isinstance(value, bool):
            safe[key] = value
            continue
        if isinstance(value, int):
            safe[key] = value
            continue
        if isinstance(value, str):
            cleaned = value.strip()[:MAX_TEXT]
            if cleaned and not _looks_secret(cleaned):
                safe[key] = cleaned
    return safe


def _parse_when(raw: str, field: str) -> datetime | None:
    value = (raw or "").strip()
    if not value:
        return None
    parsed = parse_datetime(value)
    if parsed is None:
        day = parse_date(value)
        if day is not None:
            parsed = datetime.combine(day, datetime.min.time())
    if parsed is None:
        raise ValidationError({field: "Date invalide. Utilisez un horodatage ISO 8601."})
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def filter_audit_logs(
    qs=None,
    *,
    q="",
    action="",
    resource_type="",
    resource_id="",
    actor="",
    created_after="",
    created_before="",
):
    logs = qs if qs is not None else AuditLog.objects.all()
    query = (q or "").strip()
    action_value = (action or "").strip()
    type_value = (resource_type or "").strip()
    resource_value = (resource_id or "").strip()
    actor_value = (actor or "").strip()

    if query:
        if len(query) > 64:
            raise ValidationError({"q": "Recherche trop longue (64 caractères maximum)."})
        logs = logs.filter(Q(action__icontains=query) | Q(resource_id__icontains=query))
    if action_value:
        if not ACTION_PATTERN.fullmatch(action_value):
            raise ValidationError({"action": "Action invalide."})
        logs = logs.filter(action=action_value)
    if type_value:
        if type_value not in KNOWN_RESOURCE_TYPES:
            raise ValidationError({"resource_type": "Type de ressource inconnu. Valeurs : payment, transfer."})
        logs = logs.filter(resource_type=type_value)
    if resource_value:
        if not RESOURCE_ID_PATTERN.fullmatch(resource_value):
            raise ValidationError({"resource_id": "Identifiant de ressource invalide."})
        logs = logs.filter(resource_id=resource_value)
    if actor_value:
        if not actor_value.isdigit():
            raise ValidationError({"actor": "Identifiant acteur invalide."})
        logs = logs.filter(actor_id=int(actor_value))
    after = _parse_when(created_after, "created_after")
    before = _parse_when(created_before, "created_before")
    if after and before and after > before:
        raise ValidationError({"created_after": "La date de début doit précéder la date de fin."})
    if after:
        logs = logs.filter(created_at__gte=after)
    if before:
        logs = logs.filter(created_at__lte=before)
    return logs.select_related("actor").order_by("-created_at", "-id")


def audit_summary() -> dict:
    qs = AuditLog.objects.all()
    return {
        "total": qs.count(),
        "payment": qs.filter(action__startswith="payment.").count(),
        "transfer": qs.filter(action__startswith="transfer.").count(),
    }
