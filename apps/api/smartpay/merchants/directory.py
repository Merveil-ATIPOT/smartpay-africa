"""Annuaire marchands administrateur. Lecture seule. Aucune mutation."""

from __future__ import annotations

from django.db.models import Count, Q, Sum
from rest_framework.exceptions import ValidationError

from smartpay.merchants.models import Merchant
from smartpay.payments.models import Payment

SUPPORTED_COUNTRIES = ("SN", "CG", "CI")


def filter_merchants(qs, *, q="", country="", status=""):
    query = (q or "").strip()
    country_value = (country or "").strip()
    status_value = (status or "").strip()

    if query:
        lookup = (
            Q(display_name__icontains=query)
            | Q(legal_name__icontains=query)
            | Q(registration_number__icontains=query)
            | Q(owner__email__icontains=query)
            | Q(owner__first_name__icontains=query)
            | Q(owner__last_name__icontains=query)
        )
        if query.isdigit():
            lookup |= Q(pk=int(query))
        qs = qs.filter(lookup)
    if country_value:
        if country_value not in SUPPORTED_COUNTRIES:
            raise ValidationError({"country": "Pays inconnu."})
        qs = qs.filter(country=country_value)
    if status_value:
        if status_value not in Merchant.Status.values:
            raise ValidationError({"status": "Statut inconnu."})
        qs = qs.filter(status=status_value)
    return qs.select_related("owner").annotate(payment_count=Count("payments")).order_by("created_at", "id")


def merchant_summary() -> dict:
    by_status = {value: 0 for value, _label in Merchant.Status.choices}
    for row in Merchant.objects.values("status").annotate(n=Count("id")):
        by_status[row["status"]] = row["n"]
    by_country = {code: 0 for code in SUPPORTED_COUNTRIES}
    for row in Merchant.objects.values("country").annotate(n=Count("id")):
        by_country[row["country"]] = row["n"]
    total = Merchant.objects.count()
    return {
        "total": total,
        "by_status": by_status,
        "by_country": by_country,
        "payments_linked": Payment.objects.filter(merchant__isnull=False).count(),
    }


def merchant_linked_payments(merchant: Merchant):
    """Paiements de CETTE boutique uniquement. Aucune agrégation inter-marchands."""
    return Payment.objects.filter(merchant_id=merchant.pk).order_by("-created_at", "id")


def merchant_payments_summary(merchant: Merchant) -> dict:
    qs = merchant_linked_payments(merchant)
    return {
        "linked": qs.count(),
        "pending": qs.filter(status__in=[Payment.Status.CREATED, Payment.Status.PENDING]).count(),
        "django_confirmed": qs.filter(status=Payment.Status.CONFIRMED).count(),
        "lightning_settled": qs.filter(is_lightning_settled=True).count(),
        "failed_or_expired": qs.filter(status__in=[Payment.Status.FAILED, Payment.Status.EXPIRED]).count(),
        "amount_sats_linked": qs.aggregate(total=Sum("amount_sats"))["total"] or 0,
    }
