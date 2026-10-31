"""Supervision lecture seule des corridors de démonstration.

Catalogue Python + agrégats Transfer / TransferSimulation.
Aucun modèle Corridor. Aucun appel LND. Aucune mutation.
"""

from __future__ import annotations

from datetime import datetime

from django.db.models import Count, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import ValidationError

from smartpay.transfers.corridors import CATALOG_DISCLAIMER, get_corridor
from smartpay.transfers.models import TRANSFER_MODE, Transfer, TransferSimulation
from smartpay.transfers.state import (
    DRAFT,
    FAILED,
    LIGHTNING_SETTLED,
    PAYMENT_PENDING,
    PENDING_RECONCILIATION,
    QUOTED,
    READY,
    SIMULATED_CREDITED,
)

PRIMARY_CODES = ("SN", "CI", "CG")
SECONDARY_CODES = ("CM", "BJ", "TG")
KNOWN_SOURCE = frozenset({"SN", "CI", "CG"})
KNOWN_DESTINATION = frozenset({"SN", "CI", "CG", "CM", "BJ", "TG"})
KNOWN_STATUSES = frozenset(
    {
        DRAFT,
        QUOTED,
        READY,
        PAYMENT_PENDING,
        LIGHTNING_SETTLED,
        SIMULATED_CREDITED,
        FAILED,
        PENDING_RECONCILIATION,
    }
)
CURRENCIES = ("XOF", "XAF")

TRANSFER_FIELDS = (
    "public_reference",
    "created_at",
    "source_country",
    "destination_country",
    "amount_local",
    "currency",
    "amount_sats",
    "status",
    "execution_mode",
    "is_simulation",
)

AVAILABILITY_CONFIGURED = "Configuré pour simulation"
AVAILABILITY_UNAVAILABLE = "Indisponible dans cette démonstration"
AMOUNTS_DISCLAIMER = (
    "Totaux d'enregistrements PostgreSQL. Ce ne sont pas des volumes réglés, "
    "ni un change réel. XOF et XAF restent séparés."
)
HISTORICAL_LIMIT = 20

SECRET_MARKERS = (
    "beneficiary_name",
    "phone_number",
    "encoded_invoice",
    "lightning_payment_hash",
    "macaroon",
    "password",
    "jwt",
    "seed",
    "/run/lnd",
    "lnbcrt",
    "lnbc",
)


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


def filter_transfers(
    *,
    source_country="",
    destination_country="",
    status="",
    created_after="",
    created_before="",
):
    qs = Transfer.objects.all()
    source = (source_country or "").strip().upper()
    destination = (destination_country or "").strip().upper()
    status_value = (status or "").strip()

    if source:
        if source not in KNOWN_SOURCE:
            raise ValidationError({"source_country": "Pays d'origine inconnu. Valeurs : SN, CI, CG."})
        qs = qs.filter(source_country=source)
    if destination:
        if destination not in KNOWN_DESTINATION:
            raise ValidationError(
                {"destination_country": "Pays de destination inconnu. Valeurs : SN, CI, CG, CM, BJ, TG."}
            )
        qs = qs.filter(destination_country=destination)
    if status_value:
        if status_value not in KNOWN_STATUSES:
            raise ValidationError({"status": "Statut de transfert inconnu."})
        qs = qs.filter(status=status_value)

    after = _parse_when(created_after, "created_after")
    before = _parse_when(created_before, "created_before")
    if after and before and after > before:
        raise ValidationError({"created_after": "La date de début doit précéder la date de fin."})
    if after:
        qs = qs.filter(created_at__gte=after)
    if before:
        qs = qs.filter(created_at__lte=before)
    return qs.order_by("-created_at", "-public_reference")


def serialize_transfer(transfer: Transfer) -> dict:
    return {
        "public_reference": transfer.public_reference,
        "created_at": transfer.created_at,
        "source_country": transfer.source_country,
        "destination_country": transfer.destination_country,
        "amount_local": int(transfer.amount_local or 0),
        "currency": transfer.currency,
        "amount_sats": int(transfer.amount_sats or 0),
        "status": transfer.status,
        "execution_mode": transfer.execution_mode or TRANSFER_MODE,
        "is_simulation": True,
    }


def serialize_historical_simulation(item: TransferSimulation) -> dict:
    return {
        "id": item.id,
        "created_at": item.created_at,
        "source_country": item.source_country,
        "destination_country": item.destination_country,
        "amount_sats": int(item.amount_sats or 0),
        "status": item.status,
        "is_historical_simulation": True,
    }


def _empty_amounts() -> dict:
    return {
        currency: {"amount_local": 0, "amount_sats": 0, "transfer_count": 0} for currency in CURRENCIES
    }


def transfer_summary(qs=None) -> dict:
    rows = qs if qs is not None else Transfer.objects.all()
    by_status = {status: 0 for status in KNOWN_STATUSES}
    for row in rows.values("status").annotate(total=Count("id")):
        status = row["status"]
        if status in by_status:
            by_status[status] = row["total"]

    amounts = _empty_amounts()
    for currency in CURRENCIES:
        agg = rows.filter(currency=currency).aggregate(
            amount_local=Sum("amount_local"),
            amount_sats=Sum("amount_sats"),
            transfer_count=Count("id"),
        )
        amounts[currency] = {
            "amount_local": int(agg["amount_local"] or 0),
            "amount_sats": int(agg["amount_sats"] or 0),
            "transfer_count": int(agg["transfer_count"] or 0),
        }

    return {
        "transfers_total": rows.count(),
        "by_status": by_status,
        "amounts": amounts,
        "disclaimer": AMOUNTS_DISCLAIMER,
    }


def _country_payload(code: str, qs) -> dict | None:
    corridor = get_corridor(code)
    if corridor is None:
        return None
    dest = qs.filter(destination_country=code)
    dest_matching = dest.filter(currency=corridor.currency)
    dest_agg = dest_matching.aggregate(local=Sum("amount_local"), sats=Sum("amount_sats"))
    return {
        "code": corridor.code,
        "name": corridor.name,
        "currency": corridor.currency,
        "region": corridor.region,
        "available": corridor.available,
        "recommended": corridor.recommended,
        "simulated_gateway": True,
        "availability_label": AVAILABILITY_CONFIGURED if corridor.available else AVAILABILITY_UNAVAILABLE,
        "operators": [
            {"id": operator.id, "label": operator.label, "simulated": True} for operator in corridor.operators
        ],
        "transfers_as_source": qs.filter(source_country=code).count(),
        "transfers_as_destination": dest.count(),
        "recorded_amount_local": int(dest_agg["local"] or 0),
        "recorded_amount_sats": int(dest_agg["sats"] or 0),
        "amounts_are_settled": False,
    }


def catalog_supervision(qs=None) -> dict:
    rows = qs if qs is not None else Transfer.objects.all()
    return {
        "disclaimer": CATALOG_DISCLAIMER,
        "primary": [item for code in PRIMARY_CODES if (item := _country_payload(code, rows))],
        "secondary": [item for code in SECONDARY_CODES if (item := _country_payload(code, rows))],
    }


def historical_simulations_payload() -> dict:
    qs = TransferSimulation.objects.all().order_by("-created_at", "-id")
    return {
        "count": qs.count(),
        "results": [serialize_historical_simulation(item) for item in qs[:HISTORICAL_LIMIT]],
        "disclaimer": (
            "Ancien modèle TransferSimulation. "
            "Ces lignes ne sont pas des parcours M22–M26 et ne sont pas additionnées aux transferts."
        ),
    }


def corridors_payload_contains_secrets(payload) -> bool:
    blob = str(payload).lower()
    return any(marker in blob for marker in SECRET_MARKERS)
