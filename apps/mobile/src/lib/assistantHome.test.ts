import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Payment } from "@smartpay/contracts";

import {
  ASSISTANT_CONVERSATION_ENABLED,
  ASSISTANT_GENERIC_GREETING,
  ASSISTANT_GENIUS_STATUS,
  ASSISTANT_LAST_OP_ADMIN_SUBTITLE,
  ASSISTANT_PAYMENT_DETAIL_PATH,
  ASSISTANT_PAYMENTS_LIST_PATH,
  ASSISTANT_START_HINT,
  ASSISTANT_START_LABEL,
  ASSISTANT_SUGGESTIONS,
  ASSISTANT_TOPICS,
  assistantGreeting,
  assistantHomeCopyHasForbiddenClaim,
  assistantUsesPaymentsListOnly,
  canShowPersonalLastOperation,
  lastOperationTeaser,
  pickLatestPayment,
  visibleAssistantHomeCopy,
} from "./assistantHome";

function payment(partial: Partial<Payment>): Payment {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    amount_sats: 2500,
    description: "Paiement lab",
    status: "pending",
    settlement_mode: "lightning_regtest",
    is_lightning_settled: false,
    lightning_status: "pending",
    network: "regtest",
    direction: "outgoing",
    idempotency_key: "k",
    provider_reference: "ref",
    failure_reason: "",
    expires_at: null,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    invoice: null,
    warnings: [],
    ...partial,
  };
}

describe("accueil Assistant IA M33", () => {
  it("salue uniquement avec un prénom réel, sinon Bonjour !", () => {
    assert.equal(assistantGreeting("Awa"), "Bonjour Awa, comment puis-je vous éclairer aujourd'hui ?");
    assert.equal(assistantGreeting("  "), ASSISTANT_GENERIC_GREETING);
    assert.equal(assistantGreeting(""), ASSISTANT_GENERIC_GREETING);
    assert.equal(assistantGreeting(null), ASSISTANT_GENERIC_GREETING);
    assert.equal(assistantGreeting(undefined), ASSISTANT_GENERIC_GREETING);
    assert.equal(assistantGreeting("user@smartpay.local").includes("Bonjour !"), false);
  });

  it("ne fabrique pas Amadou et n'annonce pas un nœud Lightning connecté", () => {
    const copy = visibleAssistantHomeCopy({ firstName: "" });
    assert.equal(copy.includes("Amadou"), false);
    assert.equal(copy.includes("Connecté au nœud Lightning"), false);
    assert.equal(ASSISTANT_GENIUS_STATUS, "Mode conseil · Regtest");
    assert.equal(assistantHomeCopyHasForbiddenClaim(copy), false);
  });

  it("prend la dernière opération de la liste par date, sans détail paiement", () => {
    const older = payment({ id: "old", created_at: "2026-01-01T00:00:00Z", amount_sats: 100 });
    const newer = payment({
      id: "new",
      created_at: "2026-10-20T12:00:00Z",
      amount_sats: 4_200,
      description: "Reçu lab",
      direction: "incoming",
      status: "confirmed",
      is_lightning_settled: true,
      lightning_status: "settled",
    });
    assert.equal(pickLatestPayment([]), null);
    assert.equal(pickLatestPayment([older, newer])?.id, "new");
    const teaser = lastOperationTeaser(newer);
    assert.equal(teaser.title, "Reçu lab");
    assert.match(teaser.amountLabel.replace(/\s/g, " "), /\+4 200 sats/);
    assert.match(teaser.statusLine, /REGTEST/);
    assert.equal(teaser.statusLine.includes("FCFA"), false);
    assert.equal(teaser.statusLine.includes("0.8"), false);
    assert.equal(assistantUsesPaymentsListOnly(ASSISTANT_PAYMENTS_LIST_PATH), true);
    assert.equal(assistantUsesPaymentsListOnly(ASSISTANT_PAYMENT_DETAIL_PATH), false);
  });

  it("n'affiche pas une opération globale pour un administrateur", () => {
    assert.equal(canShowPersonalLastOperation("individual"), true);
    assert.equal(canShowPersonalLastOperation("merchant"), true);
    assert.equal(canShowPersonalLastOperation("admin"), false);
    assert.match(ASSISTANT_LAST_OP_ADMIN_SUBTITLE, /autre utilisateur/);
  });

  it("prépare les thématiques et suggestions sans opérateurs connectés ni conversation", () => {
    assert.equal(ASSISTANT_TOPICS.length, 4);
    assert.equal(ASSISTANT_TOPICS[0].id, "bitcoin");
    assert.equal(ASSISTANT_TOPICS[3].title, "Transferts en Afrique");
    const topicCopy = ASSISTANT_TOPICS.map((topic) => `${topic.title} ${topic.subtitle} ${topic.question}`).join(" ");
    assert.equal(/wave|orange money|\bmtn\b/i.test(topicCopy), false);
    assert.equal(ASSISTANT_SUGGESTIONS.length, 4);
    assert.equal(ASSISTANT_CONVERSATION_ENABLED, true);
    assert.equal(ASSISTANT_START_LABEL, "Nouvelle conversation");
    assert.match(visibleAssistantHomeCopy({ firstName: "" }), /Mes conversations/);
    assert.equal(ASSISTANT_START_HINT.includes("Disponible prochainement"), false);
    const copy = visibleAssistantHomeCopy({
      firstName: "Awa",
      lastOperation: lastOperationTeaser(payment({ description: "Lab Bob" })),
    });
    assert.equal(assistantHomeCopyHasForbiddenClaim(copy), false);
    assert.equal(copy.includes("#SN-8924"), false);
    assert.equal(copy.includes("25 000 FCFA"), false);
  });

  it("retombe sur le sens du paiement si la description est vide", () => {
    const incoming = lastOperationTeaser(payment({ description: "  ", direction: "incoming" }));
    const outgoing = lastOperationTeaser(payment({ description: "", direction: "outgoing" }));
    assert.equal(incoming.title, "Paiement reçu");
    assert.equal(outgoing.title, "Paiement envoyé");
  });
});
