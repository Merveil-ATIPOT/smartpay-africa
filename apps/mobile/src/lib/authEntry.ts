import { ApiError, userFacingRequestError } from "../services/errors";

/** Compte seed mobile. Aucun mot de passe n'est stocké ici. */
export const DEMO_USER_EMAIL = "user@smartpay.local";
export const DEMO_USER_LOCATION = "Dakar, SN";

export const FORGOT_PASSWORD_PENDING_MESSAGE = "Fonction bientôt disponible";
export const LOGIN_FALLBACK_ERROR = "Connexion impossible. Vérifiez l'API et vos identifiants.";
export const WELCOME_TAGLINE = "Envoyez, recevez et payez simplement.";
export const SPLASH_TAGLINE = "Bitcoin & Lightning au cœur de l'Afrique";
export const REGTEST_FOOTER = "Mode démonstration — Regtest";
export const LOGIN_TITLE = "Bon retour !";
/** Placeholder texte, pas des puces : un champ vide ne doit pas paraître rempli. */
export const LOGIN_PASSWORD_PLACEHOLDER = "Mot de passe";

export const UNAUTHENTICATED_ROUTES = ["Welcome", "Login", "Register"] as const;
export const AUTHENTICATED_INITIAL_ROUTE = "Tabs";

/** Routes métier à ne pas modifier dans P1.1.1. */
export const UNTOUCHED_TRANSFER_ROUTES = [
  "TransferDestination",
  "TransferBeneficiary",
  "TransferAmount",
  "TransferReview",
  "TransferResult",
] as const;

export const UNTOUCHED_MERCHANT_ROUTES = [
  "Merchant",
  "MerchantHome",
  "MerchantCreateInvoice",
  "MerchantQr",
  "MerchantSalesHistory",
  "MerchantReceipt",
  "MerchantSalesAnalytics",
  "MerchantShop",
] as const;

export function readDevFlag(): boolean {
  return typeof (globalThis as { __DEV__?: boolean }).__DEV__ === "boolean"
    ? Boolean((globalThis as { __DEV__?: boolean }).__DEV__)
    : false;
}

export function showDevAuthTools(dev = readDevFlag()): boolean {
  return dev;
}

/** Préremplissage e-mail en développement uniquement. Jamais le mot de passe. */
export function demoEmailPrefill(dev = readDevFlag()): string {
  return dev ? DEMO_USER_EMAIL : "";
}

const LOGIN_FIELD_LABELS = {
  email: "E-mail",
  password: "Mot de passe",
} as const;

export type LoginFieldKey = keyof typeof LOGIN_FIELD_LABELS;

function detailRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as Record<string, unknown>;
  const detail = record.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    return detail as Record<string, unknown>;
  }
  return record;
}

function firstText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }
    }
  }
  return null;
}

/** Erreurs de champs renvoyées par Django, sans valeur saisie. */
export function loginFieldErrors(body: unknown): Partial<Record<LoginFieldKey, string>> {
  const detail = detailRecord(body);
  if (!detail) {
    return {};
  }
  const errors: Partial<Record<LoginFieldKey, string>> = {};
  for (const key of Object.keys(LOGIN_FIELD_LABELS) as LoginFieldKey[]) {
    const text = firstText(detail[key]);
    if (text) {
      errors[key] = text;
    }
  }
  return errors;
}

export function loginUserFacingError(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = loginFieldErrors(error.body);
    const parts = (Object.keys(LOGIN_FIELD_LABELS) as LoginFieldKey[])
      .filter((key) => fields[key])
      .map((key) => `${LOGIN_FIELD_LABELS[key]} : ${fields[key]}`);
    if (parts.length > 0) {
      return parts.join(" ");
    }
  }
  return userFacingRequestError(error, LOGIN_FALLBACK_ERROR);
}
