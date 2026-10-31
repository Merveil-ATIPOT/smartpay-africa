import type { UserProfile, UserRole } from "@smartpay/contracts";

/**
 * Seul signal d'administration exposé par GET /api/v1/me/.
 * is_staff et is_superuser existent en base mais ne sont pas dans MeSerializer.
 * On ne les invente pas côté client.
 */
export const PORTAL_ADMIN_ROLE: UserRole = "admin";

export const ADMIN_FORBIDDEN_MESSAGE =
  "Ce compte n'est pas autorisé à administrer le portail. Un jeton Particulier ne suffit pas.";

export const ADMIN_GATE_LIMITATION =
  "GET /me/ n'expose ni is_staff ni is_superuser. Le portail n'accepte que role=admin et is_active=true renvoyés par le serveur.";

export function isPortalAdmin(profile: Pick<UserProfile, "role" | "is_active"> | null | undefined): boolean {
  if (!profile) {
    return false;
  }
  return profile.is_active === true && profile.role === PORTAL_ADMIN_ROLE;
}

export function portalDisplayName(profile: Pick<UserProfile, "first_name" | "last_name" | "email">): string {
  const full = `${profile.first_name} ${profile.last_name}`.replace(/\s+/g, " ").trim();
  return full || profile.email;
}

export function portalRoleLabel(role: UserRole | string): string {
  if (role === "admin") {
    return "Administrateur";
  }
  return "Non administrateur";
}
