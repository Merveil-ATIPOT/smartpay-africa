import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Payment } from "@smartpay/contracts";

import { formatOperationDate } from "./assistantHome";
import { settlementCaption, statusLabel, uiPaymentState } from "./paymentStatus";
import {
  EXPLAIN_FEE_UNAVAILABLE,
  EXPLAIN_GENERIC_INCOMING,
  EXPLAIN_GENERIC_OUTGOING,
  EXPLAIN_NETWORK_BADGE,
  EXPLAIN_SECTION_IDS,
  explainPayment,
  explanationAmountLabel,
  explanationTitle,
  shortenTechnicalReference,
  technicalReferenceOf,
} from "./transactionExplain";

const SETTLED_HASH = `${"c4500794"}${"ab".repeat(24)}${"12345678"}`;
const FULL_INVOICE =
  "lnbcrt2500n1pj6fixtureinvoicevaluewhichmustneverappearinexplanationoutputxxxxxxxxxxxxxxxx";

function payment(partial: Partial<Payment> = {}): Payment {
  return {
    id: "1a6bf944-e26c-4692-bcfd-4a3e440892f8",
    amount_sats: 2500,
    description: "Facture SmartPay Africa",
    status: "confirmed",
    settlement_mode: "lightning_regtest",
    is_lightning_settled: true,
    lightning_status: "settled",
    network: "regtest",
    direction: "outgoing",
    idempotency_key: "k",
    provider_reference: SETTLED_HASH,
    failure_reason: "",
    expires_at: null,
    created_at: "2026-10-31T10:39:19Z",
    updated_at: "2026-10-31T10:39:19Z",
    invoice: null,
    warnings: [],
    ...partial,
  };
}

function blobOf(item: Payment): string {
  return JSON.stringify(explainPayment(item));
}

function section(item: Payment, id: (typeof EXPLAIN_SECTION_IDS)[number]) {
  const found = explainPayment(item).sections.find((entry) => entry.id === id);
  assert.ok(found, id);
  return found;
}

const FORBIDDEN_FICTION = [
  "SN-8924",
  "25 000",
  "25000",
  "57 870",
  "57870",
  "99.8",
  "99,8",
  "99.9",
  "0.8",
  "Teranga",
  "Relais Dakar",
  "preimage",
  "macaroon",
  "FCFA",
];

describe("moteur d'explication M35", () => {
  it("explique un paiement sortant Lightning Regtest confirmé", () => {
    const item = payment();
    const explained = explainPayment(item);
    assert.equal(explained.payment_id, item.id);
    assert.equal(explained.title, "Facture SmartPay Africa");
    assert.match(explained.amount_label.replace(/\s/g, " "), /−2 500 sats/);
    assert.equal(explained.status_label, statusLabel(uiPaymentState(item)));
    assert.equal(explained.settlement_caption, settlementCaption(item));
    assert.equal(explained.settlement_mode_label, "Lightning Regtest");
    assert.equal(explained.network_badge, EXPLAIN_NETWORK_BADGE);
    assert.equal(explained.when, formatOperationDate(item.created_at));
    assert.equal(explained.reference_short, "c4500794…12345678");
    assert.equal(explained.can_ask_question, true);
    assert.equal(explained.pdf_available, false);
    assert.deepEqual(
      explained.sections.map((entry) => entry.id),
      [...EXPLAIN_SECTION_IDS],
    );
    assert.match(section(item, "lightning").body, /serveur a confirmé un règlement Lightning Regtest/);
    assert.match(section(item, "status").body, /pas d'un code HTTP/);
    assert.equal(explained.status_label.includes("Mock"), false);
  });

  it("explique un paiement entrant avec le signe plus", () => {
    const item = payment({
      direction: "incoming",
      description: "  ",
      status: "pending",
      is_lightning_settled: false,
      lightning_status: "pending",
    });
    const explained = explainPayment(item);
    assert.equal(explained.title, EXPLAIN_GENERIC_INCOMING);
    assert.equal(explanationTitle(item), EXPLAIN_GENERIC_INCOMING);
    assert.match(explained.amount_label.replace(/\s/g, " "), /\+2 500 sats/);
    assert.match(section(item, "summary").body, /entrant/);
    assert.match(section(item, "lightning").body, /aucun règlement Lightning n'est confirmé/);
  });

  it("conseille d'attendre pour un paiement en attente", () => {
    const item = payment({
      status: "pending",
      is_lightning_settled: false,
      lightning_status: "pending",
    });
    const explained = explainPayment(item);
    assert.equal(explained.status_label, "Traitement Lightning en cours");
    assert.match(explained.settlement_caption, /HTTP 200 n'est pas une preuve/);
    assert.match(section(item, "advice").body, /HTTP 200 n'est pas une preuve de règlement/);
    assert.match(section(item, "lightning").body, /aucun règlement Lightning n'est confirmé/);
  });

  it("reprend le motif serveur d'un paiement échoué", () => {
    const item = payment({
      status: "failed",
      is_lightning_settled: false,
      lightning_status: "failed",
      failure_reason: "no_route",
    });
    const explained = explainPayment(item);
    assert.equal(explained.status_label, "Échoué");
    assert.match(section(item, "status").body, /no_route/);
    assert.match(section(item, "advice").body, /no_route/);
    assert.match(section(item, "advice").body, /L'assistant ne peut pas payer/);
  });

  it("signale une expiration sans inventer de délai", () => {
    const item = payment({
      status: "expired",
      is_lightning_settled: false,
      lightning_status: "expired",
      failure_reason: "invoice_expired",
    });
    assert.match(section(item, "status").body, /expirée/);
    assert.match(section(item, "advice").body, /expiration/);
    assert.equal(section(item, "advice").body.includes("0.8"), false);
    assert.equal(section(item, "advice").body.includes("garanti"), false);
  });

  it("ne présente jamais un accusé Mock comme un règlement Lightning", () => {
    const item = payment({
      settlement_mode: "mock",
      is_lightning_settled: false,
      lightning_status: "not_applicable",
      provider_reference: "mock-ref-1",
    });
    const explained = explainPayment(item);
    assert.equal(explained.settlement_mode_label, "Mock");
    assert.equal(explained.status_label, "Accusé Mock — pas un règlement Lightning");
    assert.match(explained.settlement_caption, /PAS une transaction Lightning settled/i);
    assert.match(section(item, "lightning").body, /pas un règlement Lightning/);
    assert.match(section(item, "advice").body, /accusé Mock/);
    assert.equal(explained.status_label.includes("Règlement Lightning"), false);
    assert.equal(section(item, "lightning").body.includes("serveur a confirmé un règlement Lightning"), false);
  });

  it("retombe sur des libellés génériques si le mémo et la référence manquent", () => {
    const item = payment({
      description: "",
      provider_reference: "",
      invoice: null,
      failure_reason: "",
      created_at: "not-a-date",
    });
    const explained = explainPayment(item);
    assert.equal(explained.title, EXPLAIN_GENERIC_OUTGOING);
    assert.equal(explained.reference_short, null);
    assert.equal(explained.when, "—");
    assert.match(section(item, "summary").body, /Aucun mémo/);
    assert.equal(section(item, "status").body.includes("Motif serveur"), false);
  });

  it("tronque une référence technique et refuse facture ou jeton", () => {
    assert.equal(shortenTechnicalReference(SETTLED_HASH), "c4500794…12345678");
    assert.equal(shortenTechnicalReference("short-ref"), "short-ref");
    assert.equal(shortenTechnicalReference(""), null);
    assert.equal(shortenTechnicalReference(FULL_INVOICE), null);
    assert.equal(shortenTechnicalReference(`lightning:${FULL_INVOICE}`), null);
    assert.equal(shortenTechnicalReference("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb"), null);
    const fromInvoice = payment({
      provider_reference: "",
      invoice: {
        encoded_invoice: FULL_INVOICE,
        payment_hash: SETTLED_HASH,
        memo: "lab",
        expires_at: "2026-10-31T12:00:00Z",
        is_mock: false,
      },
    });
    assert.equal(technicalReferenceOf(fromInvoice), "c4500794…12345678");
    const explained = blobOf(fromInvoice);
    assert.equal(explained.includes(FULL_INVOICE), false);
    assert.equal(explained.includes(SETTLED_HASH), false);
    assert.equal(explained.includes("lnbcrt"), false);
    assert.equal(explained.includes("eyJ"), false);
  });

  it("affiche des frais indisponibles sans estimer ni convertir", () => {
    const explained = explainPayment(payment());
    assert.equal(section(payment(), "fees").body, EXPLAIN_FEE_UNAVAILABLE);
    assert.match(explained.amount_label, /sats/);
    assert.equal(blobOf(payment()).includes("FCFA"), false);
    assert.equal(section(payment(), "fees").body.includes("1 sat"), false);
    assert.equal(section(payment(), "fees").body.includes("preview"), false);
  });

  it("n'invente aucune donnée Stitch ni secret", () => {
    const outgoing = blobOf(payment());
    const incoming = blobOf(payment({ direction: "incoming", description: "" }));
    const mock = blobOf(payment({ settlement_mode: "mock", is_lightning_settled: false, lightning_status: "not_applicable" }));
    for (const blob of [outgoing, incoming, mock]) {
      for (const forbidden of FORBIDDEN_FICTION) {
        assert.equal(blob.includes(forbidden), false, forbidden);
      }
      assert.equal(blob.includes("preimage"), false);
      assert.equal(blob.includes("macaroon"), false);
      assert.equal(blob.includes("seed"), false);
    }
    assert.equal(explanationAmountLabel(payment()).includes("FCFA"), false);
  });

  it("reste local : aucun appel réseau dans le moteur", () => {
    const source = readFileSync("src/lib/transactionExplain.ts", "utf8");
    assert.equal(/\bfetch\b|XMLHttpRequest|WebSocket/.test(source), false);
    assert.equal(/payments\/preview|send_payment|lookup_payment/.test(source), false);
    assert.equal(/macaroon|preimage|lnd_/.test(source), false);
    const explained = explainPayment(payment());
    assert.equal(explained.sections.length, 7);
  });
});
