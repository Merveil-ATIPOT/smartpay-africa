export const DJANGO_QUOTE_BADGE = "Devis Django";
export const LOCAL_QUOTE_BADGE = "Estimation locale — non validée";

export type LocalQuoteAmounts = {
  amountSats: number;
  feeSats: number;
  totalSats: number;
};

export type ServerQuoteSnapshot = {
  amountFcfa: number;
  amountSats: number;
  feeSats: number;
  totalSats: number;
  expiresAt: string | null;
  rate: number;
};

export type AmountQuoteDisplay = {
  source: "django" | "local";
  badge: string;
  amountSats: number;
  feeSats: number;
  totalSats: number;
  showExpiry: boolean;
  expiresAt: string | null;
  rate: number | null;
};

/**
 * Choisit la valeur affichée sur M24.
 * Un snapshot serveur n'est utilisé que s'il correspond au montant saisi.
 */
export function resolveAmountQuoteDisplay(input: {
  mode: "backend" | "demo";
  amountFcfa: number;
  local: LocalQuoteAmounts;
  server: ServerQuoteSnapshot | null;
}): AmountQuoteDisplay {
  const serverMatches =
    input.mode === "backend" &&
    input.server != null &&
    Number.isInteger(input.amountFcfa) &&
    input.server.amountFcfa === input.amountFcfa &&
    input.server.amountSats > 0;

  if (serverMatches && input.server) {
    return {
      source: "django",
      badge: DJANGO_QUOTE_BADGE,
      amountSats: input.server.amountSats,
      feeSats: input.server.feeSats,
      totalSats: input.server.totalSats || input.server.amountSats + input.server.feeSats,
      showExpiry: Boolean(input.server.expiresAt),
      expiresAt: input.server.expiresAt,
      rate: input.server.rate,
    };
  }

  return {
    source: "local",
    badge: LOCAL_QUOTE_BADGE,
    amountSats: input.local.amountSats,
    feeSats: input.local.feeSats,
    totalSats: input.local.totalSats,
    showExpiry: false,
    expiresAt: null,
    rate: null,
  };
}
