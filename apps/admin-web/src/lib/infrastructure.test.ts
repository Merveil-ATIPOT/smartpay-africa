import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ADMIN_INFRASTRUCTURE_HREF } from "./nav";
import {
  ADMIN_INFRASTRUCTURE_PATH,
  EMPTY_NODE,
  INFRASTRUCTURE_EMPTY_JOURNAL,
  INFRASTRUCTURE_EVENTS_UNAVAILABLE,
  INFRASTRUCTURE_REGTEST_BADGE,
  INFRASTRUCTURE_TITLE,
  STITCH_ILLUSTRATION_MARKERS,
  containsStitchIllustration,
  formatInteger,
  nodeStatusLabel,
  snapshotContainsSecrets,
  topologyHealth,
  type InfrastructureSnapshot,
} from "./infrastructure";

function sample(overrides: Partial<InfrastructureSnapshot> = {}): InfrastructureSnapshot {
  return {
    checked_at: "2026-10-30T23:00:00.000Z",
    cache_hit: false,
    network: "regtest",
    payment_provider: "lnd_regtest",
    warnings: ["Réseau Bitcoin Regtest uniquement."],
    alice: {
      alias: "alice",
      connected: true,
      synced_to_chain: true,
      block_height: 57,
      num_active_channels: 1,
      num_peers: 1,
      channel_balance_sats: 2500,
      status: "connected",
    },
    bob: {
      alias: "bob",
      connected: true,
      synced_to_chain: true,
      block_height: 57,
      num_active_channels: 1,
      num_peers: 1,
      channel_balance_sats: 1800,
      status: "connected",
    },
    bitcoin_core: {
      status: "not_verified",
      verified: false,
      note: "Non vérifié directement.",
    },
    django: {
      status: "ok",
      service: "smartpay-api",
      version: "0.4.0",
      network: "regtest",
      payment_provider: "lnd_regtest",
    },
    postgres: { status: "up" },
    payments: {
      recorded_count: 2,
      lightning_settled_count: 1,
      note: "Compteurs PostgreSQL.",
    },
    ...overrides,
  };
}

describe("infrastructure WA.8", () => {
  it("pointe vers l'endpoint admin et la route W09", () => {
    assert.equal(ADMIN_INFRASTRUCTURE_PATH, "/api/v1/admin/infrastructure/");
    assert.equal(ADMIN_INFRASTRUCTURE_HREF, "/infrastructure");
    assert.equal(INFRASTRUCTURE_TITLE, "Nœud & Infrastructure Lightning");
    assert.equal(INFRASTRUCTURE_REGTEST_BADGE, "Environnement Regtest");
  });

  it("distingue connecté, non synchronisé, timeout et non vérifié", () => {
    assert.equal(nodeStatusLabel({ status: "connected", connected: true, synced_to_chain: true }), "Connecté");
    assert.equal(
      nodeStatusLabel({ status: "connected", connected: true, synced_to_chain: false }),
      "Connecté · non synchronisé",
    );
    assert.equal(nodeStatusLabel({ status: "timeout", connected: false, synced_to_chain: null }), "Délai d'attente dépassé");
    assert.equal(nodeStatusLabel(EMPTY_NODE), "Indisponible");
    assert.equal(formatInteger(null, "blocs"), "Indisponible");
    assert.equal(formatInteger(57, "blocs"), "57 blocs");
    const health = topologyHealth(sample());
    assert.equal(health.bitcoin, "Non vérifié directement");
    assert.equal(health.mobile, "Hors sonde");
  });

  it("n'utilise aucun chiffre Stitch et refuse les secrets", () => {
    const snapshot = sample();
    const rendered = [
      INFRASTRUCTURE_TITLE,
      formatInteger(snapshot.alice.num_active_channels, "canaux"),
      formatInteger(snapshot.payments.recorded_count, "paiements"),
      INFRASTRUCTURE_EMPTY_JOURNAL,
      INFRASTRUCTURE_EVENTS_UNAVAILABLE,
    ].join(" ");
    for (const marker of STITCH_ILLUSTRATION_MARKERS) {
      assert.equal(containsStitchIllustration(rendered), false, marker);
      assert.equal(rendered.includes(marker), false);
    }
    assert.equal(snapshotContainsSecrets(snapshot), false);
    assert.equal(
      snapshotContainsSecrets({
        ...snapshot,
        warnings: ["admin.macaroon /run/lnd/alice"],
      }),
      true,
    );
  });

  it("expose un journal vide explicite", () => {
    assert.match(INFRASTRUCTURE_EMPTY_JOURNAL, /Aucune ligne n'est inventée/);
    assert.match(INFRASTRUCTURE_EVENTS_UNAVAILABLE, /aucun endpoint d'audit/);
  });
});
