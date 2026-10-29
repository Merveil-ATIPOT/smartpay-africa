"""Devis de démonstration FCFA → sats.

Arrondi half-up identique au mobile Phase A :
  sats = (fcfa * 100_000_000 + taux_btc / 2) // taux_btc

Taux fictif configurable. Ce n'est PAS un cours Bitcoin, ni une
estimation de frais réseau LND.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from django.conf import settings
from django.utils import timezone

SATS_PER_BTC = 100_000_000
DEFAULT_FCFA_PER_BTC = 43_300_000
DEFAULT_FEE_SATS = 1
DEFAULT_MIN_LOCAL = 100
DEFAULT_MAX_LOCAL = 50_000_000
DEFAULT_QUOTE_VERSION = "demo-b1-v1"
DEFAULT_TTL_SECONDS = 300

RATE_DISCLAIMER = (
    "Taux indicatif fictif. Aucune réservation de change. "
    "Ce n'est pas un cours Bitcoin réel ni un taux garanti."
)
FEE_DISCLAIMER = (
    "Frais de démonstration. Ce n'est pas une estimation LND "
    "ni des frais réseau observés."
)


class QuoteError(ValueError):
    pass


def demo_fcfa_per_btc() -> int:
    return int(getattr(settings, "TRANSFER_DEMO_FCFA_PER_BTC", DEFAULT_FCFA_PER_BTC))


def demo_fee_sats() -> int:
    return int(getattr(settings, "TRANSFER_DEMO_FEE_SATS", DEFAULT_FEE_SATS))


def quote_version() -> str:
    return str(getattr(settings, "TRANSFER_QUOTE_VERSION", DEFAULT_QUOTE_VERSION))


def quote_ttl() -> timedelta:
    seconds = int(getattr(settings, "TRANSFER_QUOTE_TTL_SECONDS", DEFAULT_TTL_SECONDS))
    return timedelta(seconds=max(1, seconds))


def min_amount_local() -> int:
    return int(getattr(settings, "TRANSFER_MIN_AMOUNT_LOCAL", DEFAULT_MIN_LOCAL))


def max_amount_local() -> int:
    return int(getattr(settings, "TRANSFER_MAX_AMOUNT_LOCAL", DEFAULT_MAX_LOCAL))


def fcfa_to_sats(amount_fcfa: int, rate: int | None = None) -> int:
    """Conversion entière half-up. XOF et XAF utilisent le même taux de démo."""
    if not isinstance(amount_fcfa, int) or isinstance(amount_fcfa, bool) or amount_fcfa < 0:
        raise QuoteError("Le montant local doit être un entier positif ou nul.")
    btc_fcfa = int(rate if rate is not None else demo_fcfa_per_btc())
    if btc_fcfa <= 0:
        raise QuoteError("Taux de démonstration invalide.")
    return (amount_fcfa * SATS_PER_BTC + btc_fcfa // 2) // btc_fcfa


def sats_to_fcfa(amount_sats: int, rate: int | None = None) -> int:
    if not isinstance(amount_sats, int) or isinstance(amount_sats, bool) or amount_sats < 0:
        raise QuoteError("Le montant en sats doit être un entier positif ou nul.")
    btc_fcfa = int(rate if rate is not None else demo_fcfa_per_btc())
    if btc_fcfa <= 0:
        raise QuoteError("Taux de démonstration invalide.")
    return (amount_sats * btc_fcfa + SATS_PER_BTC // 2) // SATS_PER_BTC


@dataclass(frozen=True)
class DemoQuote:
    amount_local: int
    currency: str
    amount_sats: int
    fee_sats: int
    total_sats: int
    demo_rate_fcfa_per_btc: int
    quote_version: str
    quoted_at: datetime
    expires_at: datetime
    is_fictional_rate: bool
    is_lnd_fee_estimate: bool
    disclaimer: str
    fee_disclaimer: str

    def as_dict(self) -> dict:
        return {
            "amount_local": self.amount_local,
            "currency": self.currency,
            "amount_sats": self.amount_sats,
            "fee_sats": self.fee_sats,
            "total_sats": self.total_sats,
            "demo_rate_fcfa_per_btc": self.demo_rate_fcfa_per_btc,
            "quote_version": self.quote_version,
            "quoted_at": self.quoted_at.isoformat().replace("+00:00", "Z"),
            "expires_at": self.expires_at.isoformat().replace("+00:00", "Z"),
            "is_fictional_rate": self.is_fictional_rate,
            "is_lnd_fee_estimate": self.is_lnd_fee_estimate,
            "lnd_fee_estimate_available": False,
            "disclaimer": self.disclaimer,
            "fee_disclaimer": self.fee_disclaimer,
        }


def build_quote(amount_local: int, currency: str, *, now: datetime | None = None) -> DemoQuote:
    if not isinstance(amount_local, int) or isinstance(amount_local, bool):
        raise QuoteError("Le montant local doit être un entier.")
    if amount_local < min_amount_local():
        raise QuoteError(f"Saisissez un montant entier d'au moins {min_amount_local()} FCFA.")
    if amount_local > max_amount_local():
        raise QuoteError(f"Montant supérieur au plafond de démonstration ({max_amount_local()} FCFA).")
    if currency not in {"XOF", "XAF"}:
        raise QuoteError("Devise non prise en charge pour ce devis de démonstration.")

    rate = demo_fcfa_per_btc()
    amount_sats = fcfa_to_sats(amount_local, rate)
    fee = demo_fee_sats() if amount_local > 0 else 0
    quoted_at = now or timezone.now()
    return DemoQuote(
        amount_local=amount_local,
        currency=currency,
        amount_sats=amount_sats,
        fee_sats=fee,
        total_sats=amount_sats + fee,
        demo_rate_fcfa_per_btc=rate,
        quote_version=quote_version(),
        quoted_at=quoted_at,
        expires_at=quoted_at + quote_ttl(),
        is_fictional_rate=True,
        is_lnd_fee_estimate=False,
        disclaimer=RATE_DISCLAIMER,
        fee_disclaimer=FEE_DISCLAIMER,
    )
