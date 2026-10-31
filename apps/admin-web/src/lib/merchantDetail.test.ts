import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EMPTY_MERCHANT_PAYMENTS,
  MERCHANT_AUDIT_UNAVAILABLE,
  MERCHANT_DETAIL_ACCESS_DENIED,
  MERCHANT_QR_UNAVAILABLE,
  adminMerchantLookupEnabled,
  buildMerchantExport,
  lightningStatusLabel,
  merchantExportContainsSecrets,
  merchantExportFilename,
  merchantPaymentStatusLabel,
  parseMerchantRouteId,
  shortPaymentId,
  type AdminMerchantDetail,
} from "./merchantDetail";

const detail: AdminMerchantDetail = {
  id: 1,
  legal_name: "Boutique Demo SmartPay",
  display_name: "Boutique Demo",
  country: "SN",
  registration_number: "",
  status: "active",
  created_at: "2026-10-29T10:00:00Z",
  updated_at: "2026-10-29T10:00:00Z",
  payment_count: 0,
  owner: { id: 2, email: "user@smartpay.local", first_name: "", last_name: "" },
  payments_summary: {
    linked: 0,
    pending: 0,
    django_confirmed: 0,
    lightning_settled: 0,
    failed_or_expired: 0,
    amount_sats_linked: 0,
  },
  recent_payments: [],
};

describe("fiche marchand WA.7", () => {
  it("identifie la route numérique", () => {
    assert.equal(parseMerchantRouteId("1"), 1);
    assert.equal(parseMerchantRouteId("almadies"), null);
    assert.equal(parseMerchantRouteId("0"), null);
    assert.equal(adminMerchantLookupEnabled(), true);
    assert.equal(MERCHANT_DETAIL_ACCESS_DENIED.includes("Accès interdit"), true);
  });

  it("n'invente ni QR payable, ni journal, ni taux Stitch", () => {
    assert.equal(MERCHANT_QR_UNAVAILABLE.includes("indisponible"), true);
    assert.equal(MERCHANT_AUDIT_UNAVAILABLE.includes("aucun événement"), true);
    assert.equal(EMPTY_MERCHANT_PAYMENTS.includes("Aucun paiement lié"), true);
    assert.equal(merchantPaymentStatusLabel("confirmed"), "Confirmé (métier)");
    assert.equal(lightningStatusLabel("settled"), "Réglé Lightning");
    assert.equal(shortPaymentId("abcdef12-3456-7890"), "abcdef123456");
  });

  it("exporte la fiche sans secret ni facture BOLT11", () => {
    const payload = buildMerchantExport(detail);
    assert.equal(merchantExportContainsSecrets(payload), false);
    assert.equal(JSON.stringify(payload).includes("encoded_invoice"), false);
    assert.equal(JSON.stringify(payload).includes("macaroon"), false);
    assert.equal(payload.merchant.display_name, "Boutique Demo");
    assert.equal(payload.payments_summary.linked, 0);
    assert.match(merchantExportFilename(1, new Date("2026-10-30T12:00:00Z")), /smartpay-w06-merchant-1-regtest-2026-10-30\.json/);
  });
});
