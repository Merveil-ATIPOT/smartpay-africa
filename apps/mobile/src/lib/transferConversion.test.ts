import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEMO_FEE_SATS,
  MIN_TRANSFER_FCFA,
  buildQuote,
  fcfaToSats,
  maxFcfaForBalance,
  quoteErrors,
  satsToFcfa,
} from "./transferConversion";

describe("conversion FCFA / sats", () => {
  it("convertit 50 000 FCFA avec arrondi half-up entier", () => {
    const sats = fcfaToSats(50_000);
    assert.equal(sats, 115473);
    assert.equal(buildQuote(50_000).totalSats, sats + DEMO_FEE_SATS);
    assert.equal(buildQuote(50_000).receivedFcfa, 50_000);
    assert.equal(buildQuote(50_000).demoRate, true);
  });

  it("refuse les montants invalides", () => {
    assert.ok(quoteErrors(0, 1_000_000).length > 0);
    assert.ok(quoteErrors(MIN_TRANSFER_FCFA - 1, 1_000_000).length > 0);
    assert.ok(quoteErrors(12.5, 1_000_000).length > 0);
  });

  it("bloque un montant supérieur au solde", () => {
    const errors = quoteErrors(50_000, 10);
    assert.match(errors.join(" "), /insuffisant/);
  });

  it("calcule un Max qui tient dans le solde", () => {
    const available = 148_500;
    const maxFcfa = maxFcfaForBalance(available);
    const quote = buildQuote(maxFcfa);
    assert.ok(quote.totalSats <= available);
    assert.ok(buildQuote(maxFcfa + 1).totalSats > available || maxFcfa === satsToFcfa(available));
  });
});
