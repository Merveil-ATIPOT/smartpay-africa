import type { UserProfile } from "@smartpay/contracts";

import { ME_PATH } from "./api";
import {
  formatCheckedAt,
  nodeStatusLabel,
  nodeStatusTone,
  type InfrastructureNode,
  type InfrastructureSnapshot,
} from "./infrastructure";
import { ADMIN_INFRASTRUCTURE_HREF } from "./nav";
import { userCountryLabel, userDisplayName, userRoleLabel } from "./userDetail";

export const ADMIN_SETTINGS_PATH = ME_PATH;

export const SETTINGS_TITLE = "Paramètres";

export const SETTINGS_SUBTITLE =
  "Consultation lecture seule du compte administrateur et de l'environnement de démonstration.";

export const SETTINGS_REGTEST_BADGE = "Environnement Regtest";

export const SETTINGS_SOURCE_NOTE =
  "Sources : GET /api/v1/me/ et GET /api/v1/admin/infrastructure/. Aucune maquette W11. Aucune mutation.";

export const SETTINGS_ACCESS_DENIED = "Accès interdit. Les paramètres administrateur sont réservés aux administrateurs.";

export const SETTINGS_LOADING = "Chargement des paramètres…";

export const SETTINGS_IDENTITY_UNAVAILABLE = "Identité administrateur indisponible.";

export const SETTINGS_ENVIRONMENT_UNAVAILABLE = "Environnement technique indisponible.";

export const SETTINGS_VALUE_ABSENT = "Non renseigné";

export const SETTINGS_SECURITY_NOTE =
  "Aucun mot de passe, jeton JWT, seed, macaroon, certificat ou chemin LND n'est exposé. " +
  "Les fichiers .env, LND et PostgreSQL ne sont pas modifiables depuis cet écran.";

export const SETTINGS_UNAVAILABLE_SECURITY = [
  {
    id: "password",
    label: "Modification du mot de passe",
    note: "Aucun endpoint de changement de mot de passe n'est exposé.",
  },
  {
    id: "totp",
    label: "Authentification à deux facteurs",
    note: "Aucun second facteur n'est enregistré ni proposé par l'API.",
  },
  {
    id: "sessions",
    label: "Gestion des sessions actives",
    note: "La session JWT reste locale. Aucune liste de sessions n'est disponible.",
  },
] as const;

export const SETTINGS_UNAVAILABLE_PREFERENCES = [
  {
    id: "language",
    label: "Langue de l'interface",
    note: "Aucune préférence de langue n'est persistée.",
  },
  {
    id: "display",
    label: "Préférences d'affichage",
    note: "Aucun thème ni unité n'est enregistré côté serveur.",
  },
  {
    id: "notifications",
    label: "Notifications administratives",
    note: "Aucun canal de notification n'est branché.",
  },
] as const;

export const SETTINGS_INFRASTRUCTURE_HREF = ADMIN_INFRASTRUCTURE_HREF;

export type SettingsIdentity = {
  displayName: string | null;
  email: string;
  roleLabel: string;
  countryLabel: string;
  phone: string | null;
};

export function settingsIdentity(profile: UserProfile): SettingsIdentity {
  const first = profile.first_name.trim();
  const last = profile.last_name.trim();
  return {
    displayName: first || last ? userDisplayName(profile) : null,
    email: profile.email,
    roleLabel: userRoleLabel(profile.role),
    countryLabel: userCountryLabel(profile.country),
    phone: profile.phone_number.trim() || null,
  };
}

export function settingsIdentityHasSecrets(identity: SettingsIdentity): boolean {
  const blob = JSON.stringify(identity).toLowerCase();
  return /password|macaroon|seed|jwt|eyj|"last_login"|"kyc"|"2fa"|"totp"/.test(blob);
}

export function djangoAvailabilityLabel(status: InfrastructureSnapshot["django"]["status"] | undefined): string {
  return status === "ok" ? "Disponible" : "Indisponible";
}

export function postgresAvailabilityLabel(status: InfrastructureSnapshot["postgres"]["status"] | undefined): string {
  return status === "up" ? "Disponible" : "Indisponible";
}

export function settingsNodeLabel(node: InfrastructureNode | undefined): string {
  if (!node) {
    return "Indisponible";
  }
  return nodeStatusLabel(node);
}

export function settingsNodeTone(node: InfrastructureNode | undefined): "ok" | "warn" | "bad" | "muted" {
  if (!node) {
    return "muted";
  }
  if (node.connected && node.synced_to_chain === false) {
    return "warn";
  }
  return nodeStatusTone(node.status);
}

export function settingsCheckedAt(iso: string | undefined): string {
  return formatCheckedAt(iso);
}

export function settingsContainsSecrets(payload: unknown): boolean {
  const blob = JSON.stringify(payload).toLowerCase();
  return /admin\.macaroon|\/run\/lnd|grpc-metadata|eyj[a-z0-9_-]+\.|encoded_invoice/.test(blob);
}

export function neverFetchPaymentDetail(): boolean {
  return true;
}

export function settingsHasSaveAction(): boolean {
  return false;
}
