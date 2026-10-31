import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activitySeries,
  computeKpis,
  exportCsv,
  filterRows,
  liveLndLookupEnabled,
  mergeSnapshots,
  paginateRows,
  paymentStatus,
  stitchKpisAreNotUsed,
  type PaymentSnapshot,
} from "./transactionsRegtest";

const payment = (over: Partial<PaymentSnapshot> & Pick<PaymentSnapshot, "id" | "amount_sats" | "status" | "created_at">): PaymentSnapshot => ({
  direction: "incoming",
  ...over,
});

describe("transactions WA.3", () => {
  it("ne compte un règlement LND que si is_lightning_settled est vrai", () => {
    const mockAck = payment({
      id: "1",
      amount_sats: 1000,
      status: "confirmed",
      settlement_mode: "mock",
      is_lightning_settled: false,
      created_at: "2026-10-30T10:00:00Z",
    });
    const djangoPending = payment({
      id: "2",
      amount_sats: 2000,
      status: "confirmed",
      settlement_mode: "lightning_regtest",
      is_lightning_settled: false,
      created_at: "2026-10-30T11:00:00Z",
    });
    const settled = payment({
      id: "3",
      amount_sats: 3000,
      status: "confirmed",
      settlement_mode: "lightning_regtest",
      is_lightning_settled: true,
      created_at: "2026-10-30T12:00:00Z",
    });
    assert.equal(paymentStatus(mockAck).key, "mock_ack");
    assert.equal(paymentStatus(djangoPending).key, "pending");
    assert.equal(paymentStatus(settled).key, "lnd_recorded");
    const rows = mergeSnapshots([mockAck, djangoPending, settled], [], []);
    const kpis = computeKpis(rows);
    assert.equal(kpis.invoices, 3);
    assert.equal(kpis.settled, 1);
    assert.equal(stitchKpisAreNotUsed(), true);
    assert.equal(liveLndLookupEnabled(), false);
  });

  it("sépare simulations et devis des paiements Lightning", () => {
    const rows = mergeSnapshots(
      [],
      [
        {
          id: "tr-1",
          public_reference: "SP-1",
          source_country: "SN",
          destination_country: "CI",
          amount_sats: 5000,
          status: "quoted",
          created_at: "2026-10-29T09:00:00Z",
        },
      ],
      [
        {
          id: 9,
          source_country: "SN",
          destination_country: "CG",
          amount_sats: 800,
          status: "confirmed",
          created_at: "2026-10-29T10:00:00Z",
        },
      ],
    );
    assert.equal(rows[0]?.status, "simulation");
    assert.equal(rows[1]?.status, "unpaid_quote");
    assert.equal(computeKpis(rows).settled, 0);
    assert.equal(computeKpis(rows).simulations, 2);
  });

  it("filtre, pagine et exporte sans facture BOLT11", () => {
    const rows = mergeSnapshots(
      [
        payment({
          id: "aa",
          amount_sats: 12,
          status: "expired",
          encoded_invoice: "lntbsecret",
          invoice: { payment_hash: "abc123hash" },
          created_at: "2026-10-28T08:00:00Z",
        }),
        payment({
          id: "bb",
          amount_sats: 40,
          direction: "outgoing",
          status: "pending",
          created_at: "2026-10-28T09:00:00Z",
        }),
      ],
      [],
      [],
    );
    const expired = filterRows(rows, { query: "abc123", kind: "all", status: "expired", corridor: "all" });
    assert.equal(expired.length, 1);
    const page = paginateRows(rows, 1, 1);
    assert.equal(page.pages, 2);
    assert.equal(page.rows[0]?.kind, "outgoing");
    const csv = exportCsv(rows);
    assert.equal(csv.includes("lntbsecret"), false);
    assert.equal(csv.includes("abc123hash"), true);
  });

  it("agrège le graphique uniquement depuis les enregistrements fournis", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    const series = activitySeries(
      mergeSnapshots(
        [
          payment({
            id: "s",
            amount_sats: 1,
            status: "confirmed",
            is_lightning_settled: true,
            created_at: "2026-10-30T08:00:00Z",
          }),
        ],
        [],
        [],
      ),
      "week",
      now,
    );
    assert.equal(series.length, 7);
    assert.equal(
      series.reduce((sum, point) => sum + point.invoices, 0),
      1,
    );
    assert.equal(
      series.reduce((sum, point) => sum + point.settled, 0),
      1,
    );
  });
});
