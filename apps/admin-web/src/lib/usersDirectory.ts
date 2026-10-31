import type { CountryCode, UserProfile, UserRole } from "@smartpay/contracts";

import { ROLE_LABELS, userDisplayName } from "./userDetail";

export const ADMIN_USERS_PATH = "/api/v1/admin/users/";
export const ADMIN_USERS_PAGE_SIZE = 8;

export const USERS_SOURCE_NOTE =
  "Comptes PostgreSQL via GET /api/v1/admin/users/. Aucun chiffre Stitch 1 248. Aucun solde Lightning.";

export const USERS_ACCESS_DENIED = "Accès interdit. Seul un administrateur peut consulter cet annuaire.";

export const USERS_KPI_UNAVAILABLE = "Indisponible";

export type UsersListFilters = {
  query: string;
  role: "all" | UserRole;
  country: "all" | CountryCode;
  status: "all" | "active" | "inactive";
};

export type UsersSummary = {
  total: number;
  active: number;
  inactive: number;
  by_role: Partial<Record<UserRole, number>>;
};

export type UsersListPayload = {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserProfile[];
  summary: UsersSummary;
};

export const EMPTY_SUMMARY: UsersSummary = {
  total: 0,
  active: 0,
  inactive: 0,
  by_role: {},
};

export const ROLE_FILTERS: { id: UsersListFilters["role"]; label: string }[] = [
  { id: "all", label: "Tous les rôles" },
  { id: "individual", label: ROLE_LABELS.individual },
  { id: "student", label: ROLE_LABELS.student },
  { id: "merchant", label: ROLE_LABELS.merchant },
  { id: "business", label: ROLE_LABELS.business },
  { id: "admin", label: ROLE_LABELS.admin },
];

export const COUNTRY_FILTERS: { id: UsersListFilters["country"]; label: string }[] = [
  { id: "all", label: "Tous les pays" },
  { id: "SN", label: "Sénégal" },
  { id: "CI", label: "Côte d'Ivoire" },
  { id: "CG", label: "Congo-Brazzaville" },
];

export const STATUS_FILTERS: { id: UsersListFilters["status"]; label: string }[] = [
  { id: "all", label: "Tous les statuts" },
  { id: "active", label: "Actif" },
  { id: "inactive", label: "Inactif" },
];

export function defaultUsersFilters(): UsersListFilters {
  return { query: "", role: "all", country: "all", status: "all" };
}

export function filtersAreDefault(filters: UsersListFilters): boolean {
  return filters.query.trim() === "" && filters.role === "all" && filters.country === "all" && filters.status === "all";
}

export function buildUsersQuery(filters: UsersListFilters, page: number, pageSize = ADMIN_USERS_PAGE_SIZE): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, page)));
  params.set("page_size", String(pageSize));
  const query = filters.query.trim();
  if (query) {
    params.set("q", query);
  }
  if (filters.role !== "all") {
    params.set("role", filters.role);
  }
  if (filters.country !== "all") {
    params.set("country", filters.country);
  }
  if (filters.status === "active") {
    params.set("is_active", "true");
  } else if (filters.status === "inactive") {
    params.set("is_active", "false");
  }
  return `${ADMIN_USERS_PATH}?${params.toString()}`;
}

export function adminUserDetailPath(id: number): string {
  return `${ADMIN_USERS_PATH}${id}/`;
}

export function roleBreakdown(summary: UsersSummary): { role: UserRole; label: string; count: number }[] {
  return (Object.keys(ROLE_LABELS) as UserRole[])
    .map((role) => ({ role, label: ROLE_LABELS[role], count: summary.by_role[role] ?? 0 }))
    .filter((item) => item.count > 0);
}

export function exportUsersCsv(rows: readonly UserProfile[]): string {
  const header = ["id", "email", "first_name", "last_name", "phone_number", "role", "country", "is_active", "date_joined"];
  const lines = rows.map((row) =>
    [
      String(row.id),
      row.email,
      row.first_name,
      row.last_name,
      row.phone_number,
      row.role,
      row.country,
      row.is_active ? "true" : "false",
      row.date_joined,
    ]
      .map((cell) => `"${cell.replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function usersCsvFilename(now = new Date()): string {
  return `smartpay-w03-users-regtest-${now.toISOString().slice(0, 10)}.csv`;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function usersCsvContainsSecrets(csv: string): boolean {
  return /password|macaroon|seed|jwt|access|refresh/i.test(csv.split("\n")[0] ?? "");
}

export function formatJoinedStamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function userRowLabel(profile: UserProfile): string {
  return userDisplayName(profile);
}
