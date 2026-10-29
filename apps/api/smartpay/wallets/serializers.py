from rest_framework import serializers

from smartpay.wallets.models import WalletConnection

MOCK_WALLET_WARNING = (
    "Solde Mock uniquement. Ce n'est pas un solde de canal Lightning."
)
LND_WALLET_WARNING = (
    "Solde de canal LND Regtest. Aucun macaroon ni seed n'est exposé au client."
)


class WalletConnectionSerializer(serializers.ModelSerializer):
    is_lightning_connected = serializers.SerializerMethodField()
    channel_balance_sats = serializers.SerializerMethodField()
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
            "channel_balance_sats",
            "is_lightning_connected",
            "connected_at",
            "warnings",
        )
        read_only_fields = fields

    def get_is_lightning_connected(self, obj) -> bool:
        return bool(self.context.get("is_lightning_connected"))

    def get_channel_balance_sats(self, obj) -> int:
        return int(self.context.get("channel_balance_sats") or 0)

    def get_warnings(self, obj) -> list[str]:
        if obj.provider == WalletConnection.Provider.LND_REGTEST:
            return [LND_WALLET_WARNING]
        return [MOCK_WALLET_WARNING]
