"""Validation de format téléphonique. Aucun compte Mobile Money n'est interrogé."""

from __future__ import annotations

from smartpay.transfers.corridors import CORRIDORS, get_corridor


def digits_only(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


def national_number(raw: str, dial_code: str) -> str:
    digits = digits_only(raw)
    prefix = digits_only(dial_code)
    if prefix and digits.startswith(prefix):
        digits = digits[len(prefix) :]
    corridor = next((item for item in CORRIDORS if item.dial_code == dial_code), None)
    lengths = corridor.national_lengths if corridor else (8,)
    if digits.startswith("0") and (len(digits) - 1) in lengths:
        digits = digits[1:]
    return digits


def normalize_e164(country: str, raw: str) -> str:
    corridor = get_corridor(country)
    if corridor is None:
        raise ValueError("Pays de destination manquant.")
    national = national_number(raw, corridor.dial_code)
    if len(national) not in corridor.national_lengths:
        allowed = " ou ".join(str(item) for item in corridor.national_lengths)
        raise ValueError(
            f"Le numéro {corridor.dial_code} doit contenir {allowed} chiffres nationaux. "
            "Aucun compte Mobile Money n'est interrogé."
        )
    return f"{corridor.dial_code}{national}"
