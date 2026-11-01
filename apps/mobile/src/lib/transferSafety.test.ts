import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ConfirmLock } from "./confirmLock";
import {
  TRANSFER_CONFIRM_ENABLED,
  assertTransferConfirmAllowed,
} from "./transferSafety";

describe("B3 ne déclenche pas confirm", () => {
  it("laisse le drapeau de paiement à false", () => {
    assert.equal(TRANSFER_CONFIRM_ENABLED, false);
  });

  it("bloque confirm avant tout appel réseau", () => {
    assert.throws(() => assertTransferConfirmAllowed(), /Aucun paiement Lightning/);
  });

  it("protège le bouton final contre un double appui", () => {
    const lock = new ConfirmLock();
    assert.equal(lock.tryAcquire(), true);
    assert.equal(lock.tryAcquire(), false);
    lock.release();
    assert.equal(lock.tryAcquire(), true);
  });
});
