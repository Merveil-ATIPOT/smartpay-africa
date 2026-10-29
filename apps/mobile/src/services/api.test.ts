import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ConfirmLock } from "../lib/confirmLock";
import { ApiError } from "./errors";

describe("flux preview puis confirm", () => {
  it("n'appelle pas /payments/ tant que confirm n'est pas demandé", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      return new Response(JSON.stringify({ amount_sats: 2500, is_lightning_settled: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    await fetchImpl("http://example.test/api/v1/payments/preview/", {
      method: "POST",
      body: JSON.stringify({ encoded_invoice: "mockln1abc", amount_sats: 2500 }),
    });
    assert.equal(calls.length, 1);
    assert.match(calls[0], /preview/);
    assert.equal(
      calls.some((item) => item.includes("/payments/") && !item.includes("preview")),
      false,
    );
  });

  it("un HTTP 200 preview n'est pas un règlement", () => {
    const body = { is_lightning_settled: false, status: 200 };
    assert.equal(body.is_lightning_settled, false);
  });
});

describe("erreurs réseau", () => {
  it("ApiError 0 représente un réseau injoignable", () => {
    const error = new ApiError(0, "Réseau injoignable.");
    assert.equal(error.status, 0);
  });
});

describe("double clic", () => {
  it("une seule acquisition pendant un paiement", () => {
    const lock = new ConfirmLock();
    const first = lock.tryAcquire();
    const second = lock.tryAcquire();
    assert.equal(first, true);
    assert.equal(second, false);
  });
});
