import type { CountryCode } from "@smartpay/contracts";

import { COUNTRY_LABELS, exportContainsSecrets } from "./userDetail";

export const ADMIN_MERCHANTS_PATH = "/api/v1/admin/merchants/";
export const ADMIN_MERCHANTS_PAGE_SIZE = 8;

export const MERCHANTS_SOURCE_NOTE =
  "Boutiques PostgreSQL via GET /api/v1/admin/merchants/. Aucun chiffre Stitch 84. Aucun solde Lightning.";

export const MERCHANTS_ACCESS_DENIED = "Accès interdit. Seul un administrateur peut consulter cet annuaire.";

export const MERCHANTS_KPI_UNAVAILABLE = "Indisponible";

export const MERCHANTS_SUCCESS_RATE_UNAVAILABLE =
  "Taux de réussite indisponible : aucune métrique de scénario fiable n'est calculée.";

export const MERCHANTS_ACTIVITY_TYPE_UNAVAILABLE = "Type d'activité non renseigné dans le modèle Merchant.";

export type MerchantStatus = "draft" | "active" | "suspended";

export type MerchantOwner = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
};

export type AdminMerchant = {
  id: number;
  legal_name: string;
  display_name: string;
  country: CountryCode;
  registration_number: string;
  status: MerchantStatus;
  created_at: string;
  updated_at: string;
  owner: MerchantOwner;
  payment_count: number;
};

export type MerchantsListFilters = {
  query: string;
  country: "all" | CountryCode;
  status: "all" | MerchantStatus;
};

export type MerchantsSummary = {
  total: number;
  by_status: Partial<Record<MerchantStatus, number>>;
  by_country: Partial<Record<CountryCode, number>>;
  payments_linked: number;
};

export type MerchantsListPayload = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminMerchant[];
  summary: MerchantsSummary;
};

export const EMPTY_MERCHANTS_SUMMARY: MerchantsSummary = {
  total: 0,
  by_status: {},
  by_country: {},
  payments_linked: 0,
};

export const COUNTRY_FILTERS: { id: MerchantsListFilters["country"]; label: string }[] = [
  { id: "all", label: "Tous les pays (SN, CI, CG)" },
  { id: "SN", label: "Sénégal" },
  { id: "CI", label: "Côte d'Ivoire" },
  { id: "CG", label: "Congo-Brazzaville" },
];

export const STATUS_FILTERS: { id: MerchantsListFilters["status"]; label: string }[] = [
  { id: "all", label: "Tous les statuts" },
  { id: "active", label: "Actif" },
  { id: "draft", label: "Brouillon" },
  { id: "suspended", label: "Suspendu" },
];

export const MERCHANT_STATUS_LABELS: Record<MerchantStatus, string> = {
  draft: "Brouillon",
  active: "Actif",
  suspended: "Suspendu",
};

export function defaultMerchantsFilters(): MerchantsListFilters {
  return { query: "", country: "all", status: "all" };
}

export function filtersAreDefault(filters: MerchantsListFilters): boolean {
  return filters.query.trim() === "" && filters.country === "all" && filters.status === "all";
}

export function buildMerchantsQuery(
  filters: MerchantsListFilters,
  page: number,
  pageSize = ADMIN_MERCHANTS_PAGE_SIZE,
): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, page)));
  params.set("page_size", String(pageSize));
  const query = filters.query.trim();
  if (query) {
    params.set("q", query);
  }
  if (filters.country !== "all") {
    params.set("country", filters.country);
  }
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }
  return `${ADMIN_MERCHANTS_PATH}?${params.toString()}`;
}

export function merchantStatusLabel(status: MerchantStatus | string): string {
  return MERCHANT_STATUS_LABELS[status as MerchantStatus] ?? status;
}

export function merchantOwnerName(owner: MerchantOwner): string {
  const full = `${owner.first_name} ${owner.last_name}`.replace(/\s+/g, " ").trim();
  return full || owner.email;
}

export function countryBreakdown(summary: MerchantsSummary): { country: CountryCode; label: string; count: number }[] {
  return (Object.keys(COUNTRY_LABELS) as CountryCode[])
    .map((country) => ({ country, label: COUNTRY_LABELS[country], count: summary.by_country[country] ?? 0 }))
    .filter((item) => item.count > 0);
}

export type MerchantsPageExport = {
  source: typeof ADMIN_MERCHANTS_PATH;
  network: "regtest";
  note: string;
  count: number;
  merchants: Array<{
    id: number;
    legal_name: string;
    display_name: string;
    country: CountryCode;
    registration_number: string;
    status: MerchantStatus;
    created_at: string;
    updated_at: string;
    payment_count: number;
    owner: MerchantOwner;
  }>;
};

export function buildMerchantsExport(rows: readonly AdminMerchant[]): MerchantsPageExport {
  return {
    source: ADMIN_MERCHANTS_PATH,
    network: "regtest",
    note: MERCHANTS_SOURCE_NOTE,
    count: rows.length,
    merchants: rows.map((row) => ({
      id: row.id,
      legal_name: row.legal_name,
      display_name: row.display_name,
      country: row.country,
      registration_number: row.registration_number,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      payment_count: row.payment_count,
      owner: {
        id: row.owner.id,
        email: row.owner.email,
        first_name: row.owner.first_name,
        last_name: row.owner.last_name,
      },
    })),
  };
}

export function merchantsExportFilename(now = new Date()): string {
  return `smartpay-w05-merchants-regtest-${now.toISOString().slice(0, 10)}.json`;
}

export function merchantsExportContainsSecrets(payload: unknown): boolean {
  return exportContainsSecrets(payload);
}

export function formatCreatedStamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function paymentCountLabel(count: number): string {
  if (count <= 0) {
    return "Aucun paiement lié";
  }
  return `${count.toLocaleString("fr-FR")} paiement${count > 1 ? "s" : ""} lié${count > 1 ? "s" : ""}`;
}
