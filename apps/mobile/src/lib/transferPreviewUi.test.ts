import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { TransferPaymentPreview } from "@smartpay/contracts";

import {
  ALICE_UNREACHABLE_MESSAGE,
  ALREADY_EXECUTED_MESSAGE,
  EXPIRED_QUOTE_MESSAGE,
  INSUFFICIENT_BALANCE_MESSAGE,
  PREVIEW_INFO_WARNINGS,
  QUOTED_PREPARATION_MESSAGE,
  classifyPreviewBanner,
} from "./transferPreviewUi";

const INFO_WARNINGS = [...PREVIEW_INFO_WARNINGS];

function preview(overrides: Partial<TransferPaymentPreview> = {}): TransferPaymentPreview {
  return {
    transfer_id: "3a1db9b2-c5f0-4398-b459-4fc90e2035c8",
    public_reference: "SPA-2BEF18B3E569",
    status: "quoted",
    amount_local: 10_000,
    currency: "XOF",
    invoice_amount_sats: 23_095,
    demo_fee_sats: 1,
    indicative_total_sats: 23_096,
    lnd_fee_sats_estimated: 0,
    lnd_fee_estimate_available: false,
    lnd_fee_sats_paid: null,
    channel_balance_sats: 463_557,
    lightning_connected: true,
    can_execute: false,
    execution_mode: "regtest_mobile_money_simulation",
    warnings: INFO_WARNINGS,
    ...overrides,
  };
}

describe("M25 bandeau preview", () => {
  it("affiche un message informatif si QUOTED, devis valide, Alice et solde OK", () => {
    const banner = classifyPreviewBanner(preview());
    assert.equal(banner?.tone, "info");
    assert.equal(banner?.message, QUOTED_PREPARATION_MESSAGE);
    assert.equal(preview().can_execute, false);
  });

  it("n'affiche pas de refus si READY et devis valide (can_execute true)", () => {
    const banner = classifyPreviewBanner(
      preview({
        status: "ready",
        can_execute: true,
      }),
    );
    assert.equal(banner, null);
  });

  it("conserve une alerte explicite si le devis est expiré", () => {
    const fromApi = classifyPreviewBanner(
      preview({
        status: "ready",
        can_execute: false,
        warnings: [
          ...INFO_WARNINGS,
          "Devis expiré ou incompatible. Recalculez le devis avant confirmation.",
        ],
      }),
    );
    assert.equal(fromApi?.tone, "error");
    assert.match(fromApi?.message ?? "", /expiré/i);

    const fromLocal = classifyPreviewBanner(preview(), { quoteExpiredLocal: true });
    assert.equal(fromLocal?.tone, "error");
    assert.equal(fromLocal?.message, EXPIRED_QUOTE_MESSAGE);
  });

  it("conserve une alerte explicite si le solde est insuffisant", () => {
    const banner = classifyPreviewBanner(
      preview({
        channel_balance_sats: 1_000,
        can_execute: false,
        warnings: [...INFO_WARNINGS, INSUFFICIENT_BALANCE_MESSAGE],
      }),
    );
    assert.equal(banner?.tone, "error");
    assert.equal(banner?.message, INSUFFICIENT_BALANCE_MESSAGE);
  });

  it("ne masque pas un warning serveur inconnu derrière le message de préparation", () => {
    const unknown = "Condition lab inattendue : canal en attente de politique.";
    const banner = classifyPreviewBanner(
      preview({
        warnings: [...INFO_WARNINGS, unknown],
      }),
    );
    assert.equal(banner?.tone, "error");
    assert.equal(banner?.message, unknown);
    assert.notEqual(banner?.message, QUOTED_PREPARATION_MESSAGE);
  });

  it("signale un transfert déjà exécuté", () => {
    const banner = classifyPreviewBanner(
      preview({
        status: "simulated_credited",
        can_execute: false,
        warnings: [...INFO_WARNINGS, "Le transfert a déjà une exécution en cours ou terminée."],
      }),
    );
    assert.equal(banner?.tone, "error");
    assert.match(banner?.message ?? "", /déjà une exécution/);
  });

  it("ne rassure pas si Alice est injoignable", () => {
    const banner = classifyPreviewBanner(
      preview({
        lightning_connected: false,
        can_execute: false,
      }),
    );
    assert.equal(banner?.tone, "error");
    assert.equal(banner?.message, ALICE_UNREACHABLE_MESSAGE);
  });

  it("n'utilise plus le bandeau générique « Exécution refusée par le preview. »", () => {
    const quoted = classifyPreviewBanner(preview());
    const ready = classifyPreviewBanner(preview({ status: "ready", can_execute: true }));
    const expired = classifyPreviewBanner(preview(), { quoteExpiredLocal: true });
    for (const banner of [quoted, ready, expired]) {
      assert.equal((banner?.message ?? "").includes("Exécution refusée par le preview."), false);
    }
    assert.equal(ALREADY_EXECUTED_MESSAGE.includes("Exécution refusée"), false);
  });
});
