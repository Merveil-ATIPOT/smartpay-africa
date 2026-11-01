import type { CountryCode } from "@smartpay/contracts";

export const FCFA_DISCLAIMER =
  "Conversion FCFA : non disponible. Aucun taux de marché n'est fourni dans ce MVP.";

export const LND_DEMO_NODE_BALANCE_LABEL = "Solde partagé du laboratoire · pas un portefeuille personnel";
export const MOCK_BALANCE_LABEL = "Solde Mock — pas un canal Lightning";
export const OFFICIAL_LOGO_ASSET = "Logo_SmartPay_Africa.png";

/** Le canal LND est celui du nœud Alice partagé, pas un portefeuille utilisateur. */
export function walletBalanceLabel(provider: string): string {
  if (provider === "lnd_regtest") {
    return LND_DEMO_NODE_BALANCE_LABEL;
  }
  return MOCK_BALANCE_LABEL;
}

export function formatSats(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

/** Accepte 2500, « 2 500 » ou séparateurs fins. Ne fabrique pas de montant. */
export function parseSatsInput(raw: string): number | null {
  const digits = raw.replace(/[\s\u00a0\u202f]/g, "");
  if (!digits || !/^\d+$/.test(digits)) {
    return null;
  }
  const parsed = Number(digits);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function countryLine(code: CountryCode | string): string {
  switch (code) {
    case "SN":
      return "Dakar, Sénégal";
    case "CG":
      return "Brazzaville, Congo";
    case "CI":
      return "Abidjan, Côte d'Ivoire";
    default:
      return String(code);
  }
}

export function greetingName(firstName: string, email: string): string {
  const name = firstName.trim();
  if (name) {
    return name;
  }
  return email.split("@")[0] || "là";
}

export function shortenInvoice(value: string, head = 14, tail = 8): string {
  if (value.length <= head + tail + 1) {
    return value;
  }
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function remainingLabel(expiresAt: string | null | undefined, nowMs = Date.now()): string | null {
  if (!expiresAt) {
    return null;
  }
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) {
    return null;
  }
  const total = Math.floor((ts - nowMs) / 1000);
  if (total <= 0) {
    return "Expirée";
  }
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function providerLabel(provider: string): { title: string; mode: "mock" | "regtest" } {
  if (provider === "lnd_regtest") {
    return { title: "LIGHTNING REGTEST", mode: "regtest" };
  }
  return { title: "MOCK", mode: "mock" };
}
