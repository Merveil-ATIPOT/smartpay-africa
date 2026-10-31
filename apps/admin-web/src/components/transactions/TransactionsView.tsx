"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../AuthProvider";
import { PortalApiError, portalErrorMessage } from "../../lib/errors";
import { fetchTransactionSnapshots } from "../../lib/transactionsApi";
import {
  ACTIVITY_PERIODS,
  CORRIDOR_FILTERS,
  KIND_FILTERS,
  STATUS_FILTERS,
  TRANSACTIONS_COMPLIANCE,
  TRANSACTIONS_PAGE_SIZE,
  TRANSACTIONS_SOURCE_NOTE,
  activitySeries,
  area,
  chartPoints,
  computeKpis,
  downloadText,
  exportCsv,
  filterRows,
  formatCount,
  formatStamp,
  paginateRows,
  polyline,
  shortenHash,
  type ActivityPeriod,
  type CorridorFilter,
  type TxFilters,
  type TxKind,
  type TxRow,
  type TxStatusKey,
} from "../../lib/transactionsRegtest";

function statusClass(status: TxStatusKey): string {
  if (status === "lnd_recorded") {
    return "bg-green/10 text-green";
  }
  if (status === "failed") {
    return "bg-red-50 text-danger";
  }
  if (status === "expired") {
    return "bg-blue-low text-muted";
  }
  if (status === "unpaid_quote" || status === "mock_ack") {
    return "bg-[#FFDCBF] text-[#6B3B00]";
  }
  return "bg-blue-low text-navy";
}

export function TransactionsView() {
  const { logout } = useAuth();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get("q") ?? "").trim();
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<ActivityPeriod>("week");
  const [filters, setFilters] = useState<TxFilters>({
    query: urlQuery,
    kind: "all",
    status: "all",
    corridor: "all",
  });
  const [page, setPage] = useState(1);
  const [advanced, setAdvanced] = useState(false);
  const [selected, setSelected] = useState<TxRow | null>(null);
  const [copied, setCopied] = useState(false);
  const [counts, setCounts] = useState({ paymentCount: 0, transferCount: 0, simulationCount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchTransactionSnapshots();
      setRows(payload.rows);
      setCounts({
        paymentCount: payload.paymentCount,
        transferCount: payload.transferCount,
        simulationCount: payload.simulationCount,
      });
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
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

  useEffect(() => {
    setFilters((current) => (current.query === urlQuery ? current : { ...current, query: urlQuery }));
    setPage(1);
  }, [urlQuery]);

  const filtered = useMemo(() => filterRows(rows, filters), [rows, filters]);
  const paged = useMemo(() => paginateRows(filtered, page, TRANSACTIONS_PAGE_SIZE), [filtered, page]);
  const kpis = useMemo(() => computeKpis(rows), [rows]);
  const series = useMemo(() => activitySeries(rows, period), [rows, period]);
  const chart = useMemo(() => chartPoints(series), [series]);
  const hasChartData = series.some((point) => point.invoices > 0 || point.settled > 0);

  function updateFilter<K extends keyof TxFilters>(key: K, value: TxFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  async function copyReference(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function exportCurrent() {
    downloadText(`smartpay-w03-transactions-${new Date().toISOString().slice(0, 10)}.csv`, exportCsv(filtered));
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-navy">Transactions Lightning Regtest</h1>
            <span className="rounded-full bg-[#FFDCBF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B3B00]">
              Regtest LND
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">Suivi des factures, règlements de test et simulations du banc d&apos;essai SmartPay Africa.</p>
          <p className="mt-1 text-xs text-muted">{TRANSACTIONS_SOURCE_NOTE}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy shadow-card">
            Actualiser
          </button>
          <button type="button" onClick={exportCurrent} disabled={!filtered.length} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy shadow-card disabled:opacity-40">
            Exporter (CSV)
          </button>
          <button
            type="button"
            onClick={() => setAdvanced((value) => !value)}
            className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white"
          >
            Filtres avancés
          </button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mb-4 text-sm text-muted">Chargement des enregistrements Django…</p> : null}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Factures Lightning créées" value={kpis.invoices} unit="factures" hint="direction=incoming" badge="Django" />
        <KpiCard
          title="Règlements LND enregistrés"
          value={kpis.settled}
          unit="enregistrements"
          hint="is_lightning_settled ou lightning_settled_at"
          badge="Non revérifié LND"
          emphasis
        />
        <KpiCard title="Expirées ou échouées" value={kpis.expiredOrFailed} unit="enregistrements" hint="Statut Django" badge="Django" />
        <KpiCard title="Devis et simulations" value={kpis.simulations} unit="sans règlement" hint="Aucun Wave / Orange Money / MTN" badge="Sandbox" />
      </div>
      <p className="mb-4 text-[11px] text-muted">
        Fenêtre affichée : {counts.paymentCount} paiement(s), {counts.transferCount} transfert(s), {counts.simulationCount}{" "}
        simulation(s) — maximum 100 par endpoint.
      </p>

      <section className="mb-4 rounded-xl bg-white p-3.5 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-navy">Volume d&apos;activité du banc d&apos;essai</h2>
            <p className="text-xs text-muted">Comptage Django par jour UTC — pas une série Stitch, pas une sonde LND.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-[11px] sm:flex">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange" /> Factures</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green" /> Règlements enregistrés</span>
            </div>
            <div className="flex rounded-lg bg-blue-low p-0.5">
              {ACTIVITY_PERIODS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriod(item.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${period === item.id ? "bg-white text-navy shadow-card" : "text-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {hasChartData ? (
          <>
            <div className="mt-3 h-44 w-full min-w-0">
              <svg viewBox="0 0 600 180" className="h-full w-full overflow-visible" role="img" aria-label="Activité Django factures et règlements enregistrés">
                <line x1="0" x2="600" y1="20" y2="20" stroke="#d9e3fb" strokeDasharray="4 4" />
                <line x1="0" x2="600" y1="70" y2="70" stroke="#d9e3fb" strokeDasharray="4 4" />
                <line x1="0" x2="600" y1="120" y2="120" stroke="#d9e3fb" strokeDasharray="4 4" />
                <line x1="0" x2="600" y1="170" y2="170" stroke="#d9e3fb" />
                <polygon points={area(chart.map((point) => ({ x: point.x, y: point.invoicesY })))} fill="url(#invGradW03)" />
                <polygon points={area(chart.map((point) => ({ x: point.x, y: point.settledY })))} fill="url(#setGradW03)" />
                <polyline points={polyline(chart.map((point) => ({ x: point.x, y: point.invoicesY })))} fill="none" stroke="#FE9821" strokeWidth="3" />
                <polyline points={polyline(chart.map((point) => ({ x: point.x, y: point.settledY })))} fill="none" stroke="#009756" strokeWidth="2.5" />
                <defs>
                  <linearGradient id="invGradW03" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fe9821" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#fe9821" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="setGradW03" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#009756" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#009756" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="mt-1 flex justify-between gap-1 overflow-x-auto text-[11px] text-muted">
              {series.map((point) => (
                <span key={point.label} className="shrink-0 text-center">
                  {point.label}
                  <span className="mt-0.5 block text-[10px]">
                    {point.invoices} / {point.settled}
                  </span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-lg bg-blue-low px-3 py-6 text-center text-sm text-muted">
            Aucun point à tracer dans cette fenêtre. Les volumes Stitch 1 842 / 1 216 ne sont pas affichés.
          </p>
        )}
      </section>

      <section className="mb-4 rounded-xl bg-white p-3.5 shadow-card">
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-12">
          <label className="md:col-span-5">
            <span className="sr-only">Rechercher</span>
            <input
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="Rechercher par hash, ID ou référence…"
              className="w-full rounded-lg bg-blue-low px-3 py-2 text-sm outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-7">
            <select
              value={filters.kind}
              onChange={(event) => updateFilter("kind", event.target.value as "all" | TxKind)}
              className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
            >
              {KIND_FILTERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value as "all" | TxStatusKey)}
              className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            {advanced ? (
              <select
                value={filters.corridor}
                onChange={(event) => updateFilter("corridor", event.target.value as CorridorFilter)}
                className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
              >
                {CORRIDOR_FILTERS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-[13px]">
            <thead>
              <tr className="bg-blue-low text-[10px] font-semibold uppercase tracking-wider text-muted">
                <th className="whitespace-nowrap rounded-l-lg px-2.5 py-1.5">Date &amp; heure</th>
                <th className="whitespace-nowrap px-2.5 py-1.5">Référence / hash</th>
                <th className="whitespace-nowrap px-2.5 py-1.5">Type</th>
                <th className="whitespace-nowrap px-2.5 py-1.5">Origine</th>
                <th className="whitespace-nowrap px-2.5 py-1.5">Destination</th>
                <th className="whitespace-nowrap px-2.5 py-1.5 text-right">Montant (sats)</th>
                <th className="whitespace-nowrap px-2.5 py-1.5 text-right">Contre-valeur</th>
                <th className="whitespace-nowrap px-2.5 py-1.5">Statut</th>
                <th className="whitespace-nowrap rounded-r-lg px-2.5 py-1.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2.5 py-8 text-center text-sm text-muted">
                    {loading ? "Chargement…" : "Aucun enregistrement Django ne correspond aux filtres."}
                  </td>
                </tr>
              ) : (
                paged.rows.map((row) => {
                  const stamp = formatStamp(row.createdAt);
                  return (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap px-2.5 py-1.5 text-xs">
                        <span className="block font-medium text-navy">{stamp.date}</span>
                        <span className="text-[10px] text-muted">{stamp.time}</span>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-1.5 font-mono text-xs">
                        <button type="button" className="text-navy underline-offset-2 hover:underline" title={row.reference} onClick={() => void copyReference(row.reference)}>
                          {shortenHash(row.reference)}
                        </button>
                      </td>
                      <td className="px-2.5 py-1.5">{row.kindLabel}</td>
                      <td className="px-2.5 py-1.5 text-muted">{row.origin}</td>
                      <td className="px-2.5 py-1.5 text-muted">{row.destination}</td>
                      <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-semibold">{formatCount(row.amountSats)} sats</td>
                      <td className="whitespace-nowrap px-2.5 py-1.5 text-right text-xs text-muted">{row.amountLocal ?? "—"}</td>
                      <td className="whitespace-nowrap px-2.5 py-1.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(row.status)}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-1.5 text-right">
                        <button type="button" onClick={() => setSelected(row)} className="rounded-lg bg-blue-low px-2 py-1 text-[11px] font-semibold text-navy">
                          Voir détail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Affichage de {paged.rows.length} sur {paged.total} (page {paged.page}/{paged.pages})
            {copied ? " · Référence copiée" : ""}
          </p>
          <div className="flex gap-1">
            <button type="button" disabled={paged.page <= 1} onClick={() => setPage(paged.page - 1)} className="rounded-lg bg-blue-low px-2 py-1 disabled:opacity-40">
              Précédent
            </button>
            {Array.from({ length: paged.pages }, (_, index) => index + 1).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`rounded-lg px-2 py-1 ${item === paged.page ? "bg-navy text-white" : "bg-blue-low"}`}
                >
                  {item}
                </button>
              ))}
            <button type="button" disabled={paged.page >= paged.pages} onClick={() => setPage(paged.page + 1)} className="rounded-lg bg-blue-low px-2 py-1 disabled:opacity-40">
              Suivant
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl bg-[#FFDCBF]/50 p-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">!</div>
        <div>
          <p className="text-sm font-semibold text-navy">Note de conformité et sécurité</p>
          <p className="mt-0.5 text-xs leading-5 text-[#6B3B00]">{TRANSACTIONS_COMPLIANCE}</p>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/40">
          <button type="button" className="absolute inset-0" aria-label="Fermer le détail" onClick={() => setSelected(null)} />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-5 shadow-card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold text-navy">Détail de l&apos;enregistrement</h3>
                <p className="text-[11px] text-muted">Snapshot Django — pas un lookup LND</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg bg-blue-low px-2 py-1 text-sm">
                Fermer
              </button>
            </div>
            <div className="mb-3 rounded-lg bg-[#FFDCBF]/60 px-3 py-2 text-xs text-[#6B3B00]">Enregistrement Regtest isolé — Non diffusable comme preuve de paiement réel.</div>
            <dl className="space-y-3 text-sm">
              <Detail label="Référence" value={selected.reference} />
              <Detail label="Type" value={selected.kindLabel} />
              <Detail label="Statut" value={selected.statusLabel} />
              <Detail label="Origine" value={selected.origin} />
              <Detail label="Destination" value={selected.destination} />
              <Detail label="Montant" value={`${formatCount(selected.amountSats)} sats`} />
              <Detail label="Contre-valeur" value={selected.amountLocal ?? "Non fournie par l'API"} />
              <Detail label="Avertissement" value={selected.warning} />
            </dl>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  title,
  value,
  unit,
  hint,
  badge,
  emphasis = false,
}: {
  title: string;
  value: number;
  unit: string;
  hint: string;
  badge: string;
  emphasis?: boolean;
}) {
  return (
    <article className="rounded-xl bg-white p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase leading-3 tracking-wider text-muted">{title}</p>
        <span className="shrink-0 rounded-full bg-blue-low px-1.5 py-0.5 text-[10px] font-semibold text-muted">{badge}</span>
      </div>
      <p className={`mt-1 font-display text-[28px] font-semibold leading-8 ${emphasis ? "text-green" : "text-navy"}`}>
        {formatCount(value)} <span className="text-sm font-medium text-muted">{unit}</span>
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 break-all text-navy">{value}</dd>
    </div>
  );
}
