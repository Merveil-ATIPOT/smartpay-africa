from django.urls import path

from smartpay.ai_assistant.views import ConversationDetailView, ConversationListCreateView, ConversationMessageListCreateView

urlpatterns = [
    path("ai/conversations/", ConversationListCreateView.as_view(), name="ai-conversations"),
    path(
        "ai/conversations/<uuid:conversation_id>/",
        ConversationDetailView.as_view(),
        name="ai-conversation-detail",
    ),
    path(
        "ai/conversations/<uuid:conversation_id>/messages/",
        ConversationMessageListCreateView.as_view(),
        name="ai-conversation-messages",
    ),
]
