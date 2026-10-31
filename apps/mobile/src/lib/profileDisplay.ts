import type { CountryCode, UserProfile, UserRole } from "@smartpay/contracts";

import { countryLine } from "./format";
import { MERCHANT_DEMO_ENTRY_LABEL } from "./merchantDemo";
import { MERCHANT_ROOT_ROUTE } from "./merchantNavigation";
import { isPaymentOrLightningPath } from "./registerForm";

export const PROFILE_ME_PATH = "/api/v1/me/";
export const PROFILE_REGTEST_BADGE = "Mode Démonstration · Regtest";
export const PROFILE_MERCHANT_CTA = `Accéder à la ${MERCHANT_DEMO_ENTRY_LABEL}`;
export const PROFILE_MERCHANT_HINT =
  "Espace de démonstration · aucun paiement Lightning · le rôle du compte ne change pas";
export const PROFILE_LOGOUT_LABEL = "Déconnexion de la session";
export const PROFILE_DEFERRED_NOTE =
  "Sécurité, préférences et aide (M37–M39) arriveront plus tard. Aucun réglage fictif n'est proposé ici.";
export const PROFILE_SANDBOX_FOOTER =
  "Environnement de démonstration Regtest. La déconnexion efface uniquement la session JWT locale.";

export const PROFILE_MERCHANT_NAVIGATION = {
  route: MERCHANT_ROOT_ROUTE,
  mutatesRole: false,
  createsMerchant: false,
  callsDjangoMerchant: false,
} as const;

export const PROFILE_LOGOUT = {
  clearsLocalJwt: true,
  returnsTo: "Welcome",
  backendMutation: false,
} as const;

export const PROFILE_DEFERRED_SECTIONS = [
  { code: "M37", title: "Sécurité et biométrie" },
  { code: "M38", title: "Préférences d'affichage" },
  { code: "M39", title: "Aide et support" },
] as const;

const ROLE_LABELS: Record<UserRole, string> = {
  individual: "Particulier",
  student: "Étudiant",
  merchant: "Commerçant",
  business: "Entreprise",
  admin: "Administrateur",
};

export function profileDisplayName(user: Pick<UserProfile, "first_name" | "last_name" | "email">): string {
  const full = `${user.first_name} ${user.last_name}`.replace(/\s+/g, " ").trim();
  if (full) {
    return full;
  }
  return user.email.split("@")[0] || "Compte";
}

export function profileInitials(user: Pick<UserProfile, "first_name" | "last_name" | "email">): string {
  const first = user.first_name.trim();
  const last = user.last_name.trim();
  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }
  if (first.length >= 2) {
    return first.slice(0, 2).toUpperCase();
  }
  const local = user.email.split("@")[0] ?? "";
  return (local.slice(0, 2) || "SP").toUpperCase();
}

export function profileRoleLabel(role: UserRole | string): string {
  if (role in ROLE_LABELS) {
    return ROLE_LABELS[role as UserRole];
  }
  return String(role);
}

export function profileCountryLine(country: CountryCode | string): string {
  return countryLine(country);
}

export function profileAccountStatus(isActive: boolean): string {
  return isActive ? "Actif" : "Inactif";
}

export function formatJoinedDate(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) {
    return "—";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(ts));
}

export type ProfileInfoRow = {
  key: "email" | "country" | "role" | "phone" | "joined" | "status";
  label: string;
  value: string;
};

/** Champs réellement renvoyés par GET /me/. Aucun KYC, score ou solde. */
export function profileInfoRows(user: UserProfile): ProfileInfoRow[] {
  const rows: ProfileInfoRow[] = [
    { key: "email", label: "E-mail", value: user.email },
    { key: "country", label: "Pays", value: profileCountryLine(user.country) },
    { key: "role", label: "Type de compte", value: profileRoleLabel(user.role) },
  ];
  const phone = user.phone_number.trim();
  if (phone) {
    rows.push({ key: "phone", label: "Téléphone (non vérifié)", value: phone });
  }
  rows.push(
    { key: "joined", label: "Inscription", value: formatJoinedDate(user.date_joined) },
    { key: "status", label: "Statut du compte", value: profileAccountStatus(user.is_active) },
  );
  return rows;
}

export function visibleProfileCopy(user: UserProfile): string {
  return [
    PROFILE_REGTEST_BADGE,
    profileDisplayName(user),
    profileRoleLabel(user.role),
    profileCountryLine(user.country),
    user.email,
    PROFILE_MERCHANT_CTA,
    PROFILE_MERCHANT_HINT,
    PROFILE_DEFERRED_NOTE,
    PROFILE_LOGOUT_LABEL,
    PROFILE_SANDBOX_FOOTER,
    ...profileInfoRows(user).map((row) => `${row.label} ${row.value}`),
  ].join("\n");
}

const FORBIDDEN_PROFILE_CLAIMS = [
  /niveau\s*2/i,
  /\bkyc\b/i,
  /niveau 2 vérifié/i,
  /identité vérifiée/i,
  /score\s*100/i,
  /volume cumul/i,
  /1[.,]8\s*m/i,
  /adresse lightning/i,
  /face id/i,
  /\bwave\b/i,
  /orange money/i,
  /clés privées lnd/i,
  /solde personnel/i,
];

export function profileCopyHasForbiddenClaim(copy: string): boolean {
  return FORBIDDEN_PROFILE_CLAIMS.some((pattern) => pattern.test(copy));
}

export function profileUsesMeEndpointOnly(path: string): boolean {
  return path === PROFILE_ME_PATH && !isPaymentOrLightningPath(path);
}

export function profileMerchantLeavesRoleUntouched(currentRole: UserRole): UserRole {
  return currentRole;
}
