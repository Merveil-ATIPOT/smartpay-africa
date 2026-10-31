"""Serializer whitelist des journaux d'audit. Jamais metadata brute, jamais d'IP."""

from rest_framework import serializers

from smartpay.audit.directory import audit_category, audit_severity, sanitize_metadata


class AuditActorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()


class AuditSeveritySerializer(serializers.Serializer):
    key = serializers.ChoiceField(choices=("info", "warning", "unclassified"))
    label = serializers.CharField()


class AdminAuditLogSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    action = serializers.CharField()
    resource_type = serializers.CharField()
    resource_id = serializers.CharField()
    actor = AuditActorSerializer(allow_null=True)
    category = serializers.CharField()
    severity = AuditSeveritySerializer()
    metadata_safe = serializers.DictField()

    def to_representation(self, instance):
        actor = None
        if getattr(instance, "actor_id", None) and instance.actor is not None:
            actor = {"id": instance.actor.id, "email": instance.actor.email}
        return {
            "id": instance.id,
            "created_at": instance.created_at,
            "action": instance.action,
            "resource_type": instance.resource_type,
            "resource_id": instance.resource_id,
            "actor": actor,
            "category": audit_category(instance.action),
            "severity": audit_severity(instance.action),
            "metadata_safe": sanitize_metadata(instance.metadata),
        }
