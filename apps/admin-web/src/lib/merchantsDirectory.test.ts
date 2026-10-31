import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADMIN_MERCHANTS_PATH,
  MERCHANTS_ACCESS_DENIED,
  MERCHANTS_SUCCESS_RATE_UNAVAILABLE,
  buildMerchantsExport,
  buildMerchantsQuery,
  countryBreakdown,
  defaultMerchantsFilters,
  filtersAreDefault,
  merchantOwnerName,
  merchantStatusLabel,
  merchantsExportContainsSecrets,
  merchantsExportFilename,
  paymentCountLabel,
  type AdminMerchant,
} from "./merchantsDirectory";

const row: AdminMerchant = {
  id: 1,
  legal_name: "Boutique Demo SmartPay",
  display_name: "Boutique Demo",
  country: "SN",
  registration_number: "",
  status: "active",
  created_at: "2026-10-29T10:00:00Z",
  updated_at: "2026-10-29T10:00:00Z",
  payment_count: 0,
  owner: {
    id: 2,
    email: "user@smartpay.local",
    first_name: "",
    last_name: "",
  },
};

describe("annuaire marchands WA.6", () => {
  it("construit la requête API avec pagination et filtres serveur", () => {
    assert.equal(buildMerchantsQuery(defaultMerchantsFilters(), 1), `${ADMIN_MERCHANTS_PATH}?page=1&page_size=8`);
    assert.equal(
      buildMerchantsQuery({ query: "Demo", country: "CI", status: "draft" }, 2),
      `${ADMIN_MERCHANTS_PATH}?page=2&page_size=8&q=Demo&country=CI&status=draft`,
    );
    assert.equal(filtersAreDefault(defaultMerchantsFilters()), true);
    assert.equal(filtersAreDefault({ query: "a", country: "all", status: "all" }), false);
    assert.equal(MERCHANTS_ACCESS_DENIED.includes("Accès interdit"), true);
    assert.match(merchantsExportFilename(new Date("2026-10-30T12:00:00Z")), /smartpay-w05-merchants-regtest-2026-10-30\.json/);
  });

  it("n'exporte aucun secret et n'invente pas de fiche W06", () => {
    const payload = buildMerchantsExport([row]);
    assert.equal(merchantsExportContainsSecrets(payload), false);
    assert.equal(JSON.stringify(payload).includes("password"), false);
    assert.equal(JSON.stringify(payload).includes("macaroon"), false);
    assert.equal(payload.merchants[0]?.display_name, "Boutique Demo");
    assert.equal(payload.merchants[0]?.owner.email, "user@smartpay.local");
    assert.equal(merchantOwnerName(row.owner), "user@smartpay.local");
    assert.equal(merchantStatusLabel("active"), "Actif");
    assert.equal(merchantStatusLabel("draft"), "Brouillon");
    assert.equal(paymentCountLabel(0), "Aucun paiement lié");
    assert.equal(MERCHANTS_SUCCESS_RATE_UNAVAILABLE.includes("indisponible"), true);
  });

  it("calcule les pays représentés depuis le résumé Django", () => {
    const countries = countryBreakdown({
      total: 2,
      by_status: { active: 1, draft: 1, suspended: 0 },
      by_country: { SN: 1, CI: 1, CG: 0 },
      payments_linked: 0,
    });
    assert.deepEqual(
      countries.map((item) => item.country),
      ["SN", "CI"],
    );
  });
});
