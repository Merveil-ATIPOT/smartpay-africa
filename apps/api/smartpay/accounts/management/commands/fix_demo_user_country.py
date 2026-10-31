"""Correction ciblée du pays du compte de démonstration mobile.

Lecture seule par défaut. Aucune écriture sans --apply.
Ne touche pas aux administrateurs ni aux autres utilisateurs.
Ne supprime aucune simulation de transfert.
"""

from __future__ import annotations

import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from smartpay.merchants.models import Merchant
from smartpay.transfers.models import TransferSimulation

User = get_user_model()

EXPECTED_COUNTRY = User.Country.SN
DEMO_MERCHANT_LEGAL_NAME = "Boutique Demo SmartPay"


def demo_user_email() -> str:
    return os.environ.get("DEV_USER_EMAIL") or "user@smartpay.local"


class Command(BaseCommand):
    help = "Affiche (et optionnellement corrige) le pays SN du compte de démonstration mobile."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Écrit country=SN pour le seul compte de démonstration. Refusé sans DEBUG.",
        )

    def handle(self, *args, **options):
        email = demo_user_email()
        apply = bool(options["apply"])
        user = User.objects.filter(email=email).first()
        if user is None:
            self.stderr.write(f"Compte introuvable : {email}")
            return

        merchants = list(Merchant.objects.filter(owner=user, legal_name=DEMO_MERCHANT_LEGAL_NAME))
        simulations = TransferSimulation.objects.filter(initiator=user).count()

        self.stdout.write("Compte de démonstration (identifiants non sensibles)")
        self.stdout.write(f"  id={user.id}")
        self.stdout.write(f"  email={user.email}")
        self.stdout.write(f"  role={user.role}")
        self.stdout.write(f"  is_staff={user.is_staff}")
        self.stdout.write(f"  country actuel={user.country}")
        self.stdout.write(f"  country attendu={EXPECTED_COUNTRY}")
        if merchants:
            for merchant in merchants:
                self.stdout.write(
                    f"  boutique id={merchant.id} legal_name={merchant.legal_name} country={merchant.country}"
                )
        else:
            self.stdout.write("  boutique Django : aucune")
        self.stdout.write(f"  simulations de transfert conservées={simulations}")

        if user.country == EXPECTED_COUNTRY and all(item.country == EXPECTED_COUNTRY for item in merchants):
            self.stdout.write(self.style.SUCCESS("Aucune correction nécessaire."))
            return

        if not apply:
            self.stdout.write(
                "Aucune écriture effectuée. Relancer avec --apply après autorisation explicite."
            )
            return

        if not settings.DEBUG:
            self.stderr.write("Écriture refusée hors DEBUG.")
            return

        if user.role == User.Role.ADMIN or user.is_staff or user.is_superuser:
            self.stderr.write("Refus : ce compte n'est pas le particulier de démonstration.")
            return

        previous = user.country
        user.country = EXPECTED_COUNTRY
        user.save(update_fields=["country"])
        self.stdout.write(f"Utilisateur {user.email} : {previous} → {user.country}")
        for merchant in merchants:
            if merchant.country != EXPECTED_COUNTRY:
                before = merchant.country
                merchant.country = EXPECTED_COUNTRY
                merchant.save(update_fields=["country"])
                self.stdout.write(f"Boutique {merchant.id} : {before} → {merchant.country}")
        self.stdout.write(self.style.SUCCESS("Correction ciblée appliquée. Simulations inchangées."))
