from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.wallets.models import WalletConnection
from smartpay.wallets.serializers import WalletConnectionSerializer


class WalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, _created = WalletConnection.objects.get_or_create(
            user=request.user,
            provider=WalletConnection.Provider.MOCK,
            defaults={
                "public_identifier": f"mock-wallet-{request.user.pk}",
                "alias": "Portefeuille Mock P01",
                "mock_balance_sats": 0,
                "is_active": True,
            },
        )
        return Response(WalletConnectionSerializer(wallet).data)
