"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../AuthProvider";
import { PortalApiError, portalErrorMessage } from "../../lib/errors";
import {
  ADMIN_AUDIT_PAGE_SIZE,
  AUDIT_ACCESS_DENIED,
  AUDIT_DETAIL_TITLE,
  AUDIT_EMPTY,
  AUDIT_EMPTY_FILTERS,
  AUDIT_EXPORT_HINT,
  AUDIT_KPI_UNAVAILABLE,
  AUDIT_LOADING,
  AUDIT_REGTEST_BADGE,
  AUDIT_SECURITY_NOTE,
  AUDIT_SOURCE_NOTE,
  AUDIT_SUBTITLE,
  AUDIT_TITLE,
  EMPTY_AUDIT_SUMMARY,
  ACTION_FILTERS,
  RESOURCE_TYPE_FILTERS,
  actorLabel,
  auditExportFilename,
  buildAuditExport,
  buildAuditQuery,
  categoryLabel,
  defaultAuditFilters,
  filtersAreDefault,
  formatAuditStamp,
  metadataEntries,
  resourceLabel,
  severityTone,
  visiblePageNumbers,
  type AuditEvent,
  type AuditListFilters,
  type AuditListPayload,
} from "../../lib/auditDirectory";
import { fetchAdminAudit } from "../../lib/auditApi";
import { downloadJson } from "../../lib/userDetail";

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <article className="rounded-xl bg-white p-3.5 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </article>
  );
}

function toneClass(tone: "ok" | "warn" | "muted"): string {
  if (tone === "ok") {
    return "bg-green/10 text-green";
  }
  if (tone === "warn") {
    return "bg-[#FEF0C7] text-[#B54708]";
  }
  return "bg-blue-low text-muted";
}

export function AuditListView() {
  const { logout } = useAuth();
  const [filters, setFilters] = useState<AuditListFilters>(defaultAuditFilters);
  const [draftQuery, setDraftQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AuditListPayload | null>(null);
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const queryPath = useMemo(() => buildAuditQuery(filters, page), [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminAudit(queryPath);
      setPayload(data);
      setSelected((current) => (current ? data.results.find((row) => row.id === current.id) ?? null : null));
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
        return;
      }
      setPayload(null);
      setSelected(null);
      if (err instanceof PortalApiError && err.status === 403) {
        setError(AUDIT_ACCESS_DENIED);
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

  function updateFilter<K extends keyof AuditListFilters>(key: K, value: AuditListFilters[K]) {
    setLoading(true);
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setLoading(true);
    setDraftQuery("");
    setFilters(defaultAuditFilters());
    setPage(1);
    setSelected(null);
  }

  function exportPage() {
    if (!payload?.results.length) {
      return;
    }
    downloadJson(auditExportFilename(page), buildAuditExport(payload.results, page));
  }

  const summary = payload?.summary ?? EMPTY_AUDIT_SUMMARY;
  const kpiReady = Boolean(payload) && !error;
  const count = payload?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / ADMIN_AUDIT_PAGE_SIZE));
  const rows = payload?.results ?? [];
  const emptySearch = !loading && !error && count === 0 && !filtersAreDefault(filters);
  const emptyDirectory = !loading && !error && count === 0 && filtersAreDefault(filters);

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-navy">{AUDIT_TITLE}</h1>
            <span className="rounded-full bg-[#FFDCBF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B3B00]">
              {AUDIT_REGTEST_BADGE}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{AUDIT_SUBTITLE}</p>
          <p className="mt-1 text-xs text-muted">{AUDIT_SOURCE_NOTE}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy shadow-card">
            Actualiser
          </button>
          <button
            type="button"
            onClick={exportPage}
            disabled={!rows.length}
            className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Exporter les événements (JSON)
          </button>
        </div>
      </div>
      <p className="mb-4 text-[11px] text-muted">{AUDIT_EXPORT_HINT}</p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          title="Événements enregistrés"
          value={kpiReady ? summary.total.toLocaleString("fr-FR") : AUDIT_KPI_UNAVAILABLE}
          hint="Total AuditLog PostgreSQL"
        />
        <KpiCard
          title="Événements de paiement"
          value={kpiReady ? summary.payment.toLocaleString("fr-FR") : AUDIT_KPI_UNAVAILABLE}
          hint="Actions payment.*"
        />
        <KpiCard
          title="Événements de transfert"
          value={kpiReady ? summary.transfer.toLocaleString("fr-FR") : AUDIT_KPI_UNAVAILABLE}
          hint="Actions transfer.*"
        />
      </div>

      <section className="mb-4 rounded-xl bg-white p-3.5 shadow-card">
        <div className="flex flex-col gap-2">
          <label className="min-w-0">
            <span className="sr-only">Rechercher</span>
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Rechercher une action ou un identifiant de ressource…"
              className="w-full rounded-lg bg-blue-low px-3 py-2 text-sm outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.action}
              onChange={(event) => updateFilter("action", event.target.value)}
              className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
            >
              {ACTION_FILTERS.map((item) => (
                <option key={item.id || "all"} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={filters.resourceType}
              onChange={(event) => updateFilter("resourceType", event.target.value)}
              className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
            >
              {RESOURCE_TYPE_FILTERS.map((item) => (
                <option key={item.id || "all"} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              value={filters.resourceId}
              onChange={(event) => updateFilter("resourceId", event.target.value.replace(/[^A-Za-z0-9._:-]/g, ""))}
              placeholder="ID ressource"
              className="w-36 rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
            />
            <input
              value={filters.actor}
              onChange={(event) => updateFilter("actor", event.target.value.replace(/[^\d]/g, ""))}
              placeholder="ID acteur"
              inputMode="numeric"
              className="w-28 rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
            />
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
            <button type="button" onClick={resetFilters} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-blue-low">
              Réinitialiser
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          <span className="font-semibold text-navy">{count.toLocaleString("fr-FR")}</span> événement(s) correspondant aux filtres.
        </p>
      </section>

      {error ? <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mb-4 text-sm text-muted">{AUDIT_LOADING}</p> : null}
      {emptyDirectory ? <p className="mb-4 rounded-xl bg-blue-low px-3 py-6 text-center text-sm text-muted">{AUDIT_EMPTY}</p> : null}
      {emptySearch ? <p className="mb-4 rounded-xl bg-blue-low px-3 py-6 text-center text-sm text-muted">{AUDIT_EMPTY_FILTERS}</p> : null}

      {rows.length ? (
        <section className="mb-4 overflow-hidden rounded-xl bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left text-sm">
              <thead className="bg-blue-low text-[10px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2.5">Date et heure</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Action</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Catégorie</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Acteur</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Ressource</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Classification</th>
                  <th className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right">Détail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={`border-t border-line ${selected?.id === row.id ? "bg-blue-low/60" : ""}`}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">{formatAuditStamp(row.created_at)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">{row.action}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="rounded-lg bg-[#FFDCBF] px-2 py-0.5 text-[11px] font-semibold text-[#6B3B00]">
                        {categoryLabel(row.category)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs">{actorLabel(row.actor)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted">{resourceLabel(row)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass(severityTone(row.severity.key))}`}>
                        {row.severity.label}
                      </span>
                    </td>
                    <td className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="inline-flex min-h-8 min-w-[7.5rem] items-center justify-center whitespace-nowrap rounded-lg bg-blue-low px-3 py-1.5 text-xs font-semibold text-navy"
                      >
                        Voir le détail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
            <p className="text-xs text-muted">
              Page {page} / {pages} · export limité à la page courante
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

      {selected ? (
        <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-navy">{AUDIT_DETAIL_TITLE}</h2>
              <p className="text-[11px] text-muted">Informations déjà présentes dans la réponse API. Aucun appel paiement.</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-blue-low">
              Fermer
            </button>
          </div>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Identifiant</dt>
              <dd className="font-mono text-navy">{selected.id}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Horodatage</dt>
              <dd>{formatAuditStamp(selected.created_at)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Action</dt>
              <dd className="font-mono">{selected.action}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Catégorie</dt>
              <dd>{categoryLabel(selected.category)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Acteur</dt>
              <dd>{selected.actor ? `${selected.actor.email} (ID ${selected.actor.id})` : "Système — aucun compte associé"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Ressource</dt>
              <dd className="font-mono">{resourceLabel(selected)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] uppercase tracking-wider text-muted">Classification</dt>
              <dd>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass(severityTone(selected.severity.key))}`}>
                  {selected.severity.label}
                </span>
              </dd>
            </div>
          </dl>
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Métadonnées autorisées</p>
            {metadataEntries(selected.metadata_safe).length ? (
              <ul className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {metadataEntries(selected.metadata_safe).map((item) => (
                  <li key={item.key} className="flex justify-between gap-2 rounded-lg bg-blue-low px-2 py-1.5">
                    <span className="font-mono text-xs text-muted">{item.key}</span>
                    <span className="text-navy">{item.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Aucune métadonnée autorisée pour cet événement.</p>
            )}
          </div>
        </section>
      ) : null}

      <p className="text-[11px] text-muted">{AUDIT_SECURITY_NOTE}</p>
    </div>
  );
}
