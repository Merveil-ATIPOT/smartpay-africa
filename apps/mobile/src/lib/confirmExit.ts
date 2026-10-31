import type { Payment } from "@smartpay/contracts";

import { uiPaymentState } from "./paymentStatus";

export const CONFIRM_DONE_LABEL = "Terminé";
export const CONFIRM_CANCEL_LABEL = "Annuler la transaction";
export const CONFIRM_SUCCESS_TITLE = "Paiement confirmé";

export function confirmExitIsDone(payment: Payment | null): boolean {
  if (!payment) {
    return false;
  }
  const state = uiPaymentState(payment);
  return state === "confirmed" || state === "mock_receipt";
}
