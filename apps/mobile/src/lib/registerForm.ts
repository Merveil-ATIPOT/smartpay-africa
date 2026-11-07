import { ApiError, messageFromBody } from "../services/errors";
import { nationalNumber, phoneErrors } from "./transferPhone";

export type RegisterCountry = "SN" | "CI" | "CG";

export type RegisterFormValues = {
  firstName: string;
  lastName: string;
  country: RegisterCountry;
  phone: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
};

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  country: RegisterCountry;
  phone_number: string;
  accepted_terms: true;
};

export type RegisterResponse = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: "individual";
  country: RegisterCountry;
};

export type RegisterCountryOption = {
  code: RegisterCountry;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
};

export const REGISTER_PATH = "/api/v1/auth/register/";
export const REGISTER_TITLE = "Créer un compte";
export const REGISTER_SUBTITLE =
  "Compte Particulier de démonstration. Bitcoin Regtest uniquement.";
export const REGISTER_PHONE_LABEL = "Numéro de téléphone";
export const REGISTER_PHONE_HELPER =
  "Contact de démonstration. Aucun dépôt, retrait ni compte Mobile Money n'est vérifié.";
export const REGISTER_TERMS_LABEL =
  "Je comprends que cette application est un prototype de démonstration sur Bitcoin Regtest. Aucun fonds réel n'est transféré, aucun compte Mobile Money n'est vérifié, et ceci n'est pas une acceptation de conditions commerciales.";
export const REGISTER_SUCCESS_NOTICE = "Compte créé. Connectez-vous pour continuer.";
export const REGISTER_THROTTLE_MESSAGE =
  "Trop de tentatives d'inscription. Réessayez plus tard.";
export const REGISTER_UNAVAILABLE_MESSAGE =
  "Le serveur d'inscription est indisponible. Vérifiez l'API et le réseau.";
export const REGISTER_FALLBACK_ERROR = "Inscription impossible. Vérifiez le formulaire.";
export const REGISTER_MIN_PASSWORD_LENGTH = 8;
export const REGISTER_PHONE_LETTERS_ERROR =
  "Le numéro de téléphone ne doit contenir que des chiffres, espaces ou un indicatif.";

export const PRIVILEGED_REGISTER_FIELDS = [
  "role",
  "is_staff",
  "is_superuser",
  "is_active",
] as const;

export const PAYMENT_OR_LIGHTNING_PATHS = [
  "/api/v1/payments/",
  "/api/v1/payments/invoices/",
  "/api/v1/payments/preview/",
  "/confirm/",
] as const;

export const REGISTER_COUNTRIES: readonly RegisterCountryOption[] = [
  { code: "SN", name: "Sénégal", dialCode: "+221", flag: "🇸🇳", placeholder: "77 123 45 67" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮", placeholder: "07 45 89 12" },
  { code: "CG", name: "Congo-Brazzaville", dialCode: "+242", flag: "🇨🇬", placeholder: "06 611 22 33" },
] as const;

export const DEFAULT_REGISTER_COUNTRY: RegisterCountry = "SN";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENSITIVE_ERROR = /traceback|stack|macaroon|jwt|secret|password_hash|token/i;

export function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function getRegisterCountry(code: RegisterCountry): RegisterCountryOption {
  return REGISTER_COUNTRIES.find((item) => item.code === code) ?? REGISTER_COUNTRIES[0];
}

export function isRegisterCountry(value: string): value is RegisterCountry {
  return REGISTER_COUNTRIES.some((item) => item.code === value);
}

export function registerFieldErrors(
  values: RegisterFormValues,
): Partial<Record<keyof RegisterFormValues, string>> {
  const errors: Partial<Record<keyof RegisterFormValues, string>> = {};
  if (!collapseSpaces(values.firstName)) {
    errors.firstName = "Indiquez votre prénom.";
  }
  if (!collapseSpaces(values.lastName)) {
    errors.lastName = "Indiquez votre nom.";
  }
  if (!isRegisterCountry(values.country)) {
    errors.country = "Choisissez un pays : Sénégal, Côte d'Ivoire ou Congo-Brazzaville.";
  }
  if (/[A-Za-zÀ-ÿ]/.test(values.phone)) {
    errors.phone = REGISTER_PHONE_LETTERS_ERROR;
  } else {
    const phone = phoneErrors(values.country, values.phone);
    if (phone.length > 0) {
      errors.phone = phone[0];
    }
  }
  const email = collapseSpaces(values.email).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Indiquez une adresse e-mail valide.";
  }
  if (values.password.length < REGISTER_MIN_PASSWORD_LENGTH) {
    errors.password = `Le mot de passe doit contenir au moins ${REGISTER_MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (!values.acceptedTerms) {
    errors.acceptedTerms = "Cochez la case pour confirmer le mode démonstration Regtest.";
  }
  return errors;
}

export function isRegisterFormValid(values: RegisterFormValues): boolean {
  return Object.keys(registerFieldErrors(values)).length === 0;
}

export function buildRegisterPayload(values: RegisterFormValues): RegisterPayload {
  const country = getRegisterCountry(values.country);
  return {
    first_name: collapseSpaces(values.firstName),
    last_name: collapseSpaces(values.lastName),
    email: collapseSpaces(values.email).toLowerCase(),
    password: values.password,
    country: values.country,
    phone_number: nationalNumber(values.phone, country.dialCode),
    accepted_terms: true,
  };
}

export function createRegisterApiCall(values: RegisterFormValues): {
  path: string;
  method: "POST";
  auth: false;
  body: RegisterPayload;
} {
  return {
    path: REGISTER_PATH,
    method: "POST",
    auth: false,
    body: buildRegisterPayload(values),
  };
}

export function registerPayloadKeys(payload: RegisterPayload): string[] {
  return Object.keys(payload);
}

export function payloadHasPrivilegedFields(payload: object): boolean {
  return PRIVILEGED_REGISTER_FIELDS.some((field) => field in payload);
}

export type LoginAfterRegisterParams = {
  registeredEmail: string;
  notice: string;
  fromRegister: true;
};

export function loginRouteAfterRegister(email: string): {
  name: "Login";
  params: LoginAfterRegisterParams;
} {
  return {
    name: "Login",
    params: {
      registeredEmail: email,
      notice: REGISTER_SUCCESS_NOTICE,
      fromRegister: true,
    },
  };
}

/** État M05 après 201 : e-mail seul, mot de passe réellement vide, pas d'autofill. */
export function loginFieldsAfterRegister(email: string): {
  email: string;
  password: "";
  notice: string;
  fromRegister: true;
  autofillPassword: false;
} {
  return {
    email,
    password: "",
    notice: REGISTER_SUCCESS_NOTICE,
    fromRegister: true,
    autofillPassword: false,
  };
}

export function canSubmitLogin(email: string, password: string): boolean {
  return Boolean(email.trim() && password.length > 0);
}

export function loginPasswordAutoFill(fromRegister: boolean): boolean {
  return !fromRegister;
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
};

export function passwordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Saisissez un mot de passe" };
  }
  const onlyNumeric = /^\d+$/.test(password);
  if (password.length < REGISTER_MIN_PASSWORD_LENGTH || onlyNumeric) {
    return { score: 1, label: "Trop court" };
  }
  const hasLetter = /[A-Za-zÀ-ÿ]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-zÀ-ÿ0-9]/.test(password);
  if (hasLetter && hasNumber && hasSpecial && password.length >= 10) {
    return { score: 4, label: "Solide" };
  }
  if (hasLetter && hasNumber) {
    return { score: 3, label: "Correct" };
  }
  return { score: 2, label: "Faible" };
}

function sanitizeRegisterMessage(message: string, fallback: string): string {
  const trimmed = message.trim();
  if (!trimmed || SENSITIVE_ERROR.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export function registerUserFacingError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return REGISTER_THROTTLE_MESSAGE;
    }
    if (error.status === 0) {
      // Conserve l'URL appelée (sans secret) pour distinguer une vieille IP SecureStore.
      return sanitizeRegisterMessage(error.message, REGISTER_UNAVAILABLE_MESSAGE);
    }
    if (error.status >= 500) {
      return `${REGISTER_UNAVAILABLE_MESSAGE} (HTTP ${error.status})`;
    }
    if (error.status === 403) {
      return sanitizeRegisterMessage(
        messageFromBody(error.body, "Inscription refusée (HTTP 403)."),
        "Inscription refusée (HTTP 403).",
      );
    }
    const fromBody = messageFromBody(error.body, error.message);
    return sanitizeRegisterMessage(fromBody, REGISTER_FALLBACK_ERROR);
  }
  if (error instanceof Error) {
    return sanitizeRegisterMessage(error.message, REGISTER_FALLBACK_ERROR);
  }
  return REGISTER_FALLBACK_ERROR;
}

export function isPaymentOrLightningPath(path: string): boolean {
  return PAYMENT_OR_LIGHTNING_PATHS.some((item) => path.includes(item.replace(/\/$/, "")));
}
