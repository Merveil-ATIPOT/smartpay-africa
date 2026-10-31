"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import type { UserProfile } from "@smartpay/contracts";

import { useAuth } from "../AuthProvider";
import { UserAvatar } from "../users/UserAvatar";
import { ME_PATH, portalApi } from "../../lib/api";
import { PortalApiError, portalErrorMessage } from "../../lib/errors";
import { fetchInfrastructure } from "../../lib/infrastructureApi";
import type { InfrastructureSnapshot } from "../../lib/infrastructure";
import {
  SETTINGS_ACCESS_DENIED,
  SETTINGS_ENVIRONMENT_UNAVAILABLE,
  SETTINGS_IDENTITY_UNAVAILABLE,
  SETTINGS_INFRASTRUCTURE_HREF,
  SETTINGS_LOADING,
  SETTINGS_REGTEST_BADGE,
  SETTINGS_SECURITY_NOTE,
  SETTINGS_SOURCE_NOTE,
  SETTINGS_SUBTITLE,
  SETTINGS_TITLE,
  SETTINGS_UNAVAILABLE_PREFERENCES,
  SETTINGS_UNAVAILABLE_SECURITY,
  SETTINGS_VALUE_ABSENT,
  djangoAvailabilityLabel,
  postgresAvailabilityLabel,
  settingsCheckedAt,
  settingsIdentity,
  settingsNodeLabel,
  settingsNodeTone,
} from "../../lib/settingsDirectory";

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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-navy">{value}</p>
    </div>
  );
}

function UnavailableRow({ label, note }: { label: string; note: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-blue-low px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy">{label}</p>
        <p className="text-[11px] text-muted">{note}</p>
      </div>
      <Badge tone="muted">Indisponible</Badge>
    </li>
  );
}

export function SettingsView() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [snapshot, setSnapshot] = useState<InfrastructureSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setIdentityError(null);
    setEnvironmentError(null);
    const [meResult, infraResult] = await Promise.allSettled([
      portalApi.request<UserProfile>(ME_PATH, { method: "GET" }),
      fetchInfrastructure(),
    ]);
    if (meResult.status === "rejected") {
      const err = meResult.reason;
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
        return;
      }
      setProfile(null);
      if (err instanceof PortalApiError && err.status === 403) {
        setIdentityError(SETTINGS_ACCESS_DENIED);
      } else {
        setIdentityError(portalErrorMessage(err));
      }
    } else {
      setProfile(meResult.value);
    }
    if (infraResult.status === "rejected") {
      const err = infraResult.reason;
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
        return;
      }
      setSnapshot(null);
      if (err instanceof PortalApiError && err.status === 403) {
        setEnvironmentError(SETTINGS_ACCESS_DENIED);
      } else {
        setEnvironmentError(portalErrorMessage(err));
      }
    } else {
      setSnapshot(infraResult.value);
    }
    setLoading(false);
  }, [logout]);

  useEffect(() => {
    void load();
  }, [load]);

  const identity = profile ? settingsIdentity(profile) : null;

  return (
    <div className="mx-auto max-w-[1280px] overflow-x-hidden">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-navy">{SETTINGS_TITLE}</h1>
            <span className="rounded-full bg-[#FFDCBF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B3B00]">
              {SETTINGS_REGTEST_BADGE}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{SETTINGS_SUBTITLE}</p>
          <p className="mt-1 text-xs text-muted">{SETTINGS_SOURCE_NOTE}</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy shadow-card">
          Actualiser
        </button>
      </div>

      {loading ? <p className="mb-4 text-sm text-muted">{SETTINGS_LOADING}</p> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="min-w-0 rounded-xl bg-white p-4 shadow-card">
          <h2 className="font-display text-base font-semibold text-navy">Identité administrateur</h2>
          <p className="mt-1 text-[11px] text-muted">Lecture GET /api/v1/me/. Aucune date de connexion, KYC ou 2FA n&apos;est inventée.</p>
          {identityError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{identityError}</p> : null}
          {!loading && !identity && !identityError ? (
            <p className="mt-3 text-sm text-muted">{SETTINGS_IDENTITY_UNAVAILABLE}</p>
          ) : null}
          {identity ? (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar first_name={profile?.first_name ?? ""} last_name={profile?.last_name ?? ""} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy">{identity.displayName ?? SETTINGS_VALUE_ABSENT}</p>
                  <p className="truncate font-mono text-xs text-muted">{identity.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="E-mail" value={identity.email} />
                <Field label="Rôle" value={identity.roleLabel} />
                <Field label="Pays" value={identity.countryLabel} />
                <Field label="Téléphone" value={identity.phone ?? SETTINGS_VALUE_ABSENT} />
              </div>
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-xl bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-navy">Environnement technique</h2>
              <p className="mt-1 text-[11px] text-muted">GET /api/v1/admin/infrastructure/. Connecté n&apos;est pas synchronisé.</p>
            </div>
            <Link href={SETTINGS_INFRASTRUCTURE_HREF} className="rounded-lg bg-blue-low px-3 py-1.5 text-xs font-semibold text-navy">
              Voir l&apos;infrastructure
            </Link>
          </div>
          {environmentError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{environmentError}</p> : null}
          {!loading && !snapshot && !environmentError ? (
            <p className="mt-3 text-sm text-muted">{SETTINGS_ENVIRONMENT_UNAVAILABLE}</p>
          ) : null}
          {snapshot ? (
            <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted">Réseau</dt>
                <dd className="text-sm font-medium text-navy">{snapshot.network}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted">Fournisseur de paiement</dt>
                <dd className="text-sm font-medium text-navy">{snapshot.payment_provider}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted">API Django</dt>
                <dd>
                  <Badge tone={snapshot.django.status === "ok" ? "ok" : "bad"}>{djangoAvailabilityLabel(snapshot.django.status)}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted">PostgreSQL</dt>
                <dd>
                  <Badge tone={snapshot.postgres.status === "up" ? "ok" : "bad"}>{postgresAvailabilityLabel(snapshot.postgres.status)}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted">LND Alice</dt>
                <dd>
                  <Badge tone={settingsNodeTone(snapshot.alice)}>{settingsNodeLabel(snapshot.alice)}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted">LND Bob</dt>
                <dd>
                  <Badge tone={settingsNodeTone(snapshot.bob)}>{settingsNodeLabel(snapshot.bob)}</Badge>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wider text-muted">Dernière vérification</dt>
                <dd className="text-sm text-navy">{settingsCheckedAt(snapshot.checked_at)}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="min-w-0 rounded-xl bg-white p-4 shadow-card">
          <h2 className="font-display text-base font-semibold text-navy">Sécurité du compte</h2>
          <p className="mt-1 text-[11px] text-muted">Aucune action n&apos;est proposée sans API correspondante.</p>
          <ul className="mt-3 space-y-2">
            {SETTINGS_UNAVAILABLE_SECURITY.map((item) => (
              <UnavailableRow key={item.id} label={item.label} note={item.note} />
            ))}
          </ul>
        </section>

        <section className="min-w-0 rounded-xl bg-white p-4 shadow-card">
          <h2 className="font-display text-base font-semibold text-navy">Préférences et notifications</h2>
          <p className="mt-1 text-[11px] text-muted">Fonctionnalités futures. Aucune valeur sauvegardée n&apos;est inventée.</p>
          <ul className="mt-3 space-y-2">
            {SETTINGS_UNAVAILABLE_PREFERENCES.map((item) => (
              <UnavailableRow key={item.id} label={item.label} note={item.note} />
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-4 text-[11px] text-muted">{SETTINGS_SECURITY_NOTE}</p>
    </div>
  );
}
