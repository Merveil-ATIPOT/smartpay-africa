import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ConfirmLock } from "../lib/confirmLock";
import { ApiError, isTransportError, messageFromBody, userFacingRequestError } from "./errors";

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
    assert.equal(isTransportError(error), true);
    assert.match(userFacingRequestError(error, "x"), /pas un paiement refusé/);
  });

  it("un JWT expiré n'est pas un paiement refusé", () => {
    const error = new ApiError(401, "Identifiants invalides ou session expirée.");
    assert.equal(error.status, 401);
    assert.equal(isTransportError(error), false);
    assert.equal(userFacingRequestError(error, "x"), "Identifiants invalides ou session expirée.");
  });

  it("ne confond pas une validation 400 avec une coupure réseau", () => {
    const error = new ApiError(400, "Facture expirée.");
    assert.equal(isTransportError(error), false);
    assert.equal(userFacingRequestError(error, "x"), "Facture expirée.");
  });

  it("extrait le message métier de l'enveloppe SmartPay 400", () => {
    const body = {
      error: true,
      status_code: 400,
      detail: {
        encoded_invoice:
          "Cette facture a été émise par le nœud payeur (Alice). Un paiement Alice → Alice n'est pas un transfert Alice → Bob.",
      },
    };
    assert.match(messageFromBody(body, "Erreur API (400)."), /Alice → Alice/);
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
