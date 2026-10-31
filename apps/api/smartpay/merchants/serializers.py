from rest_framework import serializers

from smartpay.accounts.models import User
from smartpay.merchants.models import Merchant
from smartpay.payments.models import Payment


class AdminMerchantOwnerSerializer(serializers.ModelSerializer):
    """Propriétaire du marchand. Liste blanche. Aucun secret."""

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name")
        read_only_fields = fields


class AdminMerchantSerializer(serializers.ModelSerializer):
    """Lecture administrateur. Aucun secret Lightning ni jeton."""

    owner = AdminMerchantOwnerSerializer(read_only=True)
    payment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Merchant
        fields = (
            "id",
            "legal_name",
            "display_name",
            "country",
            "registration_number",
            "status",
            "created_at",
            "updated_at",
            "owner",
            "payment_count",
        )
        read_only_fields = fields


class AdminMerchantLinkedPaymentSerializer(serializers.ModelSerializer):
    """Paiement lié au marchand. Sans facture BOLT11 ni identifiant LND."""

    lightning_status = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "amount_sats",
            "description",
            "status",
            "settlement_mode",
            "is_lightning_settled",
            "lightning_status",
            "direction",
            "network",
            "created_at",
            "failure_reason",
        )
        read_only_fields = fields

    def get_lightning_status(self, obj) -> str:
        if obj.settlement_mode == Payment.SettlementMode.MOCK:
            return "not_applicable"
        if obj.is_lightning_settled:
            return "settled"
        if obj.status == Payment.Status.FAILED:
            return "failed"
        if obj.status == Payment.Status.EXPIRED:
            return "expired"
        return "pending"
