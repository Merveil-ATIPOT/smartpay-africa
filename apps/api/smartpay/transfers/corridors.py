"""Catalogue des corridors de démonstration.

Les passerelles Mobile Money sont simulées. Aucune intégration officielle
Wave, Orange Money, MTN, Moov, Airtel ou T-Money n'est implémentée.
"""

from __future__ import annotations

from dataclasses import dataclass

SOURCE_COUNTRIES = ("SN", "CG", "CI")
DESTINATION_CODES = ("SN", "CI", "CG", "CM", "BJ", "TG", "FR")
OPERATOR_IDS = ("wave", "orange", "mtn", "free", "airtel", "moov", "tmoney")

CATALOG_DISCLAIMER = (
    "Catalogue de démonstration. Les passerelles Mobile Money sont simulées. "
    "Aucune intégration officielle avec Wave, Orange Money, MTN, Moov, Airtel ou T-Money."
)


@dataclass(frozen=True)
class Operator:
    id: str
    label: str
    short_label: str


@dataclass(frozen=True)
class Corridor:
    code: str
    name: str
    currency: str
    region: str
    recommended: bool
    available: bool
    operators: tuple[Operator, ...]
    dial_code: str
    national_lengths: tuple[int, ...]
    simulated_gateway: bool = True


WAVE = Operator("wave", "Wave", "Wave")
ORANGE = Operator("orange", "Orange Money", "Orange")
MTN = Operator("mtn", "MTN Money", "MTN")
MTN_CM = Operator("mtn", "MTN Mobile Money", "MTN")
FREE = Operator("free", "Free Money", "Free Money")
AIRTEL = Operator("airtel", "Airtel Money", "Airtel")
MOOV = Operator("moov", "Moov Money", "Moov")
TMONEY = Operator("tmoney", "T-Money", "T-Money")

CORRIDORS: tuple[Corridor, ...] = (
    Corridor("SN", "Sénégal", "XOF", "uemoa", True, True, (WAVE, ORANGE, FREE), "+221", (9,)),
    Corridor("CI", "Côte d'Ivoire", "XOF", "uemoa", True, True, (WAVE, MTN, ORANGE), "+225", (8, 10)),
    Corridor("CG", "Congo-Brazzaville", "XAF", "cemac", True, True, (MTN, AIRTEL), "+242", (9,)),
    Corridor("CM", "Cameroun", "XAF", "cemac", False, True, (MTN_CM, ORANGE), "+237", (9,)),
    Corridor("BJ", "Bénin", "XOF", "uemoa", False, True, (MTN, MOOV), "+229", (8,)),
    Corridor("TG", "Togo", "XOF", "uemoa", False, True, (TMONEY, MOOV), "+228", (8,)),
    Corridor("FR", "France / Europe", "EUR", "intl", False, False, (), "+33", (9,)),
)

AVAILABLE_DESTINATIONS = tuple(item.code for item in CORRIDORS if item.available)


def get_corridor(code: str | None) -> Corridor | None:
    if not code:
        return None
    needle = code.strip().upper()
    return next((item for item in CORRIDORS if item.code == needle), None)


def list_destinations() -> tuple[Corridor, ...]:
    return CORRIDORS


def operators_for(code: str) -> tuple[Operator, ...]:
    corridor = get_corridor(code)
    if corridor is None or not corridor.available:
        return ()
    return corridor.operators


def operator_allowed(code: str, operator: str | None) -> bool:
    if not operator:
        return False
    return any(item.id == operator for item in operators_for(code))


def destination_available(code: str) -> bool:
    corridor = get_corridor(code)
    return bool(corridor and corridor.available)
