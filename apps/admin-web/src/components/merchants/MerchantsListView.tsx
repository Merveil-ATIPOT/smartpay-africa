"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../AuthProvider";
import { PortalApiError, portalErrorMessage } from "../../lib/errors";
import {
  ADMIN_MERCHANTS_PAGE_SIZE,
  COUNTRY_FILTERS,
  EMPTY_MERCHANTS_SUMMARY,
  MERCHANTS_ACCESS_DENIED,
  MERCHANTS_ACTIVITY_TYPE_UNAVAILABLE,
  MERCHANTS_KPI_UNAVAILABLE,
  MERCHANTS_SOURCE_NOTE,
  MERCHANTS_SUCCESS_RATE_UNAVAILABLE,
  STATUS_FILTERS,
  buildMerchantsExport,
  buildMerchantsQuery,
  countryBreakdown,
  defaultMerchantsFilters,
  filtersAreDefault,
  formatCreatedStamp,
  merchantOwnerName,
  merchantStatusLabel,
  merchantsExportFilename,
  paymentCountLabel,
  type MerchantsListFilters,
  type MerchantsListPayload,
} from "../../lib/merchantsDirectory";
import { fetchAdminMerchants } from "../../lib/merchantsApi";
import { merchantDetailHref } from "../../lib/nav";
import { downloadJson, userCountryFlag, userCountryLabel } from "../../lib/userDetail";

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <article className="rounded-xl bg-white p-3.5 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </article>
  );
}

function statusClass(status: string): string {
  if (status === "active") {
    return "bg-green/10 text-green";
  }
  if (status === "draft") {
    return "bg-[#FFDCBF] text-[#6B3B00]";
  }
  return "bg-blue-low text-muted";
}

export function MerchantsListView() {
  const { logout } = useAuth();
  const [filters, setFilters] = useState<MerchantsListFilters>(defaultMerchantsFilters);
  const [draftQuery, setDraftQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<MerchantsListPayload | null>(null);

  const queryPath = useMemo(() => buildMerchantsQuery(filters, page), [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminMerchants(queryPath);
      setPayload(data);
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
        return;
      }
      setPayload(null);
      if (err instanceof PortalApiError && err.status === 403) {
        setError(MERCHANTS_ACCESS_DENIED);
        return;
      }
      setError(portalErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [logout, queryPath]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((current) => {
        if (current.query === draftQuery) {
          return current;
        }
        setLoading(true);
        setPage(1);
        return { ...current, query: draftQuery };
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draftQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateFilter<K extends keyof MerchantsListFilters>(key: K, value: MerchantsListFilters[K]) {
    setLoading(true);
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setLoading(true);
    setDraftQuery("");
    setFilters(defaultMerchantsFilters());
    setPage(1);
  }

  function exportPage() {
    if (!payload?.results.length) {
      return;
    }
    downloadJson(merchantsExportFilename(), buildMerchantsExport(payload.results));
  }

  const summary = payload?.summary ?? EMPTY_MERCHANTS_SUMMARY;
  const countries = countryBreakdown(summary);
  const kpiReady = Boolean(payload) && !error;
  const count = payload?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / ADMIN_MERCHANTS_PAGE_SIZE));
  const rows = payload?.results ?? [];
  const emptySearch = !loading && !error && count === 0 && !filtersAreDefault(filters);
  const emptyDirectory = !loading && !error && count === 0 && filtersAreDefault(filters);

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-navy">Gestion des Marchands</h1>
            <span className="rounded-full bg-[#E8F0FE] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy">
              PostgreSQL
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">Consultation des boutiques réellement enregistrées dans le bac à sable Regtest.</p>
          <p className="mt-1 text-xs text-muted">{MERCHANTS_SOURCE_NOTE}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportPage}
            disabled={!rows.length}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy shadow-card disabled:opacity-40"
          >
            Télécharger l&apos;inventaire (JSON)
          </button>
          <button type="button" onClick={() => void load()} className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white">
            Actualiser
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Boutiques enregistrées"
          value={kpiReady ? summary.total.toLocaleString("fr-FR") : MERCHANTS_KPI_UNAVAILABLE}
          hint="Lignes Merchant PostgreSQL"
        />
        <KpiCard
          title="Paiements liés"
          value={kpiReady ? summary.payments_linked.toLocaleString("fr-FR") : MERCHANTS_KPI_UNAVAILABLE}
          hint="Paiements avec merchant renseigné — pas de sats simulés"
        />
        <KpiCard title="Réussite des scénarios" value={MERCHANTS_KPI_UNAVAILABLE} hint={MERCHANTS_SUCCESS_RATE_UNAVAILABLE} />
        <article className="rounded-xl bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Pays représentés</p>
          {kpiReady && countries.length ? (
            <>
              <p className="mt-1 font-display text-2xl font-semibold text-navy">
                {countries.length} pays
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                {countries.map((item) => (
                  <li key={item.country}>
                    {item.label} {userCountryFlag(item.country)} · {item.count}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">{MERCHANTS_KPI_UNAVAILABLE}</p>
          )}
        </article>
      </div>

      <section className="mb-4 rounded-xl bg-white p-3.5 shadow-card">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Rechercher</span>
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Rechercher par nom de boutique, identifiant ou gérant…"
              className="w-full rounded-lg bg-blue-low px-3 py-2 text-sm outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.country}
              onChange={(event) => updateFilter("country", event.target.value as MerchantsListFilters["country"])}
              className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
            >
              {COUNTRY_FILTERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value as MerchantsListFilters["status"])}
              className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={resetFilters} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-blue-low">
              Réinitialiser
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          <span className="font-semibold text-navy">{count.toLocaleString("fr-FR")}</span> boutique(s) correspondant aux filtres.
          Aucun filtre « type POS » : ce champ n&apos;existe pas.
        </p>
      </section>

      {error ? <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mb-4 text-sm text-muted">Chargement de l&apos;annuaire Django…</p> : null}
      {emptyDirectory ? (
        <p className="mb-4 rounded-xl bg-blue-low px-3 py-6 text-center text-sm text-muted">
          Aucun marchand dans PostgreSQL.
        </p>
      ) : null}
      {emptySearch ? (
        <p className="mb-4 rounded-xl bg-blue-low px-3 py-6 text-center text-sm text-muted">Aucun résultat pour ces filtres.</p>
      ) : null}

      {rows.length ? (
        <section className="mb-4 overflow-hidden rounded-xl bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left text-sm">
              <thead className="bg-blue-low text-[10px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2.5">Nom de la boutique</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Responsable / gérant</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Pays</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Identifiant</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Statut</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Paiements liés</th>
                  <th className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="min-w-[14rem] px-3 py-2.5">
                      <p className="truncate font-semibold text-navy">{row.display_name}</p>
                      <p className="truncate text-[11px] text-muted">{row.legal_name}</p>
                      {row.registration_number ? (
                        <p className="font-mono text-[11px] text-muted">{row.registration_number}</p>
                      ) : null}
                    </td>
                    <td className="min-w-[10rem] px-3 py-2.5">
                      <p className="truncate text-navy">{merchantOwnerName(row.owner)}</p>
                      <p className="truncate font-mono text-[11px] text-muted">{row.owner.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {userCountryLabel(row.country)} {userCountryFlag(row.country)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted">{row.id}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(row.status)}`}>
                        {merchantStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">{paymentCountLabel(row.payment_count)}</td>
                    <td className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right">
                      <Link
                        href={merchantDetailHref(row.id)}
                        className="inline-flex min-h-8 min-w-[7.5rem] items-center justify-center whitespace-nowrap rounded-lg bg-blue-low px-3 py-1.5 text-xs font-semibold text-navy"
                      >
                        Voir le détail
                      </Link>
                    </td>
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
              {Array.from({ length: pages }, (_, index) => index + 1).map((item) => (
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

      <p className="text-[11px] text-muted">
        {MERCHANTS_ACTIVITY_TYPE_UNAVAILABLE} Zéro mot de passe, seed, macaroon ou jeton n&apos;est exposé.
      </p>
    </div>
  );
}
