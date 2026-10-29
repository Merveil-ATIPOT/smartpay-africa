from rest_framework import serializers

from smartpay.transfers.models import Transfer, TransferSimulation


class TransferSimulationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransferSimulation
        fields = (
            "id",
            "source_country",
            "destination_country",
            "amount_sats",
            "status",
            "disclaimer",
            "created_at",
        )
        read_only_fields = fields


class TransferSerializer(serializers.ModelSerializer):
    warnings = serializers.SerializerMethodField()
    quote_current = serializers.SerializerMethodField()

    class Meta:
        model = Transfer
        fields = (
            "id",
            "public_reference",
            "source_country",
            "destination_country",
            "currency",
            "operator",
            "beneficiary_name",
            "phone_number",
            "reason",
            "amount_local",
            "demo_rate_fcfa_per_btc",
            "amount_sats",
            "fee_sats",
            "total_sats",
            "quote_version",
            "quoted_at",
            "quote_expires_at",
            "status",
            "execution_mode",
            "lightning_payment_id",
            "lightning_payment_hash",
            "lightning_settled_at",
            "mobile_money_credit_status",
            "simulated_credit_reference",
            "invoice_amount_sats",
            "lnd_fee_sats_estimated",
            "lnd_fee_sats_paid",
            "total_debited_sats",
            "disclaimer",
            "created_at",
            "updated_at",
            "quote_current",
            "warnings",
        )
        read_only_fields = fields

    def get_warnings(self, obj) -> list[str]:
        warnings = [
            "Taux de démonstration fictif.",
            "fee_sats est un frais de démonstration B1, distinct des frais réseau LND.",
            "Les passerelles Mobile Money sont simulées.",
        ]
        if obj.status in {"draft", "quoted", "ready"}:
            warnings.append("La consultation ne déclenche aucun paiement Lightning.")
        if obj.lightning_settled_at:
            warnings.append("Règlement Lightning uniquement après lookup Alice SUCCEEDED et Bob SETTLED.")
        if obj.mobile_money_credit_status == "simulated":
            warnings.append("Crédit Mobile Money fictif. Aucun opérateur réel n'a été contacté.")
        return warnings

    def get_quote_current(self, obj) -> bool:
        from smartpay.transfers.services import quote_is_current

        return quote_is_current(obj)


class TransferStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transfer
        fields = ("id", "public_reference", "status", "execution_mode", "updated_at")
        read_only_fields = fields


class CreateTransferSerializer(serializers.Serializer):
    source_country = serializers.CharField(max_length=2, required=False, allow_blank=True, default="")
    destination_country = serializers.CharField(max_length=2, required=False, allow_blank=True, default="")
    operator = serializers.CharField(max_length=16, required=False, allow_blank=True, default="")
    beneficiary_name = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    phone_number = serializers.CharField(max_length=24, required=False, allow_blank=True, default="")
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    amount_local = serializers.IntegerField(min_value=0, required=False, default=0)
    idempotency_key = serializers.CharField(max_length=64, required=False, allow_blank=True, default="")


class UpdateTransferSerializer(serializers.Serializer):
    source_country = serializers.CharField(max_length=2, required=False)
    destination_country = serializers.CharField(max_length=2, required=False)
    operator = serializers.CharField(max_length=16, required=False, allow_blank=True)
    beneficiary_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=24, required=False, allow_blank=True)
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    amount_local = serializers.IntegerField(min_value=0, required=False)


class QuoteRequestSerializer(serializers.Serializer):
    amount_local = serializers.IntegerField(min_value=0, required=False)
    destination_country = serializers.CharField(max_length=2, required=False, allow_blank=True)
