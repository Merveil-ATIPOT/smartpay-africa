"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../AuthProvider";
import { PortalApiError, portalErrorMessage } from "../../lib/errors";
import { userDetailHref } from "../../lib/nav";
import {
  ADMIN_USERS_PAGE_SIZE,
  COUNTRY_FILTERS,
  EMPTY_SUMMARY,
  ROLE_FILTERS,
  STATUS_FILTERS,
  USERS_ACCESS_DENIED,
  USERS_KPI_UNAVAILABLE,
  USERS_SOURCE_NOTE,
  buildUsersQuery,
  defaultUsersFilters,
  downloadCsv,
  exportUsersCsv,
  filtersAreDefault,
  formatJoinedStamp,
  roleBreakdown,
  usersCsvFilename,
  type UsersListFilters,
  type UsersListPayload,
} from "../../lib/usersDirectory";
import { fetchAdminUsers } from "../../lib/usersApi";
import { accountStatusLabel, userCountryLabel, userRoleLabel } from "../../lib/userDetail";
import { UserAvatar } from "./UserAvatar";

function KpiCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <article className="rounded-xl bg-white p-3.5 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </article>
  );
}

export function UsersListView() {
  const { logout } = useAuth();
  const [filters, setFilters] = useState<UsersListFilters>(defaultUsersFilters);
  const [draftQuery, setDraftQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<UsersListPayload | null>(null);

  const queryPath = useMemo(() => buildUsersQuery(filters, page), [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers(queryPath);
      setPayload(data);
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
        return;
      }
      setPayload(null);
      if (err instanceof PortalApiError && err.status === 403) {
        setError(USERS_ACCESS_DENIED);
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

  function updateFilter<K extends keyof UsersListFilters>(key: K, value: UsersListFilters[K]) {
    setLoading(true);
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setLoading(true);
    setDraftQuery("");
    setFilters(defaultUsersFilters());
    setPage(1);
  }

  function exportPage() {
    if (!payload?.results.length) {
      return;
    }
    downloadCsv(usersCsvFilename(), exportUsersCsv(payload.results));
  }

  const summary = payload?.summary ?? EMPTY_SUMMARY;
  const roles = roleBreakdown(summary);
  const kpiReady = Boolean(payload) && !error;
  const count = payload?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / ADMIN_USERS_PAGE_SIZE));
  const rows = payload?.results ?? [];
  const emptySearch = !loading && !error && count === 0 && !filtersAreDefault(filters);
  const emptyDirectory = !loading && !error && count === 0 && filtersAreDefault(filters);

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-navy">Utilisateurs</h1>
            <span className="rounded-full bg-[#FFDCBF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B3B00]">
              Regtest
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">Gestion et consultation des comptes SmartPay Africa.</p>
          <p className="mt-1 text-xs text-muted">{USERS_SOURCE_NOTE}</p>
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
            Exporter la page (CSV)
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total comptes"
          value={kpiReady ? summary.total.toLocaleString("fr-FR") : USERS_KPI_UNAVAILABLE}
          hint="Tous les comptes PostgreSQL"
        />
        <KpiCard
          title="Comptes actifs"
          value={kpiReady ? summary.active.toLocaleString("fr-FR") : USERS_KPI_UNAVAILABLE}
          hint="is_active = true"
        />
        <KpiCard
          title="Comptes inactifs"
          value={kpiReady ? summary.inactive.toLocaleString("fr-FR") : USERS_KPI_UNAVAILABLE}
          hint="is_active = false"
        />
        <article className="rounded-xl bg-white p-3.5 shadow-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Répartition par rôle</p>
          {kpiReady && roles.length ? (
            <ul className="mt-2 space-y-1 text-xs text-navy">
              {roles.map((item) => (
                <li key={item.role} className="flex justify-between gap-2">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">{USERS_KPI_UNAVAILABLE}</p>
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
              placeholder="Rechercher par e-mail, prénom, nom ou téléphone…"
              className="w-full rounded-lg bg-blue-low px-3 py-2 text-sm outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.role}
              onChange={(event) => updateFilter("role", event.target.value as UsersListFilters["role"])}
              className="rounded-lg bg-blue-low px-2.5 py-2 text-sm outline-none"
            >
              {ROLE_FILTERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={filters.country}
              onChange={(event) => updateFilter("country", event.target.value as UsersListFilters["country"])}
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
              onChange={(event) => updateFilter("status", event.target.value as UsersListFilters["status"])}
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
          <span className="font-semibold text-navy">{count.toLocaleString("fr-FR")}</span> compte(s) correspondant aux filtres.
        </p>
      </section>

      {error ? <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="mb-4 text-sm text-muted">Chargement de l&apos;annuaire Django…</p> : null}
      {emptyDirectory ? (
        <p className="mb-4 rounded-xl bg-blue-low px-3 py-6 text-center text-sm text-muted">Aucun compte dans PostgreSQL.</p>
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
                  <th className="px-3 py-2.5">Utilisateur</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Identifiant</th>
                  <th className="px-3 py-2.5">E-mail</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Pays</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Rôle</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Statut</th>
                  <th className="whitespace-nowrap px-3 py-2.5">Inscription</th>
                  <th className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="min-w-[12rem] px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar first_name={row.first_name} last_name={row.last_name} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-navy">
                            {`${row.first_name} ${row.last_name}`.trim() || row.email}
                          </p>
                          <p className="font-mono text-[11px] text-muted">ID {row.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted">{row.id}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs">{row.email}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{userCountryLabel(row.country)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="rounded-lg bg-[#FFDCBF] px-2 py-0.5 text-[11px] font-semibold text-[#6B3B00]">
                        {userRoleLabel(row.role)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.is_active ? "bg-green/10 text-green" : "bg-blue-low text-muted"}`}>
                        {accountStatusLabel(row.is_active)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">{formatJoinedStamp(row.date_joined)}</td>
                    <td className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right">
                      <Link
                        href={userDetailHref(row.id)}
                        className="inline-flex min-h-8 min-w-[7.5rem] items-center justify-center whitespace-nowrap rounded-lg bg-blue-low px-3 py-1.5 text-xs font-semibold text-navy"
                      >
                        Voir la fiche
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

      <p className="text-[11px] text-muted">Zéro mot de passe, seed, macaroon ou jeton n&apos;est exposé dans cet annuaire.</p>
    </div>
  );
}
