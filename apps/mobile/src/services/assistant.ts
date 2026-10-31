import type {
  AssistantConversation,
  AssistantMessage,
  AssistantMessageExchange,
  Paginated,
} from "@smartpay/contracts";

import { collectAllPages, newAssistantIdempotencyKey } from "../lib/assistantChat";
import { api } from "./api";

export async function createConversation(title = ""): Promise<AssistantConversation> {
  return api.request<AssistantConversation>("/api/v1/ai/conversations/", {
    method: "POST",
    body: title ? { title } : {},
  });
}

export async function listConversations(): Promise<AssistantConversation[]> {
  return collectAllPages("/api/v1/ai/conversations/?page_size=100", (path) =>
    api.request<Paginated<AssistantConversation>>(path),
  );
}

export async function fetchConversation(id: string): Promise<AssistantConversation> {
  return api.request<AssistantConversation>(`/api/v1/ai/conversations/${id}/`);
}

export async function listMessages(conversationId: string): Promise<AssistantMessage[]> {
  return collectAllPages(
    `/api/v1/ai/conversations/${conversationId}/messages/?page_size=100`,
    (path) => api.request<Paginated<AssistantMessage>>(path),
  );
}

export async function sendAssistantMessage(input: {
  conversationId: string;
  content: string;
  idempotencyKey?: string;
}): Promise<AssistantMessageExchange> {
  const key = input.idempotencyKey ?? newAssistantIdempotencyKey();
  return api.request<AssistantMessageExchange>(
    `/api/v1/ai/conversations/${input.conversationId}/messages/`,
    {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: { content: input.content, idempotency_key: key },
    },
  );
}
