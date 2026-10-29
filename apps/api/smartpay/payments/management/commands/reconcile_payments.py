from django.core.management.base import BaseCommand

from smartpay.payments.models import Payment
from smartpay.payments.reconciliation import reconcile_payment


class Command(BaseCommand):
    help = "Réconcilie les paiements pending avec LND. Un HTTP 200 n'est jamais une preuve de règlement."

    def handle(self, *args, **options):
        qs = Payment.objects.filter(status=Payment.Status.PENDING)
        count = 0
        for payment in qs:
            reconcile_payment(payment)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Paiements examinés: {count}"))
