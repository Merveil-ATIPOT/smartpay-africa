from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.ai_assistant.models import Conversation
from smartpay.ai_assistant.serializers import (
    ConversationSerializer,
    CreateConversationSerializer,
    CreateMessageSerializer,
    MessageExchangeSerializer,
    MessageSerializer,
)
from smartpay.ai_assistant.services import create_conversation, get_owned_conversation, post_user_message
from smartpay.ai_assistant.throttling import AssistantMessageRateThrottle
from smartpay.core.pagination import SmartPayPagination


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ConversationSerializer(many=True)})
    def get(self, request):
        qs = (
            Conversation.objects.filter(owner=request.user)
            .annotate(message_count=Count("messages"))
            .order_by("-updated_at", "-created_at", "id")
        )
        paginator = SmartPayPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(ConversationSerializer(page, many=True).data)

    @extend_schema(request=CreateConversationSerializer, responses={201: ConversationSerializer})
    def post(self, request):
        serializer = CreateConversationSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        conversation = create_conversation(
            user=request.user,
            title=serializer.validated_data.get("title", ""),
        )
        return Response(ConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)


class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ConversationSerializer})
    def get(self, request, conversation_id):
        conversation = get_owned_conversation(request.user, conversation_id)
        conversation.message_count = conversation.messages.count()
        return Response(ConversationSerializer(conversation).data)


class ConversationMessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if self.request.method == "POST":
            return [AssistantMessageRateThrottle()]
        return []

    @extend_schema(responses={200: MessageSerializer(many=True)})
    def get(self, request, conversation_id):
        conversation = get_owned_conversation(request.user, conversation_id)
        qs = conversation.messages.order_by("created_at", "id")
        paginator = SmartPayPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(MessageSerializer(page, many=True).data)

    @extend_schema(request=CreateMessageSerializer, responses={201: MessageExchangeSerializer})
    def post(self, request, conversation_id):
        serializer = CreateMessageSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        user_message, assistant_message, replayed = post_user_message(
            user=request.user,
            conversation_id=conversation_id,
            content=serializer.validated_data["content"],
            idempotency_key=serializer.validated_data.get("idempotency_key", ""),
            request=request,
        )
        payload = MessageExchangeSerializer(
            {
                "user_message": user_message,
                "assistant_message": assistant_message,
            }
        ).data
        return Response(
            payload,
            status=status.HTTP_200_OK if replayed else status.HTTP_201_CREATED,
        )
