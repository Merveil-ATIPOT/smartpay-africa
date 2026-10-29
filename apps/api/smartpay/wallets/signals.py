from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from smartpay.wallets.models import WalletConnection

User = get_user_model()


@receiver(post_save, sender=User)
def provision_mock_wallet(sender, instance, created, **kwargs):
    if not created:
        return
    WalletConnection.objects.get_or_create(
        user=instance,
        provider=WalletConnection.Provider.MOCK,
        defaults={
            "public_identifier": f"mock-wallet-{instance.pk}",
            "alias": "Portefeuille Mock P01",
            "mock_balance_sats": 0,
            "is_active": True,
        },
    )
