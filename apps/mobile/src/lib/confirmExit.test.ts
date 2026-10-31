import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Payment } from "@smartpay/contracts";

import { CONFIRM_CANCEL_LABEL, CONFIRM_DONE_LABEL, CONFIRM_SUCCESS_TITLE, confirmExitIsDone } from "./confirmExit";

function payment(partial: Partial<Payment>): Payment {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    amount_sats: 2500,
    description: "Facture SmartPay Africa",
    status: "confirmed",
    settlement_mode: "lightning_regtest",
    is_lightning_settled: true,
    lightning_status: "settled",
    network: "regtest",
    direction: "outgoing",
    idempotency_key: "k",
    provider_reference: "ref",
    failure_reason: "",
    expires_at: null,
    created_at: "2026-10-31T10:39:19Z",
    updated_at: "2026-10-31T10:39:19Z",
    invoice: null,
    warnings: [],
    ...partial,
  };
}

describe("sortie M15", () => {
  it("propose Terminé après un règlement Lightning confirmé", () => {
    assert.equal(confirmExitIsDone(payment({})), true);
    assert.equal(CONFIRM_DONE_LABEL, "Terminé");
    assert.equal(CONFIRM_SUCCESS_TITLE, "Paiement confirmé");
  });

  it("garde Annuler avant paiement ou après échec", () => {
    assert.equal(confirmExitIsDone(null), false);
    assert.equal(
      confirmExitIsDone(payment({ status: "failed", is_lightning_settled: false, lightning_status: "failed" })),
      false,
    );
    assert.equal(CONFIRM_CANCEL_LABEL, "Annuler la transaction");
  });
});
