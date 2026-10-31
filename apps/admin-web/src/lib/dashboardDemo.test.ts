import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DASHBOARD_DEMO_DISCLAIMER,
  DASHBOARD_DEMO_SOURCE,
  DASHBOARD_FX_NOTE,
  DEMO_CORRIDORS,
  DEMO_OPERATIONS,
  DEMO_OP_STATUS_LABEL,
  DEMO_SERVICES,
  DEMO_STATS,
  activitySeries,
  activityTotals,
  areaPath,
  chartPoints,
  exportOperationsJson,
  filterOperations,
  looksLikeConfirmedChainId,
  paginateOperations,
  polylinePath,
  scaleIndependent,
  shortenReference,
} from "./dashboardDemo";

describe("tableau de bord W02 illustratif", () => {
  it("expose les chiffres Stitch comme simulation locale", () => {
    assert.equal(DEMO_STATS.users.value, 1_248);
    assert.equal(DEMO_STATS.merchants.value, 84);
    assert.equal(DEMO_STATS.transfers.value, 3_892);
    assert.equal(DEMO_STATS.capacity.valueLabel, "12,5 M");
    assert.match(DASHBOARD_DEMO_DISCLAIMER, /Aucune valeur monétaire réelle/);
    assert.equal(DASHBOARD_DEMO_SOURCE, "dashboardDemo");
  });

  it("met à jour le graphique selon la période, avec échelles indépendantes", () => {
    const week = activitySeries("week");
    const month = activitySeries("month");
    const global = activitySeries("global");
    assert.equal(week.length, 7);
    assert.equal(month.length, 4);
    assert.ok(global.length >= 4);
    assert.notEqual(activityTotals("week").sats, activityTotals("month").sats);
    const scaled = scaleIndependent([0, 50, 100], 100, 0);
    assert.equal(scaled[0], 100);
    assert.equal(scaled[2], 0);
    const chart = chartPoints(week);
    assert.equal(chart.sats.length, week.length);
    assert.equal(chart.fcfa.length, week.length);
    assert.match(polylinePath(chart.sats), /^M/);
    assert.match(areaPath(chart.fcfa, 180), /Z$/);
    assert.match(DASHBOARD_FX_NOTE, /aucun taux BTC\/FCFA réel/i);
  });

  it("filtre et pagine les opérations illustratives", () => {
    const transfers = filterOperations(DEMO_OPERATIONS, "transfer");
    assert.ok(transfers.length >= 2);
    assert.ok(transfers.every((row) => row.type === "transfer"));
    const page1 = paginateOperations(DEMO_OPERATIONS, 1, 6);
    const page2 = paginateOperations(DEMO_OPERATIONS, 2, 6);
    assert.equal(page1.rows.length, 6);
    assert.equal(page2.page, 2);
    assert.equal(page1.rows[0]?.id, "op-01");
    assert.notEqual(page2.rows[0]?.id, page1.rows[0]?.id);
    const overflow = paginateOperations(DEMO_OPERATIONS, 99, 6);
    assert.equal(overflow.page, overflow.pages);
  });

  it("exporte un JSON de démonstration sans hash confirmé ni statut LND", () => {
    const json = exportOperationsJson(DEMO_OPERATIONS, "2026-10-30T17:00:00Z");
    assert.match(json, /dashboardDemo/);
    assert.match(json, /Aucune valeur monétaire réelle/);
    assert.equal(json.toLowerCase().includes("réglé regtest"), false);
    assert.equal(DEMO_OPERATIONS.some((row) => looksLikeConfirmedChainId(row.reference)), false);
    assert.ok(Object.values(DEMO_OP_STATUS_LABEL).includes("Simulation terminée"));
    assert.ok(Object.values(DEMO_OP_STATUS_LABEL).includes("Facture de démonstration"));
    assert.match(shortenReference("sim_inv_almadies_4_demo_not_a_chain_hash", 18), /…/);
  });

  it("n'affiche pas un état de service vérifié", () => {
    assert.ok(DEMO_SERVICES.every((item) => /non vérifié|illustrative/i.test(item.statusLabel)));
    assert.equal(DEMO_SERVICES.some((item) => /opérationnel|en ligne|synchronisé/i.test(item.statusLabel)), false);
    assert.equal(DEMO_CORRIDORS.reduce((sum, item) => sum + item.percent, 0), 100);
  });
});
