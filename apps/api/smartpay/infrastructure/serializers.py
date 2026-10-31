"""Schéma whitelist de supervision. Aucun secret, aucune pubkey, aucune URI."""

from rest_framework import serializers


class InfrastructureNodeSerializer(serializers.Serializer):
    alias = serializers.CharField(allow_null=True)
    connected = serializers.BooleanField()
    synced_to_chain = serializers.BooleanField(allow_null=True)
    block_height = serializers.IntegerField(allow_null=True)
    num_active_channels = serializers.IntegerField(allow_null=True)
    num_peers = serializers.IntegerField(allow_null=True)
    channel_balance_sats = serializers.IntegerField(allow_null=True)
    status = serializers.ChoiceField(choices=("connected", "unavailable", "timeout", "not_configured"))


class BitcoinCoreSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=("not_verified",))
    verified = serializers.BooleanField()
    note = serializers.CharField()


class DjangoStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=("ok",))
    service = serializers.CharField()
    version = serializers.CharField()
    network = serializers.CharField()
    payment_provider = serializers.CharField()


class PostgresStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=("up", "down"))


class PaymentsCountersSerializer(serializers.Serializer):
    recorded_count = serializers.IntegerField()
    lightning_settled_count = serializers.IntegerField()
    note = serializers.CharField()


class InfrastructureSnapshotSerializer(serializers.Serializer):
    checked_at = serializers.CharField()
    cache_hit = serializers.BooleanField()
    network = serializers.CharField()
    payment_provider = serializers.CharField()
    warnings = serializers.ListField(child=serializers.CharField())
    alice = InfrastructureNodeSerializer()
    bob = InfrastructureNodeSerializer()
    bitcoin_core = BitcoinCoreSerializer()
    django = DjangoStatusSerializer()
    postgres = PostgresStatusSerializer()
    payments = PaymentsCountersSerializer()
