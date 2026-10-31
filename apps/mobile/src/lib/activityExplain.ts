import type { Payment, UserRole } from "@smartpay/contracts";

import { canShowPersonalLastOperation } from "./assistantHome";

export const ACTIVITY_EXPLAIN_ROUTE = "AssistantExplain";
export const ACTIVITY_EXPLAIN_HINT = "Comprendre";
export const ACTIVITY_ADMIN_NOTE =
  "L'analyse pédagogique n'est pas proposée sur le compte administrateur.";

export type ActivityExplainParams = {
  paymentId: string;
};

export function canOpenActivityExplanation(role: UserRole | string | undefined): boolean {
  return canShowPersonalLastOperation(role);
}

const PAYMENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Seul l'UUID de paiement : jamais de facture, hash ou jeton. */
export function activityExplainParams(payment: Pick<Payment, "id">): ActivityExplainParams | null {
  const paymentId = payment.id.trim();
  if (!PAYMENT_ID_RE.test(paymentId)) {
    return null;
  }
  return { paymentId };
}

export function activityExplainParamsAreSafe(params: Record<string, unknown> | null): boolean {
  if (!params) {
    return false;
  }
  const keys = Object.keys(params);
  if (keys.length !== 1 || keys[0] !== "paymentId") {
    return false;
  }
  return typeof params.paymentId === "string" && PAYMENT_ID_RE.test(params.paymentId);
}

export class ActivityExplainLock {
  private locked = false;

  tryAcquire(): boolean {
    if (this.locked) {
      return false;
    }
    this.locked = true;
    return true;
  }

  release(): void {
    this.locked = false;
  }
}
