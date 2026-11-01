import type { TransferPaymentPreview } from "@smartpay/contracts";

/** Warnings d’information renvoyés par Django même quand tout va bien. */
export const PREVIEW_INFO_WARNINGS = [
  "Cette prévisualisation ne déclenche aucun paiement Lightning.",
  "fee_sats est un frais de démonstration B1, distinct des frais réseau LND.",
] as const;

export const QUOTED_PREPARATION_MESSAGE =
  "Transfert en préparation. L'enregistrement permettra de passer au statut READY, sans déclencher de paiement Lightning.";

export const EXPIRED_QUOTE_MESSAGE = "Devis expiré. Revenez au montant pour le renouveler.";
export const INSUFFICIENT_BALANCE_MESSAGE = "Solde de canal insuffisant pour le montant principal.";
export const ALREADY_EXECUTED_MESSAGE = "Ce transfert a déjà une exécution. Ouvrez l'écran résultat en consultation.";
export const ALICE_UNREACHABLE_MESSAGE = "Le nœud de paiement est injoignable. Ce n'est pas un paiement refusé.";

export type PreviewBanner = {
  tone: "info" | "error";
  message: string;
};

function isKnownInfoWarning(warning: string): boolean {
  return (PREVIEW_INFO_WARNINGS as readonly string[]).includes(warning);
}

function extraWarnings(warnings: string[]): string[] {
  return warnings.filter((item) => !isKnownInfoWarning(item));
}

function isExpiredWarning(warning: string): boolean {
  return /expiré|incompatible/i.test(warning);
}

function isInsufficientWarning(warning: string): boolean {
  return /insuffisant/i.test(warning);
}

function isAlreadyExecutedWarning(warning: string): boolean {
  return /déjà une exécution/i.test(warning);
}

/**
 * Interprète le preview Django pour M25.
 * Ne change jamais can_execute. Distingue préparation QUOTED et vrais refus.
 */
export function classifyPreviewBanner(
  preview: TransferPaymentPreview | null,
  options: { quoteExpiredLocal?: boolean } = {},
): PreviewBanner | null {
  if (options.quoteExpiredLocal) {
    return { tone: "error", message: EXPIRED_QUOTE_MESSAGE };
  }
  if (!preview) {
    return null;
  }

  const extras = extraWarnings(preview.warnings);
  const expired = extras.find(isExpiredWarning);
  const insufficient = extras.find(isInsufficientWarning);
  const executed = extras.find(isAlreadyExecutedWarning);
  const unknown = extras.filter(
    (item) => !isExpiredWarning(item) && !isInsufficientWarning(item) && !isAlreadyExecutedWarning(item),
  );

  if (expired) {
    return { tone: "error", message: expired };
  }
  if (insufficient) {
    return { tone: "error", message: insufficient };
  }
  if (executed) {
    return { tone: "error", message: executed };
  }
  if (unknown.length > 0) {
    return { tone: "error", message: unknown[0] as string };
  }

  if (preview.can_execute) {
    return null;
  }

  const balanceOk =
    preview.invoice_amount_sats <= 0 || preview.channel_balance_sats >= preview.invoice_amount_sats;
  const quotedReadyGap =
    preview.status === "quoted" &&
    preview.lightning_connected &&
    balanceOk &&
    extras.length === 0;

  if (quotedReadyGap) {
    return { tone: "info", message: QUOTED_PREPARATION_MESSAGE };
  }

  if (!preview.lightning_connected) {
    return { tone: "error", message: ALICE_UNREACHABLE_MESSAGE };
  }
  if (preview.invoice_amount_sats > 0 && preview.channel_balance_sats < preview.invoice_amount_sats) {
    return { tone: "error", message: INSUFFICIENT_BALANCE_MESSAGE };
  }

  return {
    tone: "error",
    message: "La prévisualisation indique que le paiement ne peut pas être lancé.",
  };
}
