from rest_framework import serializers

from smartpay.wallets.models import WalletConnection

MOCK_WALLET_WARNING = (
    "Solde Mock uniquement. Ce n'est pas un solde de canal Lightning "
    "et aucune connexion LND n'est active en P01."
)


class WalletConnectionSerializer(serializers.ModelSerializer):
    is_lightning_connected = serializers.SerializerMethodField()
    warnings = serializers.SerializerMethodField()

    class Meta:
        model = WalletConnection
        fields = (
            "id",
            "provider",
            "public_identifier",
            "node_pubkey",
            "alias",
            "is_active",
            "mock_balance_sats",
            "is_lightning_connected",
            "connected_at",
            "warnings",
        )
        read_only_fields = fields

    def get_is_lightning_connected(self, obj) -> bool:
        return False

    def get_warnings(self, obj) -> list[str]:
        return [MOCK_WALLET_WARNING]
