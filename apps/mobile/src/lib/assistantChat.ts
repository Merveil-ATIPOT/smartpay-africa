import type { AssistantConversation, AssistantMessage, Paginated } from "@smartpay/contracts";

export const ASSISTANT_CHAT_TITLE = "Assistant IA SmartPay";
export const ASSISTANT_CHAT_BADGE = "Regtest · Démo";
export const ASSISTANT_CHAT_MODE = "Mode conseil";
export const ASSISTANT_CHAT_SECRET_BANNER =
  "Ne partagez jamais vos clés privées, seeds, mots de passe ou codes PIN.";
export const ASSISTANT_CHAT_PLACEHOLDER = "Posez votre question…";
export const ASSISTANT_CHAT_EMPTY_TITLE = "Aucun message";
export const ASSISTANT_CHAT_EMPTY_SUBTITLE =
  "Posez une question sur Bitcoin, Lightning, les frais, les transferts simulés ou la sécurité.";
export const ASSISTANT_CHAT_FOOTER = "L'IA ne peut pas initier de transaction financière.";
const FORBIDDEN_CHAT_CLAIMS = [
  /#?sn-8924/i,
  /0[.,]8\s*s/i,
  /99[.,]9\s*%/i,
  /smartpay ai v2\.4/i,
  /connecté au n[œo]ud lightning/i,
];

export function newAssistantIdempotencyKey(now = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `ai03-${now}-${rand}`;
}

export function formatMessageTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) {
    return "";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function mergeExchange(
  current: readonly AssistantMessage[],
  userMessage: AssistantMessage,
  assistantMessage: AssistantMessage,
): AssistantMessage[] {
  const seen = new Set(current.map((item) => item.id));
  const next = [...current];
  if (!seen.has(userMessage.id)) {
    next.push(userMessage);
  }
  if (!seen.has(assistantMessage.id)) {
    next.push(assistantMessage);
  }
  return next.sort((left, right) => {
    const delta = Date.parse(left.created_at) - Date.parse(right.created_at);
    return Number.isNaN(delta) ? 0 : delta;
  });
}

export function conversationPreview(item: AssistantConversation): string {
  const title = item.title.trim();
  return title || "Nouvelle conversation";
}

export function nextPagePath(next: string | null | undefined): string | null {
  if (!next) {
    return null;
  }
  try {
    const url = new URL(next);
    return `${url.pathname}${url.search}`;
  } catch {
    return next.startsWith("/") ? next : null;
  }
}

export async function collectAllPages<T>(
  firstPath: string,
  request: (path: string) => Promise<Paginated<T>>,
  maxPages = 10,
): Promise<T[]> {
  const items: T[] = [];
  let path: string | null = firstPath;
  let pages = 0;
  while (path && pages < maxPages) {
    const page = await request(path);
    items.push(...(page.results ?? []));
    const following = nextPagePath(page.next);
    path = following && following !== path ? following : null;
    pages += 1;
  }
  return items;
}

export function sortConversationsForDisplay(
  items: readonly AssistantConversation[],
): AssistantConversation[] {
  return [...items].sort((left, right) => {
    const leftCount = left.message_count ?? 0;
    const rightCount = right.message_count ?? 0;
    if (leftCount > 0 && rightCount === 0) {
      return -1;
    }
    if (leftCount === 0 && rightCount > 0) {
      return 1;
    }
    return Date.parse(right.updated_at) - Date.parse(left.updated_at);
  });
}

export function pickResumeConversation(
  items: readonly AssistantConversation[],
): AssistantConversation | null {
  const ranked = sortConversationsForDisplay(items);
  const withMessages = ranked.find((item) => (item.message_count ?? 0) > 0);
  return withMessages ?? ranked[0] ?? null;
}

export function assistantChatCopyHasForbiddenClaim(copy: string): boolean {
  return FORBIDDEN_CHAT_CLAIMS.some((pattern) => pattern.test(copy));
}

export function visibleAssistantChatCopy(): string {
  return [
    ASSISTANT_CHAT_TITLE,
    ASSISTANT_CHAT_BADGE,
    ASSISTANT_CHAT_MODE,
    ASSISTANT_CHAT_SECRET_BANNER,
    ASSISTANT_CHAT_EMPTY_TITLE,
    ASSISTANT_CHAT_EMPTY_SUBTITLE,
    ASSISTANT_CHAT_FOOTER,
  ].join("\n");
}
