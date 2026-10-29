from rest_framework import serializers

from smartpay.transfers.models import TransferSimulation


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
