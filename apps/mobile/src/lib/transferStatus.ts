import type { TransferStatus } from "@smartpay/contracts";

export const SETTLEMENT_STATUSES: ReadonlySet<TransferStatus> = new Set([
  "payment_pending",
  "lightning_settled",
  "simulated_credited",
  "pending_reconciliation",
]);

export const EDITABLE_STATUSES: ReadonlySet<TransferStatus> = new Set(["draft", "quoted", "ready"]);

export function canEditTransfer(status: TransferStatus | "" | null | undefined): boolean {
  if (!status) {
    return true;
  }
  return EDITABLE_STATUSES.has(status);
}

export function isSettledOrBusy(status: TransferStatus | "" | null | undefined): boolean {
  if (!status) {
    return false;
  }
  return SETTLEMENT_STATUSES.has(status) || status === "failed";
}

export function quoteIsCurrent(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) {
    return false;
  }
  const stamp = new Date(expiresAt).getTime();
  if (Number.isNaN(stamp)) {
    return false;
  }
  return stamp > now.getTime();
}

export function transferStatusLabel(status: TransferStatus | "" | null | undefined): string {
  switch (status) {
    case "draft":
      return "Brouillon";
    case "quoted":
      return "Devis calculé";
    case "ready":
      return "Préparation enregistrée — aucun paiement Lightning";
    case "payment_pending":
      return "Paiement Lightning en cours";
    case "lightning_settled":
      return "Lightning réglé — crédit Mobile Money en attente";
    case "simulated_credited":
      return "Lightning réglé · crédit Mobile Money simulé";
    case "pending_reconciliation":
      return "Résultat incertain — pas de second envoi automatique";
    case "failed":
      return "Échec confirmé";
    default:
      return "Statut inconnu";
  }
}

export function lightningHeadline(input: {
  lightningConfirmed: boolean;
  status: TransferStatus | "" | null | undefined;
  aliceStatus?: string;
  bobStatus?: string;
}): string {
  if (input.lightningConfirmed && input.aliceStatus === "SUCCEEDED" && input.bobStatus === "SETTLED") {
    return "Règlement Lightning confirmé (Alice SUCCEEDED et Bob SETTLED).";
  }
  if (input.status === "pending_reconciliation") {
    return "Résultat Lightning incertain. Un HTTP 200 n'est pas une preuve de paiement.";
  }
  if (input.status === "payment_pending") {
    return "Paiement Lightning en attente de preuve Alice/Bob.";
  }
  if (input.status === "failed") {
    return "Aucun règlement Lightning confirmé.";
  }
  return "Aucun paiement Lightning n'a été déclenché depuis cet écran.";
}
