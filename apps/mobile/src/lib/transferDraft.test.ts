import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEMO_PROOF_STAMP,
  DEMO_RESULT_DISCLAIMER,
  EMPTY_DRAFT,
  PDF_UNAVAILABLE_MESSAGE,
  applyAmount,
  applyBeneficiary,
  beneficiaryErrors,
  createLocalPreview,
  quoteFromDraft,
  selectCountry,
} from "./transferDraft";
import { demoShareMessage } from "./transferReceipt";
import { phoneErrors } from "./transferPhone";

describe("M23 bénéficiaire", () => {
  it("n'accepte qu'un opérateur du pays choisi", () => {
    const sn = selectCountry(EMPTY_DRAFT, "SN");
    const invalid = applyBeneficiary(sn, {
      operator: "airtel",
      beneficiaryName: "Test",
      phone: "771234567",
      reason: "x",
    });
    assert.equal(invalid.operator, null);
    const valid = applyBeneficiary(sn, {
      operator: "wave",
      beneficiaryName: "Fatou Diallo",
      phone: "771234567",
      reason: "Soutien",
    });
    assert.equal(valid.operator, "wave");
    assert.equal(beneficiaryErrors(valid).length, 0);
  });

  it("valide le format national sans interroger un compte", () => {
    assert.ok(phoneErrors("SN", "12").length > 0);
    assert.equal(phoneErrors("SN", "771234567").length, 0);
    assert.equal(phoneErrors("CI", "07458912").length, 0);
  });

  it("ignore une destination indisponible", () => {
    const next = selectCountry(EMPTY_DRAFT, "FR");
    assert.equal(next.destinationCode, null);
  });

  it("réinitialise le bénéficiaire si le pays change", () => {
    const filled = applyBeneficiary(selectCountry(EMPTY_DRAFT, "CI"), {
      operator: "wave",
      beneficiaryName: "Awa Koné",
      phone: "07458912",
      reason: "Soutien",
    });
    const changed = selectCountry(filled, "CG");
    assert.equal(changed.beneficiaryName, "");
    assert.equal(changed.operator, null);
    assert.equal(changed.amountFcfa, filled.amountFcfa);
  });

  it("ne réutilise pas un transfert serveur quand le pays change", () => {
    const started = {
      ...selectCountry(EMPTY_DRAFT, "CI"),
      transferId: "f30fcc64-3a6b-41f4-9621-0d05daa0b1e5",
      publicReference: "SPA-E25DDAA9E228",
      serverStatus: "simulated_credited" as const,
    };
    const changed = selectCountry(started, "SN");
    assert.equal(changed.transferId, null);
    assert.equal(changed.publicReference, null);
    assert.equal(changed.serverStatus, "");
  });
});

describe("M25 M26 cohérence démo", () => {
  it("conserve le même quote du montant au résultat", () => {
    let draft = selectCountry(EMPTY_DRAFT, "CI");
    draft = applyBeneficiary(draft, {
      operator: "wave",
      beneficiaryName: "Awa Koné",
      phone: "07458912",
      reason: "Soutien familial",
    });
    draft = applyAmount(draft, 50_000, 148_500);
    const quote = quoteFromDraft(draft);
    const preview = createLocalPreview(draft, new Date("2026-10-29T17:00:00.000Z"));
    assert.ok(preview);
    assert.equal(preview.quote.totalSats, quote.totalSats);
    assert.equal(preview.quote.amountFcfa, 50_000);
    assert.equal(preview.lightningExecuted, false);
    assert.equal(preview.mobileMoneyCredited, false);
    assert.equal(preview.disclaimer, DEMO_RESULT_DISCLAIMER);
    assert.match(preview.localReference, /^DEMO-/);
    assert.equal(preview.localReference.includes("ln"), false);
    assert.equal("paymentHash" in preview, false);
    assert.equal("payment_hash" in preview, false);
    const share = demoShareMessage(preview);
    assert.match(share, new RegExp(DEMO_PROOF_STAMP));
    assert.doesNotMatch(share, /07458912|\+225/);
    assert.match(share, /50/);
    assert.match(PDF_UNAVAILABLE_MESSAGE, /PDF/);
    assert.match(DEMO_RESULT_DISCLAIMER, /Aucun paiement Lightning/);
  });

  it("ne fabrique pas de preview sans bénéficiaire", () => {
    assert.equal(createLocalPreview(selectCountry(EMPTY_DRAFT, "SN")), null);
  });

  it("préfère le devis serveur lorsqu'il est courant", () => {
    const draft = {
      ...EMPTY_DRAFT,
      destinationCode: "CI" as const,
      amountFcfa: 50_000,
      mode: "backend" as const,
      quoteCurrent: true,
      serverAmountSats: 115_473,
      serverFeeSats: 1,
      serverTotalSats: 115_474,
    };
    const quote = quoteFromDraft(draft);
    assert.equal(quote.amountSats, 115_473);
    assert.equal(quote.feeSats, 1);
    assert.equal(quote.totalSats, 115_474);
  });

  it("ne fabrique pas de preview si le montant est invalide", () => {
    let draft = selectCountry(EMPTY_DRAFT, "SN");
    draft = applyBeneficiary(draft, {
      operator: "wave",
      beneficiaryName: "Fatou Diallo",
      phone: "771234567",
      reason: "Soutien",
    });
    draft = applyAmount(draft, 0, 148_500);
    assert.equal(createLocalPreview(draft), null);
  });
});
