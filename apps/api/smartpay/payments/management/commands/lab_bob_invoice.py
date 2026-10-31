from django.core.management.base import BaseCommand, CommandError

from smartpay.payments.providers import get_lab_counterparty_provider


class Command(BaseCommand):
    help = "Crée une facture BOLT11 sur Bob (laboratoire). N'utilise pas le portefeuille utilisateur."

    def add_arguments(self, parser):
        parser.add_argument("--amount-sats", type=int, default=2500)
        parser.add_argument("--memo", default="Facture SmartPay Africa")

    def handle(self, *args, **options):
        provider = get_lab_counterparty_provider()
        if provider is None:
            raise CommandError(
                "Contrepartie Bob indisponible. Activez LAB_COUNTERPARTY_ENABLED et les chemins LND_BOB_*."
            )
        draft = provider.create_invoice(
            amount_sats=options["amount_sats"],
            memo=options["memo"],
            expiry_seconds=3600,
        )
        self.stdout.write(draft.encoded_invoice)
        self.stdout.write(f"payment_hash={draft.payment_hash}")
        self.stdout.write("Cette facture est Bob, pas le portefeuille utilisateur.")
