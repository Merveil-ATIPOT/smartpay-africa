"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "../AuthProvider";
import { fetchAdminCorridors } from "../../lib/corridorsApi";
import {
  CORRIDORS_ACCESS_DENIED,
  CORRIDORS_AMOUNTS_NOTE,
  CORRIDORS_EMPTY,
  CORRIDORS_EMPTY_FILTERS,
  CORRIDORS_LOADING,
  CORRIDORS_REGTEST_BADGE,
  CORRIDORS_RELATED_LINKS,
  CORRIDORS_SECURITY_NOTE,
  CORRIDORS_SIMULATED_CREDIT_NOTE,
  CORRIDORS_SOURCE_NOTE,
  CORRIDORS_SUBTITLE,
  CORRIDORS_TITLE,
  CORRIDORS_UNAVAILABLE,
  DESTINATION_FILTERS,
  EMPTY_CORRIDOR_SUMMARY,
  SOURCE_FILTERS,
  STATUS_FILTERS,
  STATUS_ORDER,
  ADMIN_CORRIDORS_PAGE_SIZE,
  buildCorridorsQuery,
  countryLabel,
  defaultCorridorFilters,
  filtersAreDefault,
  formatCorridorStamp,
  formatCount,
  formatLocalAmount,
  operatorLabels,
  statusLabel,
  statusTone,
  visiblePageNumbers,
  type CorridorCountry,
  type CorridorFilters,
  type CorridorsPayload,
} from "../../lib/corridorsDirectory";
import { PortalApiError, portalErrorMessage } from "../../lib/errors";

function toneClass(tone: "ok" | "warn" | "muted"): string {
  if (tone === "ok") {
    return "bg-green/10 text-green";
  }
  if (tone === "warn") {
    return "bg-[#FEF0C7] text-[#B54708]";
  }
  return "bg-blue-low text-muted";
}

function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "ok" | "warn" | "muted" }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneClass(tone)}`}>{children}</span>;
}

function CountryCard({ country, city }: { country: CorridorCountry; city?: string }) {
  return (
    <article className="flex min-w-0 flex-col rounded-xl bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-navy">{country.name}</h3>
          <p className="text-[11px] text-muted">
            {country.code}
            {city ? ` · ${city}` : ""} · {country.currency}
          </p>
        </div>
        <Badge>{country.availability_label}</Badge>
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-wider text-muted">Enregistrements en destination</p>
      <p className="font-display text-2xl font-semibold text-navy">{formatCount(country.transfers_as_destination, "transferts")}</p>
      <p className="mt-1 text-sm text-muted">{formatLocalAmount(country.recorded_amount_local, country.currency)} enregistrés</p>
      <p className="text-[11px] text-muted">{formatCount(country.recorded_amount_sats, "sats")} · pas un règlement</p>
      <p className="mt-2 text-[11px] text-muted">{formatCount(country.transfers_as_source, "transferts")} en origine</p>
      <p className="mt-2 text-[11px] text-muted">Opérateurs simulés : {operatorLabels(country)}</p>
    </article>
  );
}

export function CorridorsView() {
  const { logout } = useAuth();
  const [filters, setFilters] = useState<CorridorFilters>(defaultCorridorFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CorridorsPayload | null>(null);

  const queryPath = useMemo(() => buildCorridorsQuery(filters, page), [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPayload(await fetchAdminCorridors(queryPath));
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
        return;
      }
      setPayload(null);
      if (err instanceof PortalApiError && err.status === 403) {
        setError(CORRIDORS_ACCESS_DENIED);
      } else {
        setError(portalErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [logout, queryPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = payload?.summary ?? EMPTY_CORRIDOR_SUMMARY;
  const primary = payload?.catalog.primary ?? [];
  const secondary = payload?.catalog.secondary ?? [];
  const rows = payload?.results ?? [];
  const historical = payload?.historical_simulations;
  const count = payload?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / ADMIN_CORRIDORS_PAGE_SIZE));
  const emptyDirectory = !loading && !error && count === 0 && filtersAreDefault(filters);
  const emptySearch = !loading && !error && count === 0 && !filtersAreDefault(filters);
  const cityByCode: Record<string, string> = { SN: "Dakar", CI: "Abidjan", CG: "Brazzaville" };

  function updateFilter<K extends keyof CorridorFilters>(key: K, value: CorridorFilters[K]) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-[1280px] overflow-x-hidden">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-navy">{CORRIDORS_TITLE}</h1>
            <span className="rounded-full bg-[#FFDCBF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B3B00]">
              {CORRIDORS_REGTEST_BADGE}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{CORRIDORS_SUBTITLE}</p>
          <p className="mt-1 text-xs text-muted">{CORRIDORS_SOURCE_NOTE}</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white">
          Actualiser
        </button>
      </div>

      {error ? <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mb-4 text-sm text-muted">{CORRIDORS_LOADING}</p> : null}

      <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {primary.map((country) => (
          <CountryCard key={country.code} country={country} city={cityByCode[country.code]} />
        ))}
      </section>

      <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-semibold text-navy">Destinations secondaires</h2>
        <p className="mt-1 text-[11px] text-muted">
          Catalogue de démonstration. Ces pays ne sont pas présentés comme des corridors commerciaux actifs.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {secondary.map((country) => (
            <li key={country.code} className="min-w-0 rounded-lg bg-blue-low px-3 py-2.5">
              <p className="text-sm font-medium text-navy">
                {country.name} · {country.code}
              </p>
              <p className="text-[11px] text-muted">
                {country.currency} · {country.availability_label}
              </p>
              <p className="text-[11px] text-muted">Opérateurs simulés : {operatorLabels(country)}</p>
              <p className="text-[11px] text-muted">{formatCount(country.transfers_as_destination, "transferts")} en destination</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <article key={status} className="min-w-0 rounded-xl bg-white p-3.5 shadow-card">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{statusLabel(status)}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-navy">{summary.by_status[status] ?? 0}</p>
            {status === "simulated_credited" ? <p className="mt-1 text-[11px] text-muted">{CORRIDORS_SIMULATED_CREDIT_NOTE}</p> : null}
          </article>
        ))}
      </section>

      <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Montants XOF enregistrés</p>
            <p className="mt-1 font-display text-xl font-semibold text-navy">{formatLocalAmount(summary.amounts.XOF.amount_local, "XOF")}</p>
            <p className="text-[11px] text-muted">{formatCount(summary.amounts.XOF.transfer_count, "transferts")}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Montants XAF enregistrés</p>
            <p className="mt-1 font-display text-xl font-semibold text-navy">{formatLocalAmount(summary.amounts.XAF.amount_local, "XAF")}</p>
            <p className="text-[11px] text-muted">{formatCount(summary.amounts.XAF.transfer_count, "transferts")}</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted">{payload?.summary.disclaimer ?? CORRIDORS_AMOUNTS_NOTE}</p>
      </section>

      <section className="mb-4 flex flex-wrap gap-2">
        {CORRIDORS_RELATED_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className="inline-flex min-h-8 items-center rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white">
            {item.label}
          </Link>
        ))}
      </section>

      <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-semibold text-navy">Transferts enregistrés</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={filters.sourceCountry}
            onChange={(event) => updateFilter("sourceCountry", event.target.value)}
            className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
          >
            {SOURCE_FILTERS.map((item) => (
              <option key={item.id || "all-source"} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={filters.destinationCountry}
            onChange={(event) => updateFilter("destinationCountry", event.target.value)}
            className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
          >
            {DESTINATION_FILTERS.map((item) => (
              <option key={item.id || "all-dest"} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
            className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item.id || "all-status"} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-[11px] text-muted">
            Début
            <input
              type="datetime-local"
              value={filters.createdAfter}
              onChange={(event) => updateFilter("createdAfter", event.target.value)}
              className="rounded-lg bg-blue-low px-2 py-1.5 text-sm text-navy outline-none"
            />
          </label>
          <label className="flex items-center gap-1 text-[11px] text-muted">
            Fin
            <input
              type="datetime-local"
              value={filters.createdBefore}
              onChange={(event) => updateFilter("createdBefore", event.target.value)}
              className="rounded-lg bg-blue-low px-2 py-1.5 text-sm text-navy outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setFilters(defaultCorridorFilters());
            }}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-blue-low"
          >
            Réinitialiser
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          <span className="font-semibold text-navy">{count.toLocaleString("fr-FR")}</span> transfert(s) correspondant aux filtres.
        </p>
      </section>

      {emptyDirectory ? <p className="mb-4 rounded-xl bg-blue-low px-3 py-6 text-center text-sm text-muted">{CORRIDORS_EMPTY}</p> : null}
      {emptySearch ? <p className="mb-4 rounded-xl bg-blue-low px-3 py-6 text-center text-sm text-muted">{CORRIDORS_EMPTY_FILTERS}</p> : null}

      {rows.length ? (
        <section className="mb-4 overflow-hidden rounded-xl bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="bg-blue-low text-[10px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2.5">Date</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Référence publique</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Origine</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Destination</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Montant</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Devise</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Statut</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Mode d&apos;exécution</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.public_reference} className="border-t border-line">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">{formatCorridorStamp(row.created_at)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">{row.public_reference}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{countryLabel(row.source_country)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{countryLabel(row.destination_country)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatLocalAmount(row.amount_local, row.currency)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.currency || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass(statusTone(row.status))}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-muted">{row.execution_mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
            <p className="text-xs text-muted">
              Page {page} / {pages}
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-lg bg-blue-low px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
              >
                Précédent
              </button>
              {visiblePageNumbers(page, pages).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${item === page ? "bg-navy text-white" : "bg-blue-low text-navy"}`}
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((value) => Math.min(pages, value + 1))}
                className="rounded-lg bg-blue-low px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-semibold text-navy">Simulations historiques</h2>
        <p className="mt-1 text-[11px] text-muted">{historical?.disclaimer ?? "Ancien modèle TransferSimulation, distinct des parcours M22–M26."}</p>
        {historical?.count ? (
          <ul className="mt-3 space-y-2">
            {historical.results.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 rounded-lg bg-blue-low px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy">
                    {countryLabel(item.source_country)} → {countryLabel(item.destination_country)}
                  </p>
                  <p className="text-[11px] text-muted">
                    {formatCorridorStamp(item.created_at)} · {formatCount(item.amount_sats, "sats")} · {item.status}
                  </p>
                </div>
                <Badge tone="warn">Simulation historique</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Aucune simulation historique n&apos;est enregistrée.</p>
        )}
      </section>

      <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-semibold text-navy">Fonctionnalités indisponibles</h2>
        <ul className="mt-3 space-y-2">
          {CORRIDORS_UNAVAILABLE.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 rounded-lg bg-blue-low px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy">{item.label}</p>
                <p className="text-[11px] text-muted">{item.note}</p>
              </div>
              <Badge>Indisponible</Badge>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-muted">{CORRIDORS_SECURITY_NOTE}</p>
    </div>
  );
}
