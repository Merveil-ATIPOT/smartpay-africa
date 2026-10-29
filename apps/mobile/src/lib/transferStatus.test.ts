import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canEditTransfer,
  isSettledOrBusy,
  lightningHeadline,
  quoteIsCurrent,
  transferStatusLabel,
} from "./transferStatus";

describe("statuts de transfert B3", () => {
  it("interdit de réutiliser un transfert déjà exécuté", () => {
    assert.equal(canEditTransfer("simulated_credited"), false);
    assert.equal(canEditTransfer("payment_pending"), false);
    assert.equal(isSettledOrBusy("simulated_credited"), true);
    assert.equal(canEditTransfer("ready"), true);
  });

  it("détecte un devis expiré", () => {
    assert.equal(quoteIsCurrent("2020-01-01T00:00:00.000Z", new Date("2026-10-29T21:00:00.000Z")), false);
    assert.equal(quoteIsCurrent("2026-10-29T21:10:00.000Z", new Date("2026-10-29T21:00:00.000Z")), true);
    assert.equal(quoteIsCurrent(null), false);
  });

  it("n'affiche pas un succès Lightning sur un HTTP 200 seul", () => {
    const text = lightningHeadline({
      lightningConfirmed: false,
      status: "ready",
    });
    assert.match(text, /Aucun paiement Lightning/);
    assert.equal(transferStatusLabel("ready").includes("aucun paiement Lightning"), true);
    const confirmed = lightningHeadline({
      lightningConfirmed: true,
      status: "simulated_credited",
      aliceStatus: "SUCCEEDED",
      bobStatus: "SETTLED",
    });
    assert.match(confirmed, /confirmé/i);
  });
});
