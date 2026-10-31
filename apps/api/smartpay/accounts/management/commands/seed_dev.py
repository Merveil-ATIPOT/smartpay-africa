import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from smartpay.exchange_rates.models import ExchangeRate, PLACEHOLDER_DISCLAIMER
from smartpay.merchants.models import Merchant
from smartpay.transfers.models import TransferSimulation

User = get_user_model()


class Command(BaseCommand):
    help = "Crée des comptes de développement locaux. Ne pas utiliser en production."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            self.stderr.write("seed_dev refusé hors DEBUG.")
            return

        admin_email = os.environ.get("DEV_ADMIN_EMAIL") or "admin@smartpay.local"
        user_email = os.environ.get("DEV_USER_EMAIL") or "user@smartpay.local"
        admin_password = os.environ.get("DEV_ADMIN_PASSWORD", "changeme-local-only")
        user_password = os.environ.get("DEV_USER_PASSWORD", "changeme-local-only")

        admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "country": User.Country.SN,
            },
        )
        if created:
            admin.set_password(admin_password)
            admin.save()
        # Compte de démonstration mobile (LoginScreen). Pays de départ SN / Dakar.
        # Les rôles Country.CG et Country.CI restent valides pour d'autres utilisateurs.
        user, created_user = User.objects.get_or_create(
            email=user_email,
            defaults={"role": User.Role.INDIVIDUAL, "country": User.Country.SN},
        )
        if created_user:
            user.set_password(user_password)
            user.save()

        Merchant.objects.get_or_create(
            owner=user,
            legal_name="Boutique Demo SmartPay",
            defaults={
                "display_name": "Boutique Demo",
                "country": User.Country.SN,
                "status": Merchant.Status.ACTIVE,
            },
        )
        TransferSimulation.objects.get_or_create(
            initiator=user,
            source_country="CG",
            destination_country="SN",
            amount_sats=10_000,
            defaults={"status": TransferSimulation.Status.CREATED},
        )
        ExchangeRate.objects.get_or_create(
            pair="BTC_XOF_PLACEHOLDER",
            defaults={
                "is_placeholder": True,
                "source": "not_a_market_rate",
                "value": None,
                "disclaimer": PLACEHOLDER_DISCLAIMER,
            },
        )
        self.stdout.write(self.style.SUCCESS("Comptes de développement prêts."))
