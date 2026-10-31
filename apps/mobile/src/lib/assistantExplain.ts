import type { Payment } from "@smartpay/contracts";

import { explainPayment, type PaymentExplanation } from "./transactionExplain";
import { ApiError, isTransportError, userFacingRequestError } from "../services/errors";

export const EXPLAIN_SCREEN_TITLE = "Comprendre ma transaction";
export const EXPLAIN_READONLY_PILL = "Explication pédagogique · Lecture seule";
export const EXPLAIN_BACK_LABEL = "Retour";
export const EXPLAIN_RETRY_LABEL = "Réessayer";
export const EXPLAIN_ASK_LABEL = "Poser une question générale";
export const EXPLAIN_LOADING_LABEL = "Chargement de la transaction…";
export const EXPLAIN_GENERIC_QUESTION = "Comment lire le statut d'un paiement ?";
export const EXPLAIN_FORBIDDEN_TITLE = "Transaction introuvable";
export const EXPLAIN_FORBIDDEN_SUBTITLE =
  "Cette opération n'est pas accessible depuis ce compte.";
export const EXPLAIN_INCOMPLETE_NOTE =
  "Certaines informations optionnelles sont absentes. L'explication n'utilise que les champs connus.";
export const EXPLAIN_PAYMENT_DETAIL_PATH = "/api/v1/payments/{id}/";

export type ExplainLoadKind = "ready" | "forbidden" | "network" | "error";

export type ExplainView =
  | { kind: "ready"; explanation: PaymentExplanation; incomplete: boolean }
  | { kind: "incomplete" };

export function classifyExplainError(error: unknown): ExplainLoadKind {
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return "forbidden";
  }
  if (isTransportError(error)) {
    return "network";
  }
  return "error";
}

export function explainErrorMessage(error: unknown): string {
  if (classifyExplainError(error) === "forbidden") {
    return EXPLAIN_FORBIDDEN_SUBTITLE;
  }
  return userFacingRequestError(error, "Impossible de charger cette transaction.");
}

export function paymentIsExplainable(payment: Payment): boolean {
  return Boolean(payment.id) && Number.isInteger(payment.amount_sats) && payment.amount_sats >= 1;
}

export function explanationHasGaps(payment: Payment): boolean {
  return !payment.description.trim() && !payment.provider_reference.trim() && !payment.invoice?.payment_hash;
}

export function buildExplainView(payment: Payment): ExplainView {
  if (!paymentIsExplainable(payment)) {
    return { kind: "incomplete" };
  }
  return {
    kind: "ready",
    explanation: explainPayment(payment),
    incomplete: explanationHasGaps(payment),
  };
}

export function explainChatDraftIsSafe(draft: string): boolean {
  const folded = draft.toLowerCase();
  if (folded.includes("lnbcrt") || folded.includes("lnbc") || folded.includes("lightning:")) {
    return false;
  }
  if (draft.startsWith("eyJ") || /[a-fA-F0-9]{32,}/.test(draft)) {
    return false;
  }
  return draft === EXPLAIN_GENERIC_QUESTION;
}

export function explainUsesPaymentDetailOnly(path: string): boolean {
  return path === EXPLAIN_PAYMENT_DETAIL_PATH;
}
