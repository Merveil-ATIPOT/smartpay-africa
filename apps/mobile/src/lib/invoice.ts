export type InvoiceKind =
  | "mock"
  | "regtest"
  | "mainnet"
  | "testnet"
  | "signet"
  | "lnurl"
  | "address"
  | "unknown";

export type WalletProviderName = "mock" | "lnd_regtest";

export class InvoiceError extends Error {
  constructor(
    public readonly code:
      | "empty"
      | "mainnet"
      | "testnet"
      | "signet"
      | "lnurl"
      | "address"
      | "unknown"
      | "incompatible"
      | "expired",
    message: string,
  ) {
    super(message);
    this.name = "InvoiceError";
  }
}

export function normalizeInvoice(raw: string): string {
  let value = raw.trim();
  if (value.toLowerCase().startsWith("lightning:")) {
    value = value.slice("lightning:".length);
  }
  return value.replace(/\s+/g, "");
}

export function classifyInvoice(raw: string): {
  kind: InvoiceKind;
  encoded: string;
  error?: string;
} {
  const encoded = normalizeInvoice(raw);
  const lower = encoded.toLowerCase();
  if (!encoded) {
    return { kind: "unknown", encoded, error: "Facture vide." };
  }
  if (encoded.includes("@") && !lower.startsWith("ln") && !lower.startsWith("mock")) {
    return {
      kind: "address",
      encoded,
      error: "Les adresses Lightning (user@domaine) ne sont pas supportées en P03.",
    };
  }
  if (lower.startsWith("lnurl") || lower.startsWith("lnurl1")) {
    return {
      kind: "lnurl",
      encoded,
      error: "LNURL n'est pas supporté en P03. Utilisez une facture BOLT11.",
    };
  }
  if (lower.startsWith("lnbcrt")) {
    return { kind: "regtest", encoded };
  }
  if (lower.startsWith("mockln")) {
    return { kind: "mock", encoded };
  }
  if (lower.startsWith("lntbs")) {
    return {
      kind: "signet",
      encoded,
      error: "Facture Signet refusée. SmartPay n'accepte que Bitcoin Regtest.",
    };
  }
  if (lower.startsWith("lntb")) {
    return {
      kind: "testnet",
      encoded,
      error: "Facture Testnet refusée. SmartPay n'accepte que Bitcoin Regtest.",
    };
  }
  if (lower.startsWith("lnbc")) {
    return {
      kind: "mainnet",
      encoded,
      error: "Facture Mainnet refusée. SmartPay n'accepte pas le réseau réel.",
    };
  }
  return { kind: "unknown", encoded, error: "Format de facture non reconnu." };
}

export function assertCompatibleInvoice(raw: string, provider: WalletProviderName): string {
  const classified = classifyInvoice(raw);
  if (classified.error) {
    throw new InvoiceError(
      classified.kind === "mainnet"
        ? "mainnet"
        : classified.kind === "testnet"
          ? "testnet"
          : classified.kind === "signet"
            ? "signet"
            : classified.kind === "lnurl"
              ? "lnurl"
              : classified.kind === "address"
                ? "address"
                : classified.kind === "unknown"
                  ? "unknown"
                  : "incompatible",
      classified.error,
    );
  }
  if (classified.kind === "regtest" && provider === "mock") {
    throw new InvoiceError(
      "incompatible",
      "Facture Lightning Regtest incompatible avec le fournisseur Mock. Branchez l'API sur LND Regtest.",
    );
  }
  if (classified.kind === "mock" && provider === "lnd_regtest") {
    throw new InvoiceError(
      "incompatible",
      "Facture Mock incompatible avec LND Regtest. Utilisez une facture BOLT11 lnbcrt.",
    );
  }
  return classified.encoded;
}

/** Parse optionnel du montant BOLT11 (hors décodage LND). Retourne null si absent. */
export function parseBolt11AmountSats(encoded: string): number | null {
  const match = normalizeInvoice(encoded)
    .toLowerCase()
    .match(/^(?:lnbcrt|lnbc|lntbs|lntb)(\d+)([munp]?)1/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(value)) {
    return null;
  }
  switch (unit) {
    case "":
      return value * 100_000_000;
    case "m":
      return value * 100_000;
    case "u":
      return value * 100;
    case "n":
      return Math.floor(value / 10);
    case "p":
      return Math.floor(value / 10_000);
    default:
      return null;
  }
}

export function assertNotExpired(expiresAt: string | null | undefined, nowMs = Date.now()): void {
  if (!expiresAt) {
    return;
  }
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) {
    return;
  }
  if (ts <= nowMs) {
    throw new InvoiceError("expired", "Cette facture est expirée. Aucun paiement n'est possible.");
  }
}
