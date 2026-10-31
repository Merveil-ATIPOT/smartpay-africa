import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Payment } from "@smartpay/contracts";

import {
  ACTIVITY_ADMIN_NOTE,
  ACTIVITY_EXPLAIN_HINT,
  ACTIVITY_EXPLAIN_ROUTE,
  ActivityExplainLock,
  activityExplainParams,
  activityExplainParamsAreSafe,
  canOpenActivityExplanation,
} from "./activityExplain";
import { formatSats } from "./format";
import { statusLabel, uiPaymentState } from "./paymentStatus";

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
    invoice: {
      encoded_invoice: "lnbcrt2500n1secretinvoice",
      payment_hash: `${"c4500794"}${"ab".repeat(24)}${"12345678"}`,
      memo: "lab",
      expires_at: "2026-10-31T12:00:00Z",
      is_mock: false,
    },
    warnings: [],
    ...partial,
  };
}

describe("ouverture M35 depuis Activité", () => {
  it("transmet uniquement le paymentId réel vers AssistantExplain", () => {
    const item = payment();
    const params = activityExplainParams(item);
    assert.deepEqual(params, { paymentId: item.id });
    assert.equal(ACTIVITY_EXPLAIN_ROUTE, "AssistantExplain");
    assert.equal(activityExplainParamsAreSafe(params), true);
    assert.equal(activityExplainParams(payment({ id: "  " })), null);
    assert.equal(activityExplainParams({ id: `${"c4500794"}${"ab".repeat(24)}${"12345678"}` }), null);
  });

  it("ne met aucun secret dans les paramètres de navigation", () => {
    const params = activityExplainParams(payment());
    const blob = JSON.stringify(params);
    assert.equal(blob.includes("lnbcrt"), false);
    assert.equal(blob.includes("c4500794"), false);
    assert.equal(blob.includes("eyJ"), false);
    assert.deepEqual(Object.keys(params ?? {}), ["paymentId"]);
  });

  it("conserve les montants et statuts déjà affichés", () => {
    const item = payment();
    const incoming = payment({ direction: "incoming", amount_sats: 900 });
    assert.match(`${"-"}${formatSats(item.amount_sats)}`.replace(/\s/g, " "), /-2 500/);
    assert.match(`${"+"}${formatSats(incoming.amount_sats)}`.replace(/\s/g, " "), /\+900/);
    assert.equal(statusLabel(uiPaymentState(item)), "Règlement Lightning Regtest confirmé");
    assert.equal(activityExplainParams(item)?.paymentId, item.id);
  });

  it("bloque un second appui tant que la navigation n'est pas relâchée", () => {
    const lock = new ActivityExplainLock();
    assert.equal(lock.tryAcquire(), true);
    assert.equal(lock.tryAcquire(), false);
    lock.release();
    assert.equal(lock.tryAcquire(), true);
  });

  it("n'ouvre pas l'analyse depuis un compte administrateur", () => {
    assert.equal(canOpenActivityExplanation("individual"), true);
    assert.equal(canOpenActivityExplanation("merchant"), true);
    assert.equal(canOpenActivityExplanation("admin"), false);
    assert.match(ACTIVITY_ADMIN_NOTE, /administrateur/);
    assert.equal(ACTIVITY_EXPLAIN_HINT, "Comprendre");
  });

  it("garde la liste, le vide, l'erreur et les autres routes", () => {
    const screen = readFileSync("src/screens/ActivityScreen.tsx", "utf8");
    assert.match(screen, /listPayments/);
    assert.match(screen, /Aucune activité/);
    assert.match(screen, /ErrorBanner/);
    assert.match(screen, /AssistantExplain/);
    assert.match(screen, /goBack|skipNextFocusLoad|paymentId/);
    assert.equal(/confirmPayment|createInvoice|previewPayment/.test(screen), false);
    assert.equal(screen.includes("SN-8924"), false);
    const tabs = readFileSync("src/navigation/TabNavigator.tsx", "utf8");
    assert.match(tabs, /name="Home"/);
    assert.match(tabs, /name="Activity"/);
    assert.match(tabs, /name="Scanner"/);
    assert.match(tabs, /name="Services"/);
    assert.match(tabs, /name="Profile"/);
  });
});
