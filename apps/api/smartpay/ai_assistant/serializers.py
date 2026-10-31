from rest_framework import serializers

from smartpay.ai_assistant.models import Conversation, Message
from smartpay.ai_assistant.services import MAX_QUESTION_LENGTH


class ConversationSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Conversation
        fields = ("id", "title", "created_at", "updated_at", "message_count")
        read_only_fields = fields


class CreateConversationSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True, max_length=120)


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "role", "content", "response_type", "created_at")
        read_only_fields = fields


class CreateMessageSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=MAX_QUESTION_LENGTH)
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=64)

    def validate_content(self, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Le message ne peut pas être vide.")
        return cleaned


class MessageExchangeSerializer(serializers.Serializer):
    user_message = MessageSerializer()
    assistant_message = MessageSerializer()
