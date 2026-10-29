import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvoiceError,
  assertCompatibleInvoice,
  assertNotExpired,
  classifyInvoice,
  normalizeInvoice,
  parseBolt11AmountSats,
} from "./invoice";

describe("normalizeInvoice", () => {
  it("retire le préfixe lightning: et les espaces", () => {
    assert.equal(normalizeInvoice(" lightning:lnbcrt1abc def "), "lnbcrt1abcdef");
  });
});

describe("classifyInvoice", () => {
  it("accepte une facture BOLT11 Regtest", () => {
    const result = classifyInvoice("lnbcrt2500n1pvalidregtest");
    assert.equal(result.kind, "regtest");
    assert.equal(result.error, undefined);
  });

  it("accepte une facture Mock", () => {
    const result = classifyInvoice("mockln1deadbeef");
    assert.equal(result.kind, "mock");
  });

  it("rejette une facture Mainnet lnbc", () => {
    const result = classifyInvoice("lnbc2500n1pmainnet");
    assert.equal(result.kind, "mainnet");
    assert.match(result.error ?? "", /Mainnet/);
  });

  it("rejette LNURL et adresse", () => {
    assert.equal(classifyInvoice("LNURL1ABC").kind, "lnurl");
    assert.equal(classifyInvoice("amadou@smartpay.africa").kind, "address");
  });

  it("signale une facture vide", () => {
    assert.equal(classifyInvoice("   ").kind, "unknown");
  });
});

describe("assertCompatibleInvoice", () => {
  it("refuse une BOLT11 Regtest contre un fournisseur Mock", () => {
    assert.throws(
      () => assertCompatibleInvoice("lnbcrt1abc", "mock"),
      (err: unknown) => err instanceof InvoiceError && err.code === "incompatible",
    );
  });

  it("refuse une facture Mock contre LND Regtest", () => {
    assert.throws(
      () => assertCompatibleInvoice("mockln1abc", "lnd_regtest"),
      (err: unknown) => err instanceof InvoiceError && err.code === "incompatible",
    );
  });

  it("accepte le couple cohérent", () => {
    assert.equal(assertCompatibleInvoice("mockln1abc", "mock"), "mockln1abc");
    assert.equal(assertCompatibleInvoice("lnbcrt1abc", "lnd_regtest"), "lnbcrt1abc");
  });
});

describe("parseBolt11AmountSats", () => {
  it("lit 2500 nano-BTC = 250 sats", () => {
    assert.equal(parseBolt11AmountSats("lnbcrt2500n1qqq"), 250);
  });

  it("retourne null sans montant", () => {
    assert.equal(parseBolt11AmountSats("lnbcrt1pnoamount"), null);
    assert.equal(parseBolt11AmountSats("mockln1abc"), null);
  });
});

describe("assertNotExpired", () => {
  it("lève expired si la date est passée", () => {
    assert.throws(
      () => assertNotExpired("2020-01-01T00:00:00.000Z", Date.parse("2024-01-01T00:00:00.000Z")),
      (err: unknown) => err instanceof InvoiceError && err.code === "expired",
    );
  });

  it("ne lève pas si la date est future ou absente", () => {
    assert.doesNotThrow(() =>
      assertNotExpired("2099-01-01T00:00:00.000Z", Date.parse("2024-01-01T00:00:00.000Z")),
    );
    assert.doesNotThrow(() => assertNotExpired(null));
  });
});
