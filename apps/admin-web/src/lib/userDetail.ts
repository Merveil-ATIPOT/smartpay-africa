import type { CountryCode, UserProfile, UserRole } from "@smartpay/contracts";

/** Consultation WA.5 — fiche administrateur GET /api/v1/admin/users/{id}/. */

export const USER_DETAIL_PATH_PREFIX = "/users/";
export const ME_PATH = "/api/v1/me/";
export const ADMIN_USER_DETAIL_SOURCE = "GET /api/v1/admin/users/{id}/";

export const USER_DETAIL_SOURCE_NOTE =
  "Source : GET /api/v1/admin/users/{id}/. Historique, préférences et audit restent indisponibles.";

export const USER_DETAIL_BANNER =
  "Consultation PostgreSQL · Banc d'essai Regtest (Dakar Bitcoin Hack 2026)";

export const USER_DETAIL_UNAVAILABLE = "Utilisateur introuvable.";

export const USER_DETAIL_ACCESS_DENIED = "Accès interdit. Cette fiche est réservée aux administrateurs.";

export const USER_HISTORY_UNAVAILABLE =
  "Historique indisponible : aucune source utilisateur autorisée n'est disponible.";

export const USER_AUDIT_UNAVAILABLE = "Aucun journal d'audit utilisateur disponible dans cette version.";

export const USER_AUDIT_REPORT_UNAVAILABLE =
  "Rapport d'audit indisponible : aucun journal utilisateur n'est encore accessible depuis l'API d'administration.";

export const USER_PREFERENCES_UNAVAILABLE = "Préférences non renseignées";

export const USER_LIST_UNAVAILABLE_NOTE = "Retour vers l'annuaire des utilisateurs.";

export const USER_LND_NODE_UNAVAILABLE = "Aucun nœud Lightning personnel n'est associé à ce compte.";

export const USER_SECURITY_NOTE =
  "Données de bac à sable. Aucun mot de passe, seed, macaroon, clé privée, jeton JWT ou secret n'est affiché dans cette console.";

export const MISSING_ADMIN_USER_ENDPOINTS = [
  "GET /api/v1/users/{id}/payments/",
  "GET /api/v1/users/{id}/transfers/",
  "GET /api/v1/users/{id}/audit/",
] as const;

export const COUNTRY_LABELS: Record<CountryCode, string> = {
  SN: "Sénégal",
  CI: "Côte d'Ivoire",
  CG: "Congo-Brazzaville",
};

export const COUNTRY_FLAGS: Record<CountryCode, string> = {
  SN: "🇸🇳",
  CI: "🇨🇮",
  CG: "🇨🇬",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  individual: "Particulier",
  student: "Étudiant",
  merchant: "Commerçant",
  business: "Entreprise",
  admin: "Administrateur",
};

export function userDetailHref(id: number | string): string {
  return `${USER_DETAIL_PATH_PREFIX}${id}`;
}

export function parseUserRouteId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

export function userDisplayName(profile: UserProfile): string {
  const full = `${profile.first_name} ${profile.last_name}`.replace(/\s+/g, " ").trim();
  return full || profile.email;
}

export function userInitials(profile: Pick<UserProfile, "first_name" | "last_name">): string | null {
  const first = profile.first_name.trim();
  const last = profile.last_name.trim();
  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }
  if (first) {
    return first[0].toUpperCase();
  }
  if (last) {
    return last[0].toUpperCase();
  }
  return null;
}

export function userRoleLabel(role: UserRole | string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

export function userCountryLabel(country: CountryCode | string): string {
  return COUNTRY_LABELS[country as CountryCode] ?? country;
}

export function userCountryFlag(country: CountryCode | string): string {
  return COUNTRY_FLAGS[country as CountryCode] ?? "";
}

export function accountStatusLabel(isActive: boolean): string {
  return isActive ? "Compte actif" : "Compte désactivé";
}

export function formatJoined(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export type UserDetailExport = {
  source: typeof ADMIN_USER_DETAIL_SOURCE;
  network: "regtest";
  note: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    role: UserRole;
    country: CountryCode;
    is_active: boolean;
    date_joined: string;
  };
};

const SECRET_KEYS = ["password", "token", "access", "refresh", "macaroon", "seed", "secret", "jwt"] as const;

export function buildUserExport(profile: UserProfile): UserDetailExport {
  return {
    source: ADMIN_USER_DETAIL_SOURCE,
    network: "regtest",
    note: USER_DETAIL_SOURCE_NOTE,
    user: {
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone_number: profile.phone_number.trim() ? profile.phone_number : null,
      role: profile.role,
      country: profile.country,
      is_active: profile.is_active,
      date_joined: profile.date_joined,
    },
  };
}

export function exportContainsSecrets(payload: unknown): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  return SECRET_KEYS.some((key) => text.includes(`"${key}"`));
}

export function userExportFilename(id: number, now = new Date()): string {
  return `smartpay-w04-user-${id}-regtest-${now.toISOString().slice(0, 10)}.json`;
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function stitchIllustrationIsNotUsed(): boolean {
  return true;
}

export function adminUserLookupEnabled(): boolean {
  return true;
}

export function userOperationsLookupEnabled(): boolean {
  return false;
}

export function userAuditLookupEnabled(): boolean {
  return false;
}
