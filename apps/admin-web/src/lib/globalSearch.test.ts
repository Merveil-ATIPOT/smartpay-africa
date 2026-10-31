import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UserProfile } from "@smartpay/contracts";

import {
  EMPTY_SEARCH_GROUPS,
  GLOBAL_SEARCH_PAGE_SIZE,
  GLOBAL_SEARCH_PLACEHOLDER,
  buildSearchGroups,
  flattenSearchHits,
  hitsContainSecrets,
  merchantsSearchPath,
  normalizeSearchQuery,
  searchHasDirectoryHits,
  transactionsSearchHref,
  usersSearchPath,
} from "./globalSearch";
import type { AdminMerchant } from "./merchantsDirectory";

const user: UserProfile = {
  id: 2,
  email: "user@smartpay.local",
  first_name: "",
  last_name: "",
  phone_number: "",
  role: "individual",
  country: "SN",
  is_active: true,
  date_joined: "2026-10-29T10:00:00Z",
};

const merchant = {
  id: 1,
  legal_name: "Boutique Demo SmartPay",
  display_name: "Boutique Demo",
  country: "SN" as const,
  registration_number: "",
  status: "active" as const,
  created_at: "2026-10-29T10:00:00Z",
  updated_at: "2026-10-29T10:00:00Z",
  payment_count: 0,
  owner: { id: 2, email: "user@smartpay.local", first_name: "", last_name: "" },
};

describe("recherche globale WA.7.1", () => {
  it("construit des requêtes paginées sans charger toute la base", () => {
    assert.equal(GLOBAL_SEARCH_PAGE_SIZE, 5);
    assert.equal(usersSearchPath("alice"), "/api/v1/admin/users/?page=1&page_size=5&q=alice");
    assert.equal(merchantsSearchPath("Demo"), "/api/v1/admin/merchants/?page=1&page_size=5&q=Demo");
    assert.equal(transactionsSearchHref("lnbc"), "/transactions?q=lnbc");
    assert.equal(normalizeSearchQuery("  "), "");
    assert.match(GLOBAL_SEARCH_PLACEHOLDER, /utilisateur, marchand ou transaction/);
  });

  it("regroupe les hits cliquables et n'invente pas de transaction", () => {
    const empty = buildSearchGroups("", [user], [merchant as AdminMerchant]);
    assert.deepEqual(empty, EMPTY_SEARCH_GROUPS);
    const groups = buildSearchGroups("demo", [user], [merchant as AdminMerchant]);
    assert.equal(groups.users[0]?.href, "/users/2");
    assert.equal(groups.merchants[0]?.href, "/merchants/1");
    assert.equal(groups.transactions.length, 1);
    assert.equal(groups.transactions[0]?.href, "/transactions?q=demo");
    assert.equal(searchHasDirectoryHits(groups), true);
    assert.equal(searchHasDirectoryHits(buildSearchGroups("zzz", [], [])), false);
    const flat = flattenSearchHits(groups);
    assert.equal(flat.length, 3);
    assert.equal(hitsContainSecrets(flat), false);
  });

  it("ignore une requête vide", () => {
    assert.equal(flattenSearchHits(buildSearchGroups("   ", [], [])).length, 0);
    assert.equal(transactionsSearchHref("  "), "/transactions");
  });
});
