from django.conf import settings
from rest_framework import serializers

from smartpay.payments.models import Payment, PaymentInvoice
from smartpay.payments.providers.lnd_regtest import REGTEST_WARNING
from smartpay.payments.providers.mock import MOCK_WARNING


class PaymentInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentInvoice
        fields = (
            "encoded_invoice",
            "payment_hash",
            "memo",
            "expires_at",
            "is_mock",
        )
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    invoice = PaymentInvoiceSerializer(read_only=True)
    warnings = serializers.SerializerMethodField()
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
            "network",
            "direction",
            "idempotency_key",
            "provider_reference",
            "encoded_invoice",
            "failure_reason",
            "expires_at",
            "created_at",
            "updated_at",
            "invoice",
            "warnings",
        )
        read_only_fields = fields

    def get_warnings(self, obj) -> list[str]:
        if obj.settlement_mode == Payment.SettlementMode.MOCK:
            warnings = [MOCK_WARNING]
            if obj.status == Payment.Status.CONFIRMED and not obj.is_lightning_settled:
                warnings.append(
                    "Statut métier 'confirmed' : accusé de réception Mock, pas un règlement Lightning."
                )
            return warnings
        warnings = [REGTEST_WARNING]
        if obj.is_lightning_settled:
            warnings.append("Règlement Lightning Regtest confirmé par lookup LND.")
        return warnings

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


class CreateInvoiceSerializer(serializers.Serializer):
    amount_sats = serializers.IntegerField(min_value=1, max_value=settings.MAX_PAYMENT_AMOUNT_SATS)
    memo = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    expiry_seconds = serializers.IntegerField(min_value=60, max_value=86_400, required=False, default=3600)


class PreviewPaymentSerializer(serializers.Serializer):
    amount_sats = serializers.IntegerField(min_value=1, max_value=settings.MAX_PAYMENT_AMOUNT_SATS)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    encoded_invoice = serializers.CharField(required=False, allow_blank=True, default="")


class CreatePaymentSerializer(serializers.Serializer):
    amount_sats = serializers.IntegerField(min_value=1, max_value=settings.MAX_PAYMENT_AMOUNT_SATS)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    merchant_id = serializers.IntegerField(required=False)
    idempotency_key = serializers.CharField(max_length=64, required=False, allow_blank=True, default="")
    encoded_invoice = serializers.CharField(required=False, allow_blank=True, default="")
    confirm = serializers.BooleanField(required=False, default=True)
