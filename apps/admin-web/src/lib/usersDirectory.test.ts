import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UserProfile } from "@smartpay/contracts";

import { userInitials } from "./userDetail";
import {
  ADMIN_USERS_PATH,
  USERS_ACCESS_DENIED,
  buildUsersQuery,
  defaultUsersFilters,
  exportUsersCsv,
  filtersAreDefault,
  roleBreakdown,
  usersCsvContainsSecrets,
  usersCsvFilename,
} from "./usersDirectory";

const row: UserProfile = {
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

describe("annuaire utilisateurs WA.5", () => {
  it("construit la requête API avec pagination et filtres serveur", () => {
    assert.equal(buildUsersQuery(defaultUsersFilters(), 1), `${ADMIN_USERS_PATH}?page=1&page_size=8`);
    assert.equal(
      buildUsersQuery({ query: "alice", role: "merchant", country: "CI", status: "inactive" }, 2),
      `${ADMIN_USERS_PATH}?page=2&page_size=8&q=alice&role=merchant&country=CI&is_active=false`,
    );
    assert.equal(filtersAreDefault(defaultUsersFilters()), true);
    assert.equal(filtersAreDefault({ query: "a", role: "all", country: "all", status: "all" }), false);
    assert.equal(USERS_ACCESS_DENIED.includes("Accès interdit"), true);
    assert.match(usersCsvFilename(new Date("2026-10-30T12:00:00Z")), /smartpay-w03-users-regtest-2026-10-30\.csv/);
  });

  it("n'exporte aucun secret et réutilise l'avatar sans e-mail", () => {
    const csv = exportUsersCsv([row]);
    assert.equal(usersCsvContainsSecrets(csv), false);
    assert.equal(csv.includes("password"), false);
    assert.equal(csv.includes("user@smartpay.local"), true);
    assert.equal(userInitials(row), null);
  });

  it("calcule la répartition des rôles depuis le résumé Django", () => {
    const roles = roleBreakdown({
      total: 3,
      active: 2,
      inactive: 1,
      by_role: { admin: 1, individual: 2, student: 0, merchant: 0, business: 0 },
    });
    assert.deepEqual(
      roles.map((item) => item.role),
      ["individual", "admin"],
    );
    assert.equal(
      roles.find((item) => item.role === "individual")?.count,
      2,
    );
  });
});
