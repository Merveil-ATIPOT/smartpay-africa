import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ConfirmLock, newIdempotencyKey } from "./confirmLock";

describe("ConfirmLock", () => {
  it("bloque un second clic tant que le premier n'est pas relâché", () => {
    const lock = new ConfirmLock();
    assert.equal(lock.tryAcquire(), true);
    assert.equal(lock.tryAcquire(), false);
    assert.equal(lock.locked, true);
    lock.release();
    assert.equal(lock.tryAcquire(), true);
  });
});

describe("newIdempotencyKey", () => {
  it("produit des clés distinctes", () => {
    const a = newIdempotencyKey(1);
    const b = newIdempotencyKey(1);
    assert.notEqual(a, b);
    assert.match(a, /^p03-/);
  });
});
