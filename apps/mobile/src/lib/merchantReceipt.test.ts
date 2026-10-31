import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { DEMO_SALES, DEMO_SHOP, getSaleById } from "./merchantDemo";
import {
  MERCHANT_NO_PAYMENT_LINE,
  MERCHANT_SPECIMEN_BANNER,
  escapeMerchantHtml,
  merchantReceiptHtml,
  merchantReceiptShareMessage,
} from "./merchantReceipt";
import { TRANSFER_CONFIRM_ENABLED } from "./transferSafety";

describe("M32 spécimen", () => {
  const sale = getSaleById("SN-8924");
  assert.ok(sale);

  it("génère un message de partage sans téléphone ni secrets", () => {
    const share = merchantReceiptShareMessage(sale, DEMO_SHOP);
    assert.match(share, /SmartPay Africa/);
    assert.match(share, /Épicerie Moderne Teranga/);
    assert.match(share, /SP-DEMO-SN-8924/);
    assert.match(share, /25/);
    assert.match(share, /date fictive/i);
    assert.match(share, /Spécimen — aucun paiement confirmé/);
    assert.match(share, /Regtest/);
    assert.doesNotMatch(share, /771234567|\+221|preimage|macaroon|eyJ|payment_hash|lnbcrt|lnbc/);
    assert.doesNotMatch(share, /Paiement réussi|Fonds envoyés|Crédit effectué/);
  });

  it("génère un HTML de spécimen échappé et non payable", () => {
    const html = merchantReceiptHtml(
      { ...sale, label: '<img src=x onerror=alert(1)>', note: "<script>alert(1)</script>" },
      { ...DEMO_SHOP, name: "Teranga <script>" },
    );
    assert.match(html, new RegExp(MERCHANT_SPECIMEN_BANNER.replace(/[—]/g, "—")));
    assert.ok(html.includes(escapeMerchantHtml(MERCHANT_NO_PAYMENT_LINE)));
    assert.ok(html.includes(escapeMerchantHtml("Teranga <script>")));
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.doesNotMatch(html, /preimage|payment_hash|macaroon/);
    assert.doesNotMatch(html, /Paiement réussi|Fonds envoyés/);
    assert.match(html, /Caisse A/);
    assert.match(html, /Poste 01/);
  });

  it("n'invente pas de règlement à partir d'une opération existante", () => {
    for (const item of DEMO_SALES) {
      const html = merchantReceiptHtml(item);
      assert.match(html, /SPÉCIMEN/);
      assert.match(html, /Aucun paiement Lightning confirmé/);
    }
  });

  it("n'appelle pas confirmTransfer", () => {
    assert.equal(TRANSFER_CONFIRM_ENABLED, false);
    for (const file of ["src/lib/merchantReceipt.ts", "src/lib/merchantReceiptExport.ts", "src/screens/MerchantReceiptScreen.tsx"]) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(src, /confirmTransfer/);
      assert.doesNotMatch(src, /send_payment/);
      assert.doesNotMatch(src, /\/confirm\//);
    }
  });
});
