import type { UserProfile } from "@smartpay/contracts";

import { merchantOwnerName, type AdminMerchant, buildMerchantsQuery } from "./merchantsDirectory";
import { merchantDetailHref, userDetailHref } from "./nav";
import { buildUsersQuery } from "./usersDirectory";
import { userDisplayName } from "./userDetail";

export const GLOBAL_SEARCH_PLACEHOLDER = "Rechercher un utilisateur, marchand ou transaction...";

export const GLOBAL_SEARCH_DEBOUNCE_MS = 300;

export const GLOBAL_SEARCH_PAGE_SIZE = 5;

export const GLOBAL_SEARCH_EMPTY = "Aucun résultat trouvé";

export const GLOBAL_SEARCH_LOADING = "Recherche en cours…";

export const GLOBAL_SEARCH_TX_NOTE = "Filtre local WA.3 — pas une recherche serveur globale.";

export type SearchCategory = "users" | "merchants" | "transactions";

export type GlobalSearchHit = {
  key: string;
  category: SearchCategory;
  href: string;
  title: string;
  subtitle: string;
};

export type GlobalSearchGroups = {
  users: GlobalSearchHit[];
  merchants: GlobalSearchHit[];
  transactions: GlobalSearchHit[];
};

export const EMPTY_SEARCH_GROUPS: GlobalSearchGroups = {
  users: [],
  merchants: [],
  transactions: [],
};

export function normalizeSearchQuery(raw: string): string {
  return raw.trim();
}

export function usersSearchPath(query: string): string {
  return buildUsersQuery({ query, role: "all", country: "all", status: "all" }, 1, GLOBAL_SEARCH_PAGE_SIZE);
}

export function merchantsSearchPath(query: string): string {
  return buildMerchantsQuery({ query, country: "all", status: "all" }, 1, GLOBAL_SEARCH_PAGE_SIZE);
}

export function transactionsSearchHref(query: string): string {
  const value = normalizeSearchQuery(query);
  if (!value) {
    return "/transactions";
  }
  return `/transactions?q=${encodeURIComponent(value)}`;
}

export function mapUserHits(rows: readonly UserProfile[]): GlobalSearchHit[] {
  return rows.map((row) => ({
    key: `user-${row.id}`,
    category: "users",
    href: userDetailHref(row.id),
    title: userDisplayName(row),
    subtitle: `${row.email} · ID ${row.id}`,
  }));
}

export function mapMerchantHits(rows: readonly AdminMerchant[]): GlobalSearchHit[] {
  return rows.map((row) => ({
    key: `merchant-${row.id}`,
    category: "merchants",
    href: merchantDetailHref(row.id),
    title: row.display_name,
    subtitle: `${row.legal_name} · ${merchantOwnerName(row.owner)} · ID ${row.id}`,
  }));
}

export function transactionShortcut(query: string): GlobalSearchHit {
  const value = normalizeSearchQuery(query);
  return {
    key: "tx-shortcut",
    category: "transactions",
    href: transactionsSearchHref(value),
    title: `Rechercher « ${value} » dans Transactions Regtest`,
    subtitle: GLOBAL_SEARCH_TX_NOTE,
  };
}

export function buildSearchGroups(
  query: string,
  users: readonly UserProfile[],
  merchants: readonly AdminMerchant[],
): GlobalSearchGroups {
  const value = normalizeSearchQuery(query);
  if (!value) {
    return EMPTY_SEARCH_GROUPS;
  }
  return {
    users: mapUserHits(users),
    merchants: mapMerchantHits(merchants),
    transactions: [transactionShortcut(value)],
  };
}

export function flattenSearchHits(groups: GlobalSearchGroups): GlobalSearchHit[] {
  return [...groups.users, ...groups.merchants, ...groups.transactions];
}

export function searchHasDirectoryHits(groups: GlobalSearchGroups): boolean {
  return groups.users.length > 0 || groups.merchants.length > 0;
}

export function hitsContainSecrets(hits: readonly GlobalSearchHit[]): boolean {
  return hits.some((hit) => /password|macaroon|seed|jwt|encoded_invoice/i.test(`${hit.title} ${hit.subtitle} ${hit.href}`));
}
