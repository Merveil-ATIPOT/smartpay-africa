export const LOGIN_TITLE = "Portail Administrateur";
export const LOGIN_SUBTITLE = "Supervision de la démonstration Lightning Regtest — Dakar Bitcoin Hack 2026.";
export const LOGIN_SUBMIT_LABEL = "Se connecter au portail Regtest";
export const LOGIN_EMAIL_PLACEHOLDER = "e-mail administrateur";
export const LOGIN_PASSWORD_PLACEHOLDER = "Mot de passe";
export const REGTEST_BANNER = "Environnement de démonstration Regtest";
export const REGTEST_BANNER_DETAIL =
  "Accès réservé aux opérateurs de la démonstration. Aucune transaction financière réelle.";

export function validateLoginFields(email: string, password: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Saisissez une adresse e-mail.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Adresse e-mail invalide.";
  }
  if (!password) {
    return "Saisissez le mot de passe.";
  }
  return null;
}

export function loginUserFacingError(status: number): string {
  if (status === 0) {
    return "API injoignable. Vérifiez que le backend est démarré.";
  }
  if (status === 401) {
    return "Identifiants incorrects.";
  }
  if (status === 403) {
    return "Ce compte n'est pas autorisé à administrer le portail.";
  }
  if (status === 429) {
    return "Trop de tentatives. Réessayez plus tard.";
  }
  if (status >= 500) {
    return "Service temporairement indisponible.";
  }
  return "Connexion impossible.";
}

export function containsSensitiveAuthText(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes("jwt") ||
    lower.includes("bearer ") ||
    lower.includes("macaroon") ||
    lower.includes("changeme") ||
    lower.includes("hackathon2026") ||
    /eyj[a-z0-9_-]+\.[a-z0-9_-]+/i.test(value)
  );
}
