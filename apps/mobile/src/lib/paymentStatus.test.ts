import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Payment } from "@smartpay/contracts";

import {
  LIGHTNING_SUCCESS_LABEL,
  displayPaymentStatus,
  httpOkIsSettlement,
  isLightningSuccess,
  settlementCaption,
  shouldStopPolling,
  uiPaymentState,
} from "./paymentStatus";

function payment(partial: Partial<Payment>): Payment {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    amount_sats: 2500,
    description: "test",
    status: "pending",
    settlement_mode: "mock",
    is_lightning_settled: false,
    lightning_status: "not_applicable",
    network: "regtest",
    direction: "outgoing",
    idempotency_key: "k",
    provider_reference: "ref",
    failure_reason: "",
    expires_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    invoice: null,
    warnings: [],
    ...partial,
  };
}

describe("règlement", () => {
  it("ne traite jamais HTTP 200 comme un règlement", () => {
    assert.equal(httpOkIsSettlement(200), false);
    assert.equal(httpOkIsSettlement(201), false);
  });

  it("ne présente jamais un Mock comme Lightning settled", () => {
    const mock = payment({
      status: "confirmed",
      settlement_mode: "mock",
      is_lightning_settled: false,
      lightning_status: "not_applicable",
    });
    assert.equal(isLightningSuccess(mock), false);
    assert.equal(uiPaymentState(mock), "mock_receipt");
    assert.match(settlementCaption(mock), /PAS une transaction Lightning/i);
  });

  it("n'affiche un succès Lightning qu'après is_lightning_settled", () => {
    const pending = payment({
      settlement_mode: "lightning_regtest",
      status: "pending",
      is_lightning_settled: false,
      lightning_status: "pending",
    });
    assert.equal(isLightningSuccess(pending), false);
    assert.equal(uiPaymentState(pending), "processing");

    const settled = payment({
      settlement_mode: "lightning_regtest",
      status: "confirmed",
      is_lightning_settled: true,
      lightning_status: "settled",
    });
    assert.equal(isLightningSuccess(settled), true);
    assert.equal(uiPaymentState(settled), "confirmed");
    assert.equal(settlementCaption(settled), LIGHTNING_SUCCESS_LABEL);
    assert.equal(displayPaymentStatus(settled), LIGHTNING_SUCCESS_LABEL);
  });

  it("distingue un statut expiré d'un échec sans changer uiPaymentState", () => {
    const expired = payment({
      settlement_mode: "lightning_regtest",
      status: "expired",
      lightning_status: "expired",
    });
    const failed = payment({
      settlement_mode: "lightning_regtest",
      status: "failed",
      lightning_status: "failed",
    });
    assert.equal(uiPaymentState(expired), "failed");
    assert.equal(uiPaymentState(failed), "failed");
    assert.equal(displayPaymentStatus(expired), "Expiré");
    assert.equal(displayPaymentStatus(failed), "Échoué");
  });

  it("classe failed et unknown", () => {
    assert.equal(
      uiPaymentState(
        payment({
          settlement_mode: "lightning_regtest",
          status: "failed",
          lightning_status: "failed",
        }),
      ),
      "failed",
    );
    assert.equal(
      uiPaymentState(
        payment({
          settlement_mode: "mock",
          status: "created",
          lightning_status: "not_applicable",
        }),
      ),
      "pending",
    );
  });

  it("arrête le polling Mock dès le premier accusé", () => {
    assert.equal(
      shouldStopPolling(
        payment({
          settlement_mode: "mock",
          status: "pending",
          lightning_status: "not_applicable",
        }),
      ),
      true,
    );
  });

  it("continue le polling LND tant que le lookup n'est pas terminal", () => {
    assert.equal(
      shouldStopPolling(
        payment({
          settlement_mode: "lightning_regtest",
          status: "pending",
          is_lightning_settled: false,
          lightning_status: "pending",
        }),
      ),
      false,
    );
    assert.equal(
      shouldStopPolling(
        payment({
          settlement_mode: "lightning_regtest",
          status: "confirmed",
          is_lightning_settled: true,
          lightning_status: "settled",
        }),
      ),
      true,
    );
  });
});
