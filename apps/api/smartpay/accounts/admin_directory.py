"""Annuaire administrateur en lecture seule. Aucune mutation."""

from __future__ import annotations

from django.db.models import Count, Q
from rest_framework.exceptions import ValidationError

from smartpay.accounts.models import User


def filter_directory(qs, *, q="", role="", country="", is_active=""):
    query = (q or "").strip()
    role_value = (role or "").strip()
    country_value = (country or "").strip()
    active_value = (is_active or "").strip().lower()

    if query:
        lookup = (
            Q(email__icontains=query)
            | Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(phone_number__icontains=query)
        )
        if query.isdigit():
            lookup |= Q(pk=int(query))
        qs = qs.filter(lookup)
    if role_value:
        if role_value not in User.Role.values:
            raise ValidationError({"role": "Rôle inconnu."})
        qs = qs.filter(role=role_value)
    if country_value:
        if country_value not in User.Country.values:
            raise ValidationError({"country": "Pays inconnu."})
        qs = qs.filter(country=country_value)
    if active_value in {"true", "1"}:
        qs = qs.filter(is_active=True)
    elif active_value in {"false", "0"}:
        qs = qs.filter(is_active=False)
    elif active_value:
        raise ValidationError({"is_active": "Valeur attendue : true ou false."})
    return qs.order_by("date_joined", "id")


def directory_summary() -> dict:
    by_role = {value: 0 for value, _label in User.Role.choices}
    for row in User.objects.values("role").annotate(n=Count("id")):
        by_role[row["role"]] = row["n"]
    total = User.objects.count()
    active = User.objects.filter(is_active=True).count()
    return {
        "total": total,
        "active": active,
        "inactive": total - active,
        "by_role": by_role,
    }
