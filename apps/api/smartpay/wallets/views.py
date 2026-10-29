from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.payments.providers import get_payment_provider
from smartpay.payments.providers.errors import LndError, LndUnavailable
from smartpay.wallets.models import WalletConnection
from smartpay.wallets.serializers import WalletConnectionSerializer


class WalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        provider_name = getattr(settings, "PAYMENT_PROVIDER", "mock")
        wanted = (
            WalletConnection.Provider.LND_REGTEST
            if provider_name == "lnd_regtest"
            else WalletConnection.Provider.MOCK
        )
        defaults = {
            "public_identifier": f"{wanted}-wallet-{request.user.pk}",
            "alias": "Portefeuille Mock P01" if wanted == WalletConnection.Provider.MOCK else "Nœud LND Regtest",
            "mock_balance_sats": 0,
            "is_active": True,
        }
        wallet, _created = WalletConnection.objects.get_or_create(
            user=request.user,
            provider=wanted,
            defaults=defaults,
        )
        context = {
            "is_lightning_connected": False,
            "channel_balance_sats": 0,
        }
        if wanted == WalletConnection.Provider.LND_REGTEST:
            try:
                node = get_payment_provider().get_node_info()
                context["is_lightning_connected"] = node.connected
                if node.pubkey:
                    wallet.node_pubkey = node.pubkey[:66]
                    wallet.alias = node.alias or wallet.alias
                    wallet.public_identifier = node.pubkey
                    wallet.save(update_fields=["node_pubkey", "alias", "public_identifier", "updated_at"])
                if node.connected:
                    context["channel_balance_sats"] = get_payment_provider().get_channel_balance_sats()
            except (LndUnavailable, LndError):
                context["is_lightning_connected"] = False
        return Response(WalletConnectionSerializer(wallet, context=context).data)
