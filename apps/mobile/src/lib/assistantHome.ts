import type { Payment, UserRole } from "@smartpay/contracts";

import { formatSats } from "./format";
import { statusLabel, uiPaymentState } from "./paymentStatus";

export const ASSISTANT_HOME_TITLE = "Assistant IA SmartPay";
export const ASSISTANT_REGTEST_BADGE = "Regtest · Démo";
export const ASSISTANT_GENIUS_NAME = "SmartPay Genius";
export const ASSISTANT_GENIUS_STATUS = "Mode conseil · Regtest";
export const ASSISTANT_GENERIC_GREETING = "Bonjour !";
export const ASSISTANT_QUESTION_PREVIEW = "Poser une question…";
export const ASSISTANT_QUESTION_PREVIEW_HINT =
  "Choisissez une suggestion ou démarrez une conversation. Vous pourrez modifier la question avant de l'envoyer.";
export const ASSISTANT_START_LABEL = "Nouvelle conversation";
export const ASSISTANT_START_HINT = "Vos questions restent pédagogiques. Aucun paiement n'est déclenché.";
export const ASSISTANT_CONVERSATION_ENABLED = true;
export const ASSISTANT_PAYMENTS_LIST_PATH = "/api/v1/payments/";
export const ASSISTANT_PAYMENT_DETAIL_PATH = "/api/v1/payments/{id}/";
export const ASSISTANT_LAST_OP_EMPTY_TITLE = "Aucune opération récente";
export const ASSISTANT_LAST_OP_EMPTY_SUBTITLE =
  "Les paiements de ce compte apparaîtront ici. Aucune transaction fictive n'est inventée.";
export const ASSISTANT_LAST_OP_ADMIN_TITLE = "Historique personnel indisponible";
export const ASSISTANT_LAST_OP_ADMIN_SUBTITLE =
  "Le compte administrateur reçoit la liste globale. Cette carte n'affiche pas l'opération d'un autre utilisateur.";
export const ASSISTANT_BANNER_BADGE = "Assistant pédagogique · Démo";
export const ASSISTANT_BANNER_TEXT =
  "L'assistant aide à comprendre Bitcoin, Lightning, vos transactions et les transferts simulés. Il ne peut pas exécuter d'opération financière, confirmer un paiement ni créer une facture.";
export const ASSISTANT_GENIUS_DESCRIPTION =
  "Posez vos questions sur Bitcoin, Lightning et le fonctionnement des paiements SmartPay. Les réponses restent pédagogiques.";
export const ASSISTANT_TOPICS_TITLE = "Thématiques fréquentes";
export const ASSISTANT_SUGGESTIONS_TITLE = "Suggestions rapides";
export const ASSISTANT_LAST_OP_TITLE = "Dernière opération";
export const ASSISTANT_HISTORY_TITLE = "Mes conversations";
export const ASSISTANT_HISTORY_EMPTY = "Aucune conversation enregistrée pour ce compte.";
export const ASSISTANT_HISTORY_RETRY = "Réessayer";
export const ASSISTANT_HISTORY_ERROR = "Impossible de charger vos conversations.";
export const ASSISTANT_FOOTER_NOTE =
  "L'assistant n'initie aucun paiement, transfert ou facture Lightning.";

export type AssistantTopic = {
  id: "bitcoin" | "transactions" | "fees" | "transfers";
  title: string;
  subtitle: string;
  question: string;
  icon: "flash" | "receipt" | "card" | "globe";
};

export type AssistantSuggestion = {
  id: string;
  label: string;
};

export const ASSISTANT_TOPICS: readonly AssistantTopic[] = [
  {
    id: "bitcoin",
    title: "Comprendre Bitcoin et Lightning",
    subtitle: "Protocole pédagogique",
    question: "Comment fonctionne le Lightning Network ?",
    icon: "flash",
  },
  {
    id: "transactions",
    title: "Mes transactions",
    subtitle: "Statuts et historique",
    question: "Pourquoi un paiement peut-il rester en attente ?",
    icon: "receipt",
  },
  {
    id: "fees",
    title: "Frais et délais",
    subtitle: "Montants réellement connus",
    question: "Quels frais Lightning sont réellement connus ?",
    icon: "card",
  },
  {
    id: "transfers",
    title: "Transferts en Afrique",
    subtitle: "Démonstration simulée",
    question: "Quelle différence entre un paiement Lightning Regtest et un crédit Mobile Money simulé ?",
    icon: "globe",
  },
];

export const ASSISTANT_SUGGESTIONS: readonly AssistantSuggestion[] = [
  { id: "sats", label: "Comment envoyer des sats ?" },
  { id: "bolt11", label: "Qu'est-ce qu'une facture BOLT11 ?" },
  { id: "status", label: "Comment lire le statut d'un paiement ?" },
  { id: "sim", label: "Lightning Regtest vs crédit Mobile Money simulé ?" },
];

export type LastOperationTeaser = {
  title: string;
  amountLabel: string;
  statusLine: string;
  when: string;
};

const FORBIDDEN_ASSISTANT_CLAIMS = [
  /amadou/i,
  /#?sn-8924/i,
  /connecté au n[œo]ud lightning/i,
  /dakar-abidjan/i,
  /0[.,]8\s*s/i,
  /99[.,]8\s*%/i,
  /teranga/i,
  /score de fraude/i,
  /marchand certifi/i,
  /25\s*000\s*fcfa/i,
  /wave/i,
  /orange money/i,
  /\bmtn\b/i,
];

export function assistantGreeting(firstName: string | null | undefined): string {
  const name = (firstName ?? "").trim();
  if (!name) {
    return ASSISTANT_GENERIC_GREETING;
  }
  return `Bonjour ${name}, comment puis-je vous éclairer aujourd'hui ?`;
}

export function canShowPersonalLastOperation(role: UserRole | string | undefined): boolean {
  return role !== "admin";
}

export function pickLatestPayment(payments: readonly Payment[]): Payment | null {
  if (payments.length === 0) {
    return null;
  }
  return [...payments].sort((left, right) => {
    const leftTs = Date.parse(left.created_at);
    const rightTs = Date.parse(right.created_at);
    const safeLeft = Number.isNaN(leftTs) ? 0 : leftTs;
    const safeRight = Number.isNaN(rightTs) ? 0 : rightTs;
    return safeRight - safeLeft;
  })[0];
}

export function formatOperationDate(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) {
    return "—";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ts));
}

export function lastOperationTeaser(payment: Payment): LastOperationTeaser {
  const incoming = payment.direction === "incoming";
  const title = payment.description.trim() || (incoming ? "Paiement reçu" : "Paiement envoyé");
  return {
    title,
    amountLabel: `${incoming ? "+" : "−"}${formatSats(payment.amount_sats)} sats`,
    statusLine: `${statusLabel(uiPaymentState(payment))} · ${payment.settlement_mode === "mock" ? "MOCK" : "REGTEST"}`,
    when: formatOperationDate(payment.created_at),
  };
}

export function assistantUsesPaymentsListOnly(path: string): boolean {
  return path === ASSISTANT_PAYMENTS_LIST_PATH && !/\/payments\/[^/]+\/$/.test(path);
}

export function visibleAssistantHomeCopy(input: {
  firstName?: string | null;
  lastOperation?: LastOperationTeaser | null;
}): string {
  const parts = [
    ASSISTANT_HOME_TITLE,
    ASSISTANT_REGTEST_BADGE,
    ASSISTANT_BANNER_BADGE,
    ASSISTANT_BANNER_TEXT,
    ASSISTANT_GENIUS_NAME,
    ASSISTANT_GENIUS_STATUS,
    assistantGreeting(input.firstName),
    ASSISTANT_GENIUS_DESCRIPTION,
    ASSISTANT_QUESTION_PREVIEW,
    ASSISTANT_QUESTION_PREVIEW_HINT,
    ASSISTANT_TOPICS_TITLE,
    ...ASSISTANT_TOPICS.flatMap((topic) => [topic.title, topic.subtitle, topic.question]),
    ASSISTANT_SUGGESTIONS_TITLE,
    ...ASSISTANT_SUGGESTIONS.map((item) => item.label),
    ASSISTANT_LAST_OP_TITLE,
    ASSISTANT_LAST_OP_EMPTY_TITLE,
    ASSISTANT_LAST_OP_EMPTY_SUBTITLE,
    ASSISTANT_LAST_OP_ADMIN_TITLE,
    ASSISTANT_LAST_OP_ADMIN_SUBTITLE,
    ASSISTANT_HISTORY_TITLE,
    ASSISTANT_HISTORY_EMPTY,
    ASSISTANT_HISTORY_RETRY,
    ASSISTANT_HISTORY_ERROR,
    ASSISTANT_START_LABEL,
    ASSISTANT_START_HINT,
    ASSISTANT_FOOTER_NOTE,
  ];
  if (input.lastOperation) {
    parts.push(
      input.lastOperation.title,
      input.lastOperation.amountLabel,
      input.lastOperation.statusLine,
      input.lastOperation.when,
    );
  }
  return parts.join("\n");
}

export function assistantHomeCopyHasForbiddenClaim(copy: string): boolean {
  return FORBIDDEN_ASSISTANT_CLAIMS.some((pattern) => pattern.test(copy));
}
