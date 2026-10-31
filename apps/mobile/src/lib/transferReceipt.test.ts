import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import type { TransferExecutionResult } from "@smartpay/contracts";

import { formatSats } from "./format";
import { TRANSFER_CONFIRM_ENABLED } from "./transferSafety";
import {
  DATE_UNAVAILABLE,
  DEMO_NOT_SERVER_RECEIPT,
  NO_PAYMENT_BANNER,
  PDF_CONFIRMED_TITLE,
  PDF_DEMO_TITLE,
  PDF_UNCONFIRMED_TITLE,
  REGTEST_NOT_PROOF,
  UNCONFIRMED_PAYMENT_LINE,
  containsForbiddenSuccess,
  demoReceiptHtml,
  demoShareMessage,
  escapeHtml,
  formatServerDate,
  isUserShareCancel,
  receiptHtml,
  serverShareMessage,
} from "./transferReceipt";
import { EMPTY_DRAFT, applyAmount, applyBeneficiary, createLocalPreview, selectCountry } from "./transferDraft";

function result(overrides: Partial<TransferExecutionResult> = {}): TransferExecutionResult {
  return {
    id: "f30fcc64-3a6b-41f4-9621-0d05daa0b1e5",
    public_reference: "SPA-E25DDAA9E228",
    status: "ready",
    amount_local: 50_000,
    currency: "XOF",
    operator: "wave",
    destination_country: "CI",
    beneficiary_name: "Awa Koné",
    invoice_amount_sats: 115_473,
    demo_fee_sats: 1,
    lnd_fee_sats_estimated: 0,
    lnd_fee_sats_paid: null,
    total_debited_sats: 0,
    lightning_payment_hash: "abc123secretpaymenthash",
    lightning_settled_at: null,
    lightning_confirmed: false,
    alice_status: "",
    bob_status: "",
    mobile_money_credit_status: "none",
    simulated_credit_reference: "MM-SIM-SHOULD-STAY-INTERNAL",
    credited_amount_local: 0,
    credit_disclaimer: "",
    warnings: [],
    ...overrides,
  };
}

function localPreview() {
  let draft = selectCountry(EMPTY_DRAFT, "CI");
  draft = applyBeneficiary(draft, {
    operator: "wave",
    beneficiaryName: "Awa Koné",
    phone: "07458912",
    reason: "Soutien familial",
  });
  draft = applyAmount(draft, 50_000, 148_500);
  const preview = createLocalPreview(draft, new Date("2026-10-29T17:00:00.000Z"));
  assert.ok(preview);
  return preview;
}

function assertNoSecrets(text: string) {
  assert.doesNotMatch(text, /07458912|\+225|771234567|\+221/);
  assert.doesNotMatch(text, /abc123secretpaymenthash/);
  assert.doesNotMatch(text, /MM-SIM-SHOULD-STAY-INTERNAL/);
  assert.doesNotMatch(text, /preimage|macaroon|eyJ[A-Za-z0-9_-]+\./i);
  assert.doesNotMatch(text, /lightning_payment_hash/);
}

describe("M26.2 justificatif", () => {
  it("partage un transfert serveur non réglé", () => {
    const share = serverShareMessage(result());
    assert.match(share, /SmartPay Africa/);
    assert.match(share, /SPA-E25DDAA9E228/);
    assert.match(share, /Côte d'Ivoire/);
    assert.match(share, /Wave/);
    assert.match(share, new RegExp(`${formatSats(50_000)} FCFA`));
    assert.match(share, new RegExp(`${formatSats(115_473)} sats`));
    assert.match(share, /Regtest/);
    assert.match(share, new RegExp(UNCONFIRMED_PAYMENT_LINE));
    assert.equal(containsForbiddenSuccess(share), false);
    assertNoSecrets(share);
  });

  it("partage un transfert serveur réglé selon le serveur", () => {
    const share = serverShareMessage(
      result({
        status: "simulated_credited",
        lightning_confirmed: true,
        alice_status: "SUCCEEDED",
        bob_status: "SETTLED",
        lightning_settled_at: "2026-10-29T14:32:00.000Z",
        lnd_fee_sats_paid: 2,
        mobile_money_credit_status: "simulated",
      }),
    );
    assert.match(share, /Lightning confirmé selon le serveur/);
    assert.match(share, /Alice SUCCEEDED/);
    assert.match(share, /Bob SETTLED/);
    assert.match(share, /simulé/i);
    assert.doesNotMatch(share, /Crédit effectué/);
    assert.equal(containsForbiddenSuccess(share), false);
    assertNoSecrets(share);
  });

  it("identifie une démo locale sans numéro ni référence Django", () => {
    const preview = localPreview();
    const share = demoShareMessage(preview);
    assert.match(share, /SmartPay Africa/);
    assert.match(share, new RegExp(DEMO_NOT_SERVER_RECEIPT));
    assert.match(share, /DEMO-/);
    assert.doesNotMatch(share, /SPA-/);
    assert.doesNotMatch(share, /07458912|\+225/);
    assert.match(share, new RegExp(UNCONFIRMED_PAYMENT_LINE));
    assert.equal(containsForbiddenSuccess(share), false);
  });

  it("n'inclut ni téléphone ni secrets dans le PDF non réglé", () => {
    const html = receiptHtml(result());
    assert.match(html, new RegExp(PDF_UNCONFIRMED_TITLE));
    assert.match(html, new RegExp(NO_PAYMENT_BANNER));
    assert.match(html, new RegExp(REGTEST_NOT_PROOF));
    assert.match(html, /Justificatif de préparation/);
    assert.doesNotMatch(html, /Paiement réussi|Fonds envoyés|Crédit effectué/);
    assert.equal(containsForbiddenSuccess(html), false);
    assertNoSecrets(html);
    assert.doesNotMatch(html, /Awa Koné/);
  });

  it("présente un PDF réglé sans preuve cryptographique ni crédit réel", () => {
    const html = receiptHtml(
      result({
        status: "simulated_credited",
        lightning_confirmed: true,
        alice_status: "SUCCEEDED",
        bob_status: "SETTLED",
        lightning_settled_at: "2026-10-29T14:32:00.000Z",
        lnd_fee_sats_paid: 2,
        mobile_money_credit_status: "simulated",
      }),
      "2026-10-29T10:00:00.000Z",
    );
    assert.match(html, new RegExp(PDF_CONFIRMED_TITLE));
    assert.match(html, /29\/10\/2026 14:32 UTC/);
    assert.match(html, /29\/10\/2026 10:00 UTC/);
    assert.match(html, /2 sat/);
    assert.match(html, /simulé/i);
    assert.doesNotMatch(html, /AUCUN PAIEMENT CONFIRMÉ/);
    assert.doesNotMatch(html, /Paiement réussi|Fonds envoyés|Crédit effectué/);
    assertNoSecrets(html);
  });

  it("échappe les valeurs dynamiques avant insertion HTML", () => {
    const html = receiptHtml(
      result({
        public_reference: '<img src=x onerror=alert(1)>',
        operator: "wave<script>alert(1)</script>",
        destination_country: "CI",
      }),
    );
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.doesNotMatch(html, /<script>/);
    assert.equal(escapeHtml(`<a href="javascript:alert(1)">x</a>`), "&lt;a href=&quot;javascript:alert(1)&quot;&gt;x&lt;/a&gt;");
  });

  it("n'invente pas de date de règlement et signale une date serveur manquante", () => {
    assert.equal(formatServerDate(null), null);
    assert.equal(formatServerDate("pas-une-date"), null);
    const html = receiptHtml(result({ lightning_settled_at: null }));
    assert.match(html, new RegExp(DATE_UNAVAILABLE));
    assert.doesNotMatch(html, /Date de règlement/);
    const confirmedWithoutSettle = receiptHtml(
      result({
        lightning_confirmed: true,
        alice_status: "SUCCEEDED",
        bob_status: "SETTLED",
        lightning_settled_at: null,
      }),
      "2026-10-29T10:00:00.000Z",
    );
    assert.match(confirmedWithoutSettle, /Date de création/);
    assert.doesNotMatch(confirmedWithoutSettle, /Date de règlement/);
  });

  it("identifie le PDF de démo locale comme non serveur", () => {
    const html = demoReceiptHtml(localPreview());
    assert.match(html, new RegExp(PDF_DEMO_TITLE));
    assert.ok(html.includes(escapeHtml(DEMO_NOT_SERVER_RECEIPT)));
    assert.match(html, /DEMO-/);
    assert.doesNotMatch(html, /SPA-/);
    assert.doesNotMatch(html, /07458912|\+225/);
    assert.equal(containsForbiddenSuccess(html), false);
  });

  it("ne présente pas une annulation de partage comme une erreur", () => {
    assert.equal(isUserShareCancel(new Error("User did not share")), true);
    assert.equal(isUserShareCancel(new Error("Sharing canceled")), true);
    assert.equal(isUserShareCancel(new Error("La génération du justificatif PDF a échoué.")), false);
  });

  it("n'appelle pas confirmTransfer et laisse le paiement bloqué", () => {
    assert.equal(TRANSFER_CONFIRM_ENABLED, false);
    const files = [
      "src/lib/transferReceipt.ts",
      "src/lib/transferReceiptShare.ts",
      "src/screens/TransferResultScreen.tsx",
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(src, /confirmTransfer/);
      assert.doesNotMatch(src, /send_payment/);
      assert.doesNotMatch(src, /\/confirm\//);
    }
  });
});
