import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildQuote } from "./transferConversion";
import {
  DJANGO_QUOTE_BADGE,
  LOCAL_QUOTE_BADGE,
  resolveAmountQuoteDisplay,
} from "./transferAmountQuote";

describe("M24 provenance du devis", () => {
  it("affiche le badge Django lorsque la réponse serveur correspond au montant", () => {
    const local = buildQuote(10_000);
    const view = resolveAmountQuoteDisplay({
      mode: "backend",
      amountFcfa: 10_000,
      local,
      server: {
        amountFcfa: 10_000,
        amountSats: 23_095,
        feeSats: 1,
        totalSats: 23_096,
        expiresAt: "2026-10-29T22:07:25.887Z",
        rate: 43_300_000,
      },
    });
    assert.equal(view.source, "django");
    assert.equal(view.badge, DJANGO_QUOTE_BADGE);
    assert.equal(view.amountSats, 23_095);
    assert.equal(view.showExpiry, true);
    assert.equal(view.expiresAt, "2026-10-29T22:07:25.887Z");
  });

  it("affiche l'estimation locale sans expiration serveur si aucune réponse Django", () => {
    const local = buildQuote(10_000);
    const view = resolveAmountQuoteDisplay({
      mode: "backend",
      amountFcfa: 10_000,
      local,
      server: null,
    });
    assert.equal(view.source, "local");
    assert.equal(view.badge, LOCAL_QUOTE_BADGE);
    assert.equal(view.amountSats, local.amountSats);
    assert.equal(view.showExpiry, false);
    assert.equal(view.expiresAt, null);
  });

  it("repasse en local si le montant saisi ne correspond plus au snapshot serveur", () => {
    const local = buildQuote(25_000);
    const view = resolveAmountQuoteDisplay({
      mode: "backend",
      amountFcfa: 25_000,
      local,
      server: {
        amountFcfa: 10_000,
        amountSats: 23_095,
        feeSats: 1,
        totalSats: 23_096,
        expiresAt: "2026-10-29T22:07:25.887Z",
        rate: 43_300_000,
      },
    });
    assert.equal(view.source, "local");
    assert.equal(view.badge, LOCAL_QUOTE_BADGE);
    assert.equal(view.amountSats, local.amountSats);
    assert.equal(view.showExpiry, false);
  });
});
