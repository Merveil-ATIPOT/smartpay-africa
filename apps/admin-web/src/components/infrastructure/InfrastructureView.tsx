"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "../AuthProvider";
import { PortalApiError, portalErrorMessage } from "../../lib/errors";
import {
  INFRASTRUCTURE_ACCESS_DENIED,
  INFRASTRUCTURE_BITCOIN_UNVERIFIED,
  INFRASTRUCTURE_EMPTY_JOURNAL,
  INFRASTRUCTURE_EVENTS_UNAVAILABLE,
  INFRASTRUCTURE_EXPORT_UNAVAILABLE,
  INFRASTRUCTURE_LOADING,
  INFRASTRUCTURE_REGTEST_BADGE,
  INFRASTRUCTURE_SECURITY_NOTE,
  INFRASTRUCTURE_SOURCE_NOTE,
  INFRASTRUCTURE_TITLE,
  EMPTY_NODE,
  formatCheckedAt,
  formatInteger,
  infrastructureExportFilename,
  nodeStatusLabel,
  nodeStatusTone,
  snapshotContainsSecrets,
  topologyHealth,
  type InfrastructureNode,
  type InfrastructureSnapshot,
  type NodeProbeStatus,
} from "../../lib/infrastructure";
import { fetchInfrastructure } from "../../lib/infrastructureApi";
import { downloadJson } from "../../lib/userDetail";

function toneClass(tone: "ok" | "warn" | "bad" | "muted"): string {
  if (tone === "ok") {
    return "bg-green/10 text-green";
  }
  if (tone === "warn") {
    return "bg-[#FEF0C7] text-[#B54708]";
  }
  if (tone === "bad") {
    return "bg-[#FEE4E2] text-[#D92D20]";
  }
  return "bg-blue-low text-muted";
}

function Badge({ children, tone }: { children: ReactNode; tone: "ok" | "warn" | "bad" | "muted" }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneClass(tone)}`}>
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 py-1">
      <span className="shrink-0 text-[11px] text-muted">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-navy">{value}</span>
    </div>
  );
}

function NodeCard({
  title,
  subtitle,
  node,
}: {
  title: string;
  subtitle: string;
  node: InfrastructureNode;
}) {
  const tone = nodeStatusTone(node.status);
  return (
    <article className="min-w-0 rounded-xl bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">{title}</p>
          <p className="text-[11px] text-muted">{subtitle}</p>
        </div>
        <Badge tone={tone}>{nodeStatusLabel(node)}</Badge>
      </div>
      <div className="mt-3 border-t border-[#EAECF0] pt-2">
        <Metric label="Alias" value={node.alias ?? "Indisponible"} />
        <Metric label="Synchronisé" value={node.synced_to_chain == null ? "Indisponible" : node.synced_to_chain ? "Oui" : "Non"} />
        <Metric label="Hauteur" value={formatInteger(node.block_height, "blocs")} />
        <Metric label="Canaux actifs" value={formatInteger(node.num_active_channels, "canaux")} />
        <Metric label="Pairs" value={formatInteger(node.num_peers, "pairs")} />
        <Metric label="Solde canal" value={formatInteger(node.channel_balance_sats, "sats")} />
      </div>
    </article>
  );
}

function TopologyBox({
  title,
  hint,
  status,
  tone,
}: {
  title: string;
  hint: string;
  status: string;
  tone: "ok" | "warn" | "bad" | "muted";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#EAECF0] bg-white px-3 py-2.5">
      <p className="truncate text-sm font-semibold text-navy">{title}</p>
      <p className="truncate text-[11px] text-muted">{hint}</p>
      <div className="mt-2">
        <Badge tone={tone}>{status}</Badge>
      </div>
    </div>
  );
}

export function InfrastructureView() {
  const { logout } = useAuth();
  const [snapshot, setSnapshot] = useState<InfrastructureSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchInfrastructure();
      setSnapshot(payload);
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
        return;
      }
      setSnapshot(null);
      if (err instanceof PortalApiError && err.status === 403) {
        setError(INFRASTRUCTURE_ACCESS_DENIED);
        return;
      }
      setError(portalErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    void load();
  }, [load]);

  function exportSnapshot() {
    if (!snapshot || snapshotContainsSecrets(snapshot)) {
      return;
    }
    downloadJson(infrastructureExportFilename(), snapshot);
  }

  const ready = Boolean(snapshot) && !error;
  const health = snapshot ? topologyHealth(snapshot) : null;
  const aliceStatus: NodeProbeStatus = snapshot?.alice.status ?? "unavailable";

  return (
    <div className="mx-auto max-w-[1280px] overflow-x-hidden">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-navy">{INFRASTRUCTURE_TITLE}</h1>
            <span className="rounded-full bg-[#FEF0C7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#B54708]">
              {INFRASTRUCTURE_REGTEST_BADGE}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">Supervision technique du banc d&apos;essai Bitcoin Lightning et des services applicatifs.</p>
          <p className="mt-1 text-xs text-muted">{INFRASTRUCTURE_SOURCE_NOTE}</p>
          <p className="mt-1 text-xs text-muted">
            Dernière vérification : {ready ? formatCheckedAt(snapshot?.checked_at) : "—"}
            {snapshot?.cache_hit ? " · issue du cache (20 s)" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white">
            Actualiser
          </button>
          <button
            type="button"
            disabled
            title={INFRASTRUCTURE_EVENTS_UNAVAILABLE}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy shadow-card disabled:opacity-40"
          >
            Consulter les événements
          </button>
          <button
            type="button"
            onClick={exportSnapshot}
            disabled={!ready || !snapshot || snapshotContainsSecrets(snapshot)}
            title={ready ? "Export JSON de la réponse autorisée" : INFRASTRUCTURE_EXPORT_UNAVAILABLE}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy shadow-card disabled:opacity-40"
          >
            Exporter JSON
          </button>
        </div>
      </div>

      {loading ? <p className="mb-4 text-sm text-muted">{INFRASTRUCTURE_LOADING}</p> : null}
      {error ? <p className="mb-4 rounded-xl bg-[#FEE4E2] px-3 py-2 text-sm text-[#D92D20]">{error}</p> : null}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <NodeCard title="LND Alice" subtitle="Nœud de caisse du banc d'essai" node={snapshot?.alice ?? EMPTY_NODE} />
        <NodeCard title="LND Bob" subtitle="Contrepartie laboratoire" node={snapshot?.bob ?? EMPTY_NODE} />
        <article className="min-w-0 rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-navy">Bitcoin Core</p>
              <p className="text-[11px] text-muted">Regtest privé — non sondé</p>
            </div>
            <Badge tone="warn">{INFRASTRUCTURE_BITCOIN_UNVERIFIED}</Badge>
          </div>
          <p className="mt-3 border-t border-[#EAECF0] pt-2 text-[11px] text-muted">
            {snapshot?.bitcoin_core.note ?? "Aucun client RPC Bitcoin n'est branché dans cette version."}
          </p>
        </article>
        <article className="min-w-0 rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-navy">API Django REST</p>
              <p className="text-[11px] text-muted">{snapshot?.django.service ?? "smartpay-api"}</p>
            </div>
            <Badge tone={snapshot?.django.status === "ok" ? "ok" : "bad"}>
              {snapshot?.django.status === "ok" ? "Disponible" : "Indisponible"}
            </Badge>
          </div>
          <div className="mt-3 border-t border-[#EAECF0] pt-2">
            <Metric label="Version" value={snapshot?.django.version ?? "Indisponible"} />
            <Metric label="Réseau" value={snapshot?.django.network ?? "Indisponible"} />
            <Metric label="Fournisseur" value={snapshot?.django.payment_provider ?? "Indisponible"} />
          </div>
        </article>
        <article className="min-w-0 rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-navy">PostgreSQL</p>
              <p className="text-[11px] text-muted">Persistance applicative</p>
            </div>
            <Badge tone={snapshot?.postgres.status === "up" ? "ok" : snapshot ? "bad" : "muted"}>
              {snapshot?.postgres.status === "up" ? "Disponible" : snapshot ? "Indisponible" : "Non lu"}
            </Badge>
          </div>
          <p className="mt-3 border-t border-[#EAECF0] pt-2 text-[11px] text-muted">
            Pool, taille disque et I/O ne sont pas exposés par l&apos;API.
          </p>
        </article>
      </div>

      <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
        <h2 className="font-display text-lg font-semibold text-navy">Topologie fonctionnelle du banc d&apos;essai</h2>
        <p className="mt-1 text-xs text-muted">
          Schéma statique de l&apos;architecture auditée. Aucun flux de paiement n&apos;est simulé ici.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <TopologyBox title="App mobile SmartPay Africa" hint="Client Expo / React Native" status={health?.mobile ?? "Hors sonde"} tone="muted" />
          <TopologyBox
            title="API Django REST"
            hint="Contrôleur applicatif"
            status={health?.django ?? "Indisponible"}
            tone={snapshot?.django.status === "ok" ? "ok" : "bad"}
          />
          <TopologyBox
            title="PostgreSQL"
            hint="Transactions & comptes"
            status={health?.postgres ?? "Indisponible"}
            tone={snapshot?.postgres.status === "up" ? "ok" : snapshot ? "bad" : "muted"}
          />
          <TopologyBox
            title="LND Alice"
            hint="Nœud de caisse Regtest"
            status={health?.alice ?? "Indisponible"}
            tone={nodeStatusTone(aliceStatus)}
          />
          <TopologyBox
            title="LND Bob"
            hint="Contrepartie laboratoire"
            status={health?.bob ?? "Indisponible"}
            tone={nodeStatusTone(snapshot?.bob.status ?? "unavailable")}
          />
          <TopologyBox title="Bitcoin Core Regtest" hint="Consensus on-chain — hors sonde RPC" status={INFRASTRUCTURE_BITCOIN_UNVERIFIED} tone="warn" />
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Hauteur blockchain (LND Alice)</p>
          <p className="mt-1 font-display text-2xl font-semibold text-navy">{formatInteger(snapshot?.alice.block_height ?? null, "blocs")}</p>
          <p className="mt-1 text-[11px] text-muted">Remontée par getinfo Alice — pas une sonde bitcoind.</p>
        </article>
        <article className="rounded-xl bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Canaux actifs</p>
          <p className="mt-1 font-display text-2xl font-semibold text-navy">
            {formatInteger(snapshot?.alice.num_active_channels ?? null, "canaux")}
          </p>
          <p className="mt-1 text-[11px] text-muted">num_active_channels Alice.</p>
        </article>
        <article className="rounded-xl bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Pairs connectés</p>
          <p className="mt-1 font-display text-2xl font-semibold text-navy">{formatInteger(snapshot?.alice.num_peers ?? null, "pairs")}</p>
          <p className="mt-1 text-[11px] text-muted">num_peers Alice, s&apos;il est renvoyé par LND.</p>
        </article>
        <article className="rounded-xl bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Paiements Django</p>
          <p className="mt-1 font-display text-2xl font-semibold text-navy">
            {snapshot ? snapshot.payments.recorded_count.toLocaleString("fr-FR") : "Indisponible"}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {snapshot
              ? `${snapshot.payments.lightning_settled_count.toLocaleString("fr-FR")} marqués is_lightning_settled — statut métier, pas une preuve LND.`
              : "Compteurs PostgreSQL non lus."}
          </p>
        </article>
      </div>

      <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-navy">Journal d&apos;événements</h2>
            <p className="mt-1 text-xs text-muted">{INFRASTRUCTURE_EMPTY_JOURNAL}</p>
          </div>
          <Badge tone="muted">Filtre indisponible</Badge>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-semibold">Horodatage</th>
                <th className="py-2 pr-3 font-semibold">Service</th>
                <th className="py-2 pr-3 font-semibold">Événement</th>
                <th className="py-2 pr-3 font-semibold">Niveau</th>
                <th className="py-2 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted">
                  {INFRASTRUCTURE_EVENTS_UNAVAILABLE}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[#EAECF0] bg-[#F9F9FF] p-4">
        <h2 className="text-sm font-semibold text-navy">Note de sécurité</h2>
        <p className="mt-1 text-xs text-muted">{INFRASTRUCTURE_SECURITY_NOTE}</p>
      </section>
    </div>
  );
}