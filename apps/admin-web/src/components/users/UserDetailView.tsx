"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { UserProfile } from "@smartpay/contracts";

import { useAuth } from "../AuthProvider";
import { PortalApiError, portalErrorMessage } from "../../lib/errors";
import { ADMIN_USERS_HREF } from "../../lib/nav";
import { fetchAdminUser } from "../../lib/usersApi";
import {
  USER_AUDIT_REPORT_UNAVAILABLE,
  USER_AUDIT_UNAVAILABLE,
  USER_DETAIL_ACCESS_DENIED,
  USER_DETAIL_BANNER,
  USER_DETAIL_SOURCE_NOTE,
  USER_DETAIL_UNAVAILABLE,
  USER_HISTORY_UNAVAILABLE,
  USER_LND_NODE_UNAVAILABLE,
  USER_PREFERENCES_UNAVAILABLE,
  USER_SECURITY_NOTE,
  accountStatusLabel,
  buildUserExport,
  downloadJson,
  formatJoined,
  parseUserRouteId,
  userCountryFlag,
  userCountryLabel,
  userDisplayName,
  userExportFilename,
  userRoleLabel,
  type UserDetailExport,
} from "../../lib/userDetail";
import { UserAvatar } from "./UserAvatar";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#76777D]">{label}</span>
      <div className="mt-0.5 text-sm font-medium text-navy">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-lg font-semibold text-navy">{children}</h2>;
}

export function UserDetailView() {
  const params = useParams<{ id: string }>();
  const { logout } = useAuth();
  const routeId = parseUserRouteId(params.id);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(routeId == null);

  const load = useCallback(async () => {
    if (routeId == null) {
      setMissing(true);
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setMissing(false);
    try {
      setProfile(await fetchAdminUser(routeId));
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
        return;
      }
      setProfile(null);
      if (err instanceof PortalApiError && err.status === 404) {
        setMissing(true);
        return;
      }
      if (err instanceof PortalApiError && err.status === 403) {
        setError(USER_DETAIL_ACCESS_DENIED);
        return;
      }
      setError(portalErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [logout, routeId]);

  useEffect(() => {
    void load();
  }, [load]);

  function exportFiche() {
    if (!profile) {
      return;
    }
    const payload: UserDetailExport = buildUserExport(profile);
    downloadJson(userExportFilename(profile.id), payload);
  }

  return (
    <div className="mx-auto max-w-[1280px] pb-8">
      <div className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-[#FFDCBF]/50 px-4 py-2.5 shadow-sm">
        <p className="truncate text-xs font-medium text-[#2D1600]">{USER_DETAIL_BANNER}</p>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-orange">Regtest</span>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Link
          href={ADMIN_USERS_HREF}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-low px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-[#E8EEFF] hover:text-navy"
        >
          ← Retour à la liste des utilisateurs
        </Link>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={exportFiche}
              disabled={!profile}
              className="rounded-lg bg-white px-4 py-2 text-xs font-medium text-navy shadow-sm disabled:opacity-40"
            >
              Exporter la fiche (JSON)
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-describedby="audit-report-hint"
              title={USER_AUDIT_REPORT_UNAVAILABLE}
              className="rounded-lg bg-navy px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Générer rapport d&apos;audit
            </button>
          </div>
          <p id="audit-report-hint" className="max-w-md text-[11px] leading-4 text-muted sm:text-right">
            {USER_AUDIT_REPORT_UNAVAILABLE}
          </p>
        </div>
      </div>

      {loading ? <p className="mb-6 text-sm text-muted">Chargement de la fiche Django…</p> : null}
      {error ? <p className="mb-6 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}

      {missing || (!loading && !profile && !error) ? (
        <section className="rounded-xl bg-white p-6 shadow-card">
          <h1 className="font-display text-[28px] font-bold tracking-tight text-navy">Détail d&apos;un utilisateur</h1>
          <p className="mt-2 text-sm text-muted">Identifiant demandé : {params.id ?? "—"}</p>
          <p className="mt-3 rounded-lg bg-blue-low px-3 py-3 text-sm text-navy">{USER_DETAIL_UNAVAILABLE}</p>
          <p className="mt-2 text-xs text-muted">{USER_DETAIL_SOURCE_NOTE}</p>
        </section>
      ) : null}

      {profile ? (
        <>
          <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-start gap-4 sm:items-center">
                <UserAvatar first_name={profile.first_name} last_name={profile.last_name} size="lg" />
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-[28px] font-bold tracking-tight text-navy">
                      {userDisplayName(profile)}
                    </h1>
                    <span className="rounded-full bg-[#DFE8FF] px-2.5 py-0.5 font-mono text-[13px] font-medium text-muted">
                      ID {profile.id}
                    </span>
                    <span className="rounded-full bg-blue-low px-2.5 py-1 text-[11px] font-semibold text-[#3F4759]">
                      {userRoleLabel(profile.role)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#D9E3FB] px-2.5 py-1 text-[11px] font-semibold text-[#00522C]">
                      <span className="h-1.5 w-1.5 rounded-full bg-green" />
                      {accountStatusLabel(profile.is_active)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted">
                    <span>
                      {userCountryLabel(profile.country)} {userCountryFlag(profile.country)}
                    </span>
                    <span>Inscrit le {formatJoined(profile.date_joined)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    Statut issu de <span className="font-medium">is_active</span> — pas une preuve de connexion récente.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-xl bg-blue-low px-4 py-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#76777D]">Nœud Lightning</p>
                  <p className="mt-0.5 text-xs font-semibold text-navy">{USER_LND_NODE_UNAVAILABLE}</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-muted">{USER_DETAIL_SOURCE_NOTE}</p>
          </section>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-5">
              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <SectionTitle>Informations du compte</SectionTitle>
                  <span className="rounded bg-[#DFE8FF] px-2 py-0.5 text-[11px] font-semibold uppercase text-muted">
                    Lecture seule
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Prénom">{profile.first_name.trim() || "—"}</Field>
                  <Field label="Nom">{profile.last_name.trim() || "—"}</Field>
                </div>
                <Field label="E-mail">
                  <span className="flex flex-wrap items-center gap-2">
                    {profile.email}
                    <span className="rounded-full bg-blue-low px-2 py-0.5 text-[10px] font-semibold text-muted">
                      Contact déclaré
                    </span>
                  </span>
                </Field>
                <Field label="Téléphone">
                  {profile.phone_number.trim() ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono">{profile.phone_number}</span>
                      <span className="rounded-full bg-[#FFDCBF]/60 px-2 py-0.5 text-[10px] font-semibold text-[#8C4F00]">
                        Non vérifié — Sandbox
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Pays de résidence">
                    {userCountryLabel(profile.country)} {userCountryFlag(profile.country)}
                  </Field>
                  <Field label="Type de profil">{userRoleLabel(profile.role)}</Field>
                </div>
                <Field label="Identifiant interne">
                  <span className="mt-0.5 inline-block select-all rounded-lg bg-blue-low px-2.5 py-1.5 font-mono text-xs text-muted">
                    {profile.id}
                  </span>
                </Field>
                <div className="mt-3 rounded-xl bg-blue-low p-4 text-xs text-muted">
                  <p className="font-semibold text-navy">Protocole de sécurité &amp; confidentialité</p>
                  <p className="mt-1">{USER_SECURITY_NOTE}</p>
                </div>
              </section>

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <SectionTitle>Préférences &amp; canaux</SectionTitle>
                <p className="mt-4 rounded-lg bg-blue-low px-3 py-4 text-sm text-muted">{USER_PREFERENCES_UNAVAILABLE}</p>
                <div className="mt-4 rounded-xl bg-blue-low p-4 text-xs text-muted">
                  <p className="font-semibold text-navy">Canaux Lightning dédiés</p>
                  <p className="mt-1">
                    Aucun canal Lightning dédié. Aucune langue, devise ou notification n&apos;est persistée sur le
                    modèle User.
                  </p>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-7">
              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <SectionTitle>Historique des opérations</SectionTitle>
                  <span className="rounded-full bg-[#FFDCBF]/50 px-2.5 py-1 text-[11px] font-semibold text-[#8C4F00]">
                    Environnement Regtest
                  </span>
                </div>
                <p className="rounded-lg bg-blue-low px-3 py-8 text-center text-sm text-muted">{USER_HISTORY_UNAVAILABLE}</p>
                <p className="mt-3 text-[11px] text-muted">
                  Les listes GET /payments/ et /transfers/ n&apos;exposent pas le propriétaire. Elles ne sont pas
                  interrogées ici pour éviter un mélange d&apos;utilisateurs.
                </p>
              </section>

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <SectionTitle>Journaux d&apos;audit &amp; sécurité</SectionTitle>
                  <span className="rounded bg-blue-low px-2 py-0.5 text-[11px] font-semibold uppercase text-[#76777D]">
                    Traçabilité
                  </span>
                </div>
                <div className="relative pl-6">
                  <div className="absolute bottom-2 left-2.5 top-2 w-0.5 bg-[#D9E3FB]" />
                  <p className="rounded-lg bg-blue-low px-3 py-8 text-sm text-muted">{USER_AUDIT_UNAVAILABLE}</p>
                </div>
                <p className="mt-3 text-[11px] text-muted">
                  Le modèle AuditLog existe en PostgreSQL mais aucun endpoint REST administrateur ne l&apos;expose.
                </p>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
