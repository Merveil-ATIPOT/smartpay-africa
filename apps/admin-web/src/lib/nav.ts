export type AdminNavItem = {
  id: string;
  label: string;
  available: boolean;
  phase: string;
  note: string;
  href?: string;
};

export type AdminNavGroup = {
  id: string;
  title: string;
  items: readonly AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    id: "supervision",
    title: "Supervision",
    items: [
      {
        id: "w02",
        label: "Vue d'ensemble",
        available: true,
        phase: "WA.2",
        note: "Tableau de bord illustratif",
        href: "/",
      },
      {
        id: "w07",
        label: "Transactions Regtest",
        available: true,
        phase: "WA.3",
        note: "Consultation Django des 100 derniers paiements et simulations",
        href: "/transactions",
      },
      {
        id: "w08",
        label: "Corridors internationaux",
        available: true,
        phase: "WA.11",
        note: "Supervision des parcours Transfer et du catalogue de simulation",
        href: "/corridors",
      },
    ],
  },
  {
    id: "ecosystem",
    title: "Écosystème",
    items: [
      {
        id: "w03",
        label: "Utilisateurs",
        available: true,
        phase: "WA.5",
        note: "Annuaire PostgreSQL en lecture seule",
        href: "/users",
      },
      {
        id: "w05",
        label: "Marchands",
        available: true,
        phase: "WA.6",
        note: "Annuaire PostgreSQL et fiche W06 en lecture seule",
        href: "/merchants",
      },
    ],
  },
  {
    id: "infra",
    title: "Infrastructure & Audit",
    items: [
      {
        id: "w09",
        label: "Nœud & Infrastructure LND",
        available: true,
        phase: "WA.8",
        note: "Supervision LND, Django et PostgreSQL en lecture seule",
        href: "/infrastructure",
      },
      {
        id: "audit",
        label: "Audit & Sécurité",
        available: true,
        phase: "WA.9",
        note: "Journal AuditLog PostgreSQL en lecture seule",
        href: "/audit",
      },
    ],
  },
  {
    id: "system",
    title: "Système",
    items: [
      {
        id: "settings",
        label: "Paramètres",
        available: true,
        phase: "WA.10",
        note: "Identité /me/ et environnement infrastructure en lecture seule",
        href: "/settings",
      },
      {
        id: "help",
        label: "Assistance",
        available: true,
        phase: "WA.10",
        note: "Centre d'aide statique, sans ticket ni canal externe",
        href: "/help",
      },
    ],
  },
];

export const ADMIN_HOME_HREF = "/";
export const ADMIN_LOGIN_HREF = "/login";
export const ADMIN_TRANSACTIONS_HREF = "/transactions";
export const ADMIN_USERS_HREF = "/users";
export const ADMIN_USER_DETAIL_PREFIX = "/users/";
export const ADMIN_MERCHANTS_HREF = "/merchants";
export const ADMIN_MERCHANT_DETAIL_PREFIX = "/merchants/";
export const ADMIN_INFRASTRUCTURE_HREF = "/infrastructure";
export const ADMIN_AUDIT_HREF = "/audit";
export const ADMIN_SETTINGS_HREF = "/settings";
export const ADMIN_HELP_HREF = "/help";
export const ADMIN_CORRIDORS_HREF = "/corridors";

export function userDetailHref(id: number | string): string {
  return `${ADMIN_USER_DETAIL_PREFIX}${id}`;
}

export function merchantDetailHref(id: number | string): string {
  return `${ADMIN_MERCHANT_DETAIL_PREFIX}${id}`;
}

export function flattenNavItems(groups: readonly AdminNavGroup[] = ADMIN_NAV_GROUPS): readonly AdminNavItem[] {
  return groups.flatMap((group) => group.items);
}

export function hasOperationalNavItem(groups: readonly AdminNavGroup[] = ADMIN_NAV_GROUPS): boolean {
  return flattenNavItems(groups).some((item) => item.available);
}

export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (!item.available || !item.href) {
    return false;
  }
  if (item.href === ADMIN_USERS_HREF) {
    return pathname === ADMIN_USERS_HREF || pathname.startsWith(ADMIN_USER_DETAIL_PREFIX);
  }
  if (item.href === ADMIN_MERCHANTS_HREF) {
    return pathname === ADMIN_MERCHANTS_HREF || pathname.startsWith(ADMIN_MERCHANT_DETAIL_PREFIX);
  }
  return pathname === item.href;
}
