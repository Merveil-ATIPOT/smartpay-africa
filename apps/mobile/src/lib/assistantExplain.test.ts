import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Payment } from "@smartpay/contracts";

import { ApiError } from "../services/errors";
import {
  EXPLAIN_FORBIDDEN_SUBTITLE,
  EXPLAIN_GENERIC_QUESTION,
  EXPLAIN_PAYMENT_DETAIL_PATH,
  EXPLAIN_READONLY_PILL,
  EXPLAIN_SCREEN_TITLE,
  buildExplainView,
  classifyExplainError,
  explainChatDraftIsSafe,
  explainErrorMessage,
  explainUsesPaymentDetailOnly,
} from "./assistantExplain";
import { EXPLAIN_SECTION_IDS, explainPayment } from "./transactionExplain";

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
    provider_reference: `${"c4500794"}${"ab".repeat(24)}${"12345678"}`,
    failure_reason: "",
    expires_at: null,
    created_at: "2026-10-31T10:39:19Z",
    updated_at: "2026-10-31T10:39:19Z",
    invoice: null,
    warnings: [],
    ...partial,
  };
}

describe("écran explication M35", () => {
  it("présente le résultat de explainPayment avec les sept sections", () => {
    const item = payment();
    const view = buildExplainView(item);
    assert.equal(view.kind, "ready");
    if (view.kind !== "ready") {
      return;
    }
    assert.deepEqual(view.explanation, explainPayment(item));
    assert.deepEqual(
      view.explanation.sections.map((section) => section.id),
      [...EXPLAIN_SECTION_IDS],
    );
    assert.equal(view.explanation.payment_id, item.id);
    assert.equal(view.incomplete, false);
    assert.match(EXPLAIN_SCREEN_TITLE, /Comprendre ma transaction/);
    assert.match(EXPLAIN_READONLY_PILL, /Lecture seule/);
  });

  it("signale des données incomplètes sans inventer de montant", () => {
    assert.equal(buildExplainView(payment({ id: "", amount_sats: 2500 })).kind, "incomplete");
    assert.equal(buildExplainView(payment({ amount_sats: 0 })).kind, "incomplete");
    const gappy = buildExplainView(payment({ description: "", provider_reference: "" }));
    assert.equal(gappy.kind, "ready");
    if (gappy.kind === "ready") {
      assert.equal(gappy.incomplete, true);
    }
  });

  it("masque de la même façon un 403 et un 404", () => {
    assert.equal(classifyExplainError(new ApiError(403, "interdit")), "forbidden");
    assert.equal(classifyExplainError(new ApiError(404, "absent")), "forbidden");
    assert.equal(explainErrorMessage(new ApiError(404, "absent")), EXPLAIN_FORBIDDEN_SUBTITLE);
    assert.equal(explainErrorMessage(new ApiError(403, "interdit")), EXPLAIN_FORBIDDEN_SUBTITLE);
    assert.equal(explainErrorMessage(new ApiError(404, "absent")).includes("1a6bf944"), false);
  });

  it("distingue une erreur réseau d'un refus", () => {
    assert.equal(classifyExplainError(new ApiError(0, "Réseau injoignable.")), "network");
    assert.equal(classifyExplainError(new ApiError(503, "down")), "network");
    assert.match(explainErrorMessage(new ApiError(0, "Réseau injoignable.")), /pas un paiement refusé/);
  });

  it("n'envoie à M34 qu'une question pédagogique générique", () => {
    assert.equal(explainChatDraftIsSafe(EXPLAIN_GENERIC_QUESTION), true);
    assert.equal(explainChatDraftIsSafe("lnbcrt2500n1secret"), false);
    assert.equal(explainChatDraftIsSafe("c4500794abababababababababababababababababababab12345678"), false);
    assert.equal(EXPLAIN_GENERIC_QUESTION.includes("1a6bf944"), false);
    assert.equal(EXPLAIN_GENERIC_QUESTION.toLowerCase().includes("facture"), false);
  });

  it("ne s'appuie que sur le détail paiement en lecture", () => {
    assert.equal(explainUsesPaymentDetailOnly(EXPLAIN_PAYMENT_DETAIL_PATH), true);
    assert.equal(explainUsesPaymentDetailOnly("/api/v1/payments/"), false);
    assert.equal(explainUsesPaymentDetailOnly("/api/v1/payments/preview/"), false);
    const screen = readFileSync("src/screens/AssistantExplainScreen.tsx", "utf8");
    assert.match(screen, /fetchPayment/);
    assert.match(screen, /explainPayment|buildExplainView/);
    assert.match(screen, /goBack/);
    assert.equal(/confirmPayment|createInvoice|previewPayment|createLabCounterpartyInvoice/.test(screen), false);
    assert.equal(/send_payment|macaroon|preimage/.test(screen), false);
    assert.equal(screen.includes("SN-8924"), false);
    assert.equal(screen.includes("FCFA"), false);
    assert.equal(screen.includes("99.8"), false);
  });

  it("enregistre AssistantExplain sans déplacer les routes existantes", () => {
    const root = readFileSync("src/navigation/RootNavigator.tsx", "utf8");
    const types = readFileSync("src/navigation/types.ts", "utf8");
    assert.match(types, /AssistantExplain:\s*\{\s*paymentId:\s*string/);
    assert.match(root, /AssistantExplain/);
    assert.match(root, /AssistantHome/);
    assert.match(root, /AssistantChat/);
    assert.match(root, /name="Confirm"/);
    assert.match(root, /name="Receive"/);
    assert.match(root, /name="Tabs"/);
    assert.equal(root.includes("Activity"), false);
  });
});
