import type { Payment } from "@smartpay/contracts";

export type UiPaymentState =
  | "pending"
  | "processing"
  | "confirmed"
  | "failed"
  | "unknown"
  | "mock_receipt";

export function httpOkIsSettlement(_httpStatus: number): false {
  return false;
}

export function isLightningSuccess(payment: Payment): boolean {
  return (
    payment.settlement_mode === "lightning_regtest" &&
    payment.is_lightning_settled === true &&
    payment.lightning_status === "settled"
  );
}

export function uiPaymentState(payment: Payment): UiPaymentState {
  if (payment.settlement_mode === "mock") {
    if (payment.status === "failed" || payment.status === "expired") {
      return "failed";
    }
    if (payment.status === "confirmed" || payment.status === "pending") {
      return "mock_receipt";
    }
    return "pending";
  }
  if (isLightningSuccess(payment)) {
    return "confirmed";
  }
  if (
    payment.status === "failed" ||
    payment.lightning_status === "failed" ||
    payment.status === "expired" ||
    payment.lightning_status === "expired"
  ) {
    return "failed";
  }
  if (payment.status === "pending" || payment.lightning_status === "pending") {
    return "processing";
  }
  if (payment.status === "created") {
    return "pending";
  }
  return "unknown";
}

export const LIGHTNING_SUCCESS_LABEL = "Paiement confirmé sur le réseau de démonstration";

export function statusLabel(state: UiPaymentState): string {
  switch (state) {
    case "confirmed":
      return LIGHTNING_SUCCESS_LABEL;
    case "mock_receipt":
      return "Accusé Mock — pas un règlement Lightning";
    case "processing":
      return "Traitement Lightning en cours";
    case "pending":
      return "En attente";
    case "failed":
      return "Échoué";
    default:
      return "Statut inconnu — non confirmé par le serveur";
  }
}

/** Libellé d'historique : réutilise les statuts existants, sans changer uiPaymentState. */
export function displayPaymentStatus(payment: Payment): string {
  if (payment.status === "expired" || payment.lightning_status === "expired") {
    return "Expiré";
  }
  if (payment.status === "failed" || payment.lightning_status === "failed") {
    return "Échoué";
  }
  return statusLabel(uiPaymentState(payment));
}

export function shouldStopPolling(payment: Payment): boolean {
  if (payment.settlement_mode === "mock") {
    return true;
  }
  if (payment.is_lightning_settled) {
    return true;
  }
  if (payment.status === "failed" || payment.status === "expired" || payment.status === "confirmed") {
    return true;
  }
  if (
    payment.lightning_status === "settled" ||
    payment.lightning_status === "failed" ||
    payment.lightning_status === "expired"
  ) {
    return true;
  }
  return false;
}

export function settlementCaption(payment: Payment): string {
  if (isLightningSuccess(payment)) {
    return LIGHTNING_SUCCESS_LABEL;
  }
  if (payment.settlement_mode === "mock") {
    return "Fournisseur Mock : accusé simulé. Ceci n'est PAS une transaction Lightning settled.";
  }
  return "Un HTTP 200 n'est pas une preuve de règlement Lightning. En attente de confirmation serveur.";
}
