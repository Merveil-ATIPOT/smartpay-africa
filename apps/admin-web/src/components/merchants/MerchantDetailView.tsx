"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "../AuthProvider";
import { PortalApiError, portalErrorMessage } from "../../lib/errors";
import {
  EMPTY_MERCHANT_PAYMENTS,
  EMPTY_PAYMENTS_SUMMARY,
  MERCHANT_AUDIT_UNAVAILABLE,
  MERCHANT_DETAIL_ACCESS_DENIED,
  MERCHANT_DETAIL_BANNER,
  MERCHANT_DETAIL_SOURCE_NOTE,
  MERCHANT_DETAIL_UNAVAILABLE,
  MERCHANT_PAYMENT_DETAIL_UNAVAILABLE,
  MERCHANT_PDF_UNAVAILABLE,
  MERCHANT_QR_UNAVAILABLE,
  MERCHANT_SETTINGS_UNAVAILABLE,
  MERCHANT_SUCCESS_RATE_UNAVAILABLE,
  buildMerchantExport,
  lightningStatusLabel,
  merchantExportFilename,
  merchantPaymentStatusLabel,
  parseMerchantRouteId,
  shortPaymentId,
  type AdminMerchantDetail,
} from "../../lib/merchantDetail";
import { fetchAdminMerchant } from "../../lib/merchantsApi";
import { merchantOwnerName, merchantStatusLabel } from "../../lib/merchantsDirectory";
import { ADMIN_MERCHANTS_HREF } from "../../lib/nav";
import { downloadJson, formatJoined, userCountryFlag, userCountryLabel } from "../../lib/userDetail";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs text-muted">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium text-navy">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-lg font-semibold text-navy">{children}</h2>;
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

export function MerchantDetailView() {
  const params = useParams<{ id: string }>();
  const { logout } = useAuth();
  const routeId = parseMerchantRouteId(params.id);
  const [detail, setDetail] = useState<AdminMerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(routeId == null);

  const load = useCallback(async () => {
    if (routeId == null) {
      setMissing(true);
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setMissing(false);
    try {
      setDetail(await fetchAdminMerchant(routeId));
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        logout();
        return;
      }
      setDetail(null);
      if (err instanceof PortalApiError && err.status === 404) {
        setMissing(true);
        return;
      }
      if (err instanceof PortalApiError && err.status === 403) {
        setError(MERCHANT_DETAIL_ACCESS_DENIED);
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
    if (!detail) {
      return;
    }
    downloadJson(merchantExportFilename(detail.id), buildMerchantExport(detail));
  }

  const summary = detail?.payments_summary ?? EMPTY_PAYMENTS_SUMMARY;
  const payments = detail?.recent_payments ?? [];

  return (
    <div className="mx-auto max-w-[1280px] pb-8">
      <div className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-[#FFDCBF]/50 px-4 py-2.5 shadow-sm">
        <p className="truncate text-xs font-medium text-[#2D1600]">{MERCHANT_DETAIL_BANNER}</p>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-orange">Regtest</span>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Link
          href={ADMIN_MERCHANTS_HREF}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-low px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-[#E8EEFF] hover:text-navy"
        >
          ← Retour à la liste des marchands
        </Link>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={exportFiche}
            disabled={!detail}
            className="rounded-lg bg-white px-4 py-2 text-xs font-medium text-navy shadow-sm disabled:opacity-40"
          >
            Exporter la fiche (JSON)
          </button>
          <button
            type="button"
            disabled
            title={MERCHANT_PDF_UNAVAILABLE}
            className="rounded-lg bg-white px-4 py-2 text-xs font-medium text-muted shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Générer un relevé (PDF)
          </button>
          <button
            type="button"
            disabled
            title={MERCHANT_SETTINGS_UNAVAILABLE}
            className="rounded-lg bg-white px-4 py-2 text-xs font-medium text-muted shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Paramètres de la boutique
          </button>
        </div>
      </div>

      {loading ? <p className="mb-6 text-sm text-muted">Chargement de la fiche Django…</p> : null}
      {error ? <p className="mb-6 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}

      {missing || (!loading && !detail && !error) ? (
        <section className="rounded-xl bg-white p-6 shadow-card">
          <h1 className="font-display text-[28px] font-bold tracking-tight text-navy">Détail d&apos;un marchand</h1>
          <p className="mt-2 text-sm text-muted">Identifiant demandé : {params.id ?? "—"}</p>
          <p className="mt-3 rounded-lg bg-blue-low px-3 py-3 text-sm text-navy">{MERCHANT_DETAIL_UNAVAILABLE}</p>
        </section>
      ) : null}

      {detail ? (
        <>
          <section className="relative mb-8 overflow-hidden rounded-xl bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
              <div className="flex min-w-0 items-start gap-4 sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M4 10h16l-1 10H5z" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-[28px] font-bold tracking-tight text-navy">{detail.display_name}</h1>
                    <span className="rounded-full bg-[#DFE8FF] px-2.5 py-0.5 font-mono text-[13px] font-medium text-muted">
                      ID {detail.id}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(detail.status)}`}>
                      {merchantStatusLabel(detail.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted">
                    <span>
                      {userCountryLabel(detail.country)} {userCountryFlag(detail.country)}
                    </span>
                    <span>
                      Responsable : <span className="font-semibold text-navy">{merchantOwnerName(detail.owner)}</span>
                    </span>
                    <span>Créé le {formatJoined(detail.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-xl bg-blue-low px-4 py-2">
                <span className="h-3 w-3 rounded-full bg-orange" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-navy">Environnement Regtest</p>
                  <p className="mt-0.5 text-xs text-muted">Bac à sable Dakar Bitcoin Hack 2026</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-muted">{MERCHANT_DETAIL_SOURCE_NOTE}</p>
          </section>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="flex flex-col gap-6 lg:col-span-5">
              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <SectionTitle>Informations de la boutique</SectionTitle>
                  <span className="rounded bg-[#DFE8FF] px-2 py-0.5 text-[11px] font-semibold uppercase text-muted">
                    Lecture seule
                  </span>
                </div>
                <Field label="Nom commercial">{detail.display_name}</Field>
                <Field label="Raison sociale">{detail.legal_name}</Field>
                <Field label="Responsable">{merchantOwnerName(detail.owner)}</Field>
                <Field label="E-mail du propriétaire">
                  <span className="font-mono text-xs">{detail.owner.email}</span>
                </Field>
                <Field label="Pays">
                  {userCountryLabel(detail.country)} {userCountryFlag(detail.country)}
                </Field>
                <Field label="N° d'enregistrement">{detail.registration_number.trim() || "Non renseigné"}</Field>
                <Field label="Statut">{merchantStatusLabel(detail.status)}</Field>
                <Field label="Mise à jour">{formatJoined(detail.updated_at)}</Field>
                <p className="mt-4 rounded-xl bg-blue-low p-3 text-xs text-muted">
                  Téléphone, adresse, catégorie, terminal POS et KYC ne sont pas portés par le modèle Merchant.
                </p>
              </section>

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <SectionTitle>Code QR spécimen</SectionTitle>
                  <span className="rounded bg-[#FFDCBF] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#6B3B00]">
                    Non payable
                  </span>
                </div>
                <div className="rounded-xl bg-blue-low px-4 py-10 text-center">
                  <p className="text-sm font-medium text-navy">{MERCHANT_QR_UNAVAILABLE}</p>
                  <p className="mt-2 text-xs text-muted">Aucun QR n&apos;est généré pour éviter une confusion avec une facture Lightning.</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled className="flex-1 rounded-lg bg-blue-low px-3 py-2 text-xs font-semibold text-muted disabled:opacity-40">
                    Télécharger gabarit QR
                  </button>
                  <button type="button" disabled className="flex-1 rounded-lg bg-blue-low px-3 py-2 text-xs font-semibold text-muted disabled:opacity-40">
                    Copier URL
                  </button>
                </div>
              </section>

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <SectionTitle>Statut des fonctionnalités</SectionTitle>
                  <span className="rounded bg-blue-low px-2 py-0.5 text-[11px] font-semibold uppercase text-muted">
                    Bac à sable
                  </span>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between rounded-lg bg-blue-low px-3 py-2">
                    <span className="text-sm text-navy">Fiche PostgreSQL</span>
                    <span className="rounded-full bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">Disponible</span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-blue-low px-3 py-2">
                    <span className="text-sm text-navy">Paiements liés</span>
                    <span className="rounded-full bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">Lecture FK</span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-blue-low px-3 py-2">
                    <span className="text-sm text-navy">QR Lightning marchand</span>
                    <span className="rounded-full bg-[#DFE8FF] px-2 py-0.5 text-[11px] font-semibold text-muted">Indisponible</span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-blue-low px-3 py-2">
                    <span className="text-sm text-navy">Wave / Orange Money / MTN</span>
                    <span className="rounded-full bg-[#FFDCBF] px-2 py-0.5 text-[11px] font-semibold text-[#6B3B00]">Non connecté</span>
                  </li>
                  <li className="flex items-center justify-between rounded-lg bg-blue-low px-3 py-2">
                    <span className="text-sm text-navy">Passerelle bancaire</span>
                    <span className="rounded-full bg-[#FFDCBF] px-2 py-0.5 text-[11px] font-semibold text-[#6B3B00]">Non connectée</span>
                  </li>
                </ul>
              </section>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-7">
              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <SectionTitle>Résumé des opérations</SectionTitle>
                  <span className="rounded-full bg-[#FFDCBF]/50 px-2.5 py-1 text-[11px] font-semibold text-[#8C4F00]">
                    Paiements de cette boutique
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <article className="rounded-xl bg-blue-low p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Paiements liés</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-navy">{summary.linked.toLocaleString("fr-FR")}</p>
                    <p className="mt-1 text-[11px] text-muted">Relation merchant uniquement</p>
                  </article>
                  <article className="rounded-xl bg-blue-low p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Confirmés Django</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-navy">{summary.django_confirmed.toLocaleString("fr-FR")}</p>
                    <p className="mt-1 text-[11px] text-muted">Statut métier — pas une preuve LND</p>
                  </article>
                  <article className="rounded-xl bg-blue-low p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Échoués / expirés</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-navy">{summary.failed_or_expired.toLocaleString("fr-FR")}</p>
                    <p className="mt-1 text-[11px] text-muted">Statuts failed et expired</p>
                  </article>
                </div>
                <p className="mt-3 text-xs text-muted">
                  En attente : {summary.pending.toLocaleString("fr-FR")} · Réglés Lightning :{" "}
                  {summary.lightning_settled.toLocaleString("fr-FR")} · Sats liés : {summary.amount_sats_linked.toLocaleString("fr-FR")} ·{" "}
                  {MERCHANT_SUCCESS_RATE_UNAVAILABLE}
                </p>
              </section>

              <section className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex flex-col gap-2 p-6 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <SectionTitle>Historique des encaissements</SectionTitle>
                  <span className="rounded bg-blue-low px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {payments.length} / {summary.linked} affiché(s)
                  </span>
                </div>
                {payments.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[46rem] text-left text-sm">
                      <thead className="bg-blue-low text-[10px] font-semibold uppercase tracking-wider text-muted">
                        <tr>
                          <th className="whitespace-nowrap px-3 py-2.5">Date</th>
                          <th className="whitespace-nowrap px-3 py-2.5">Identifiant</th>
                          <th className="px-3 py-2.5">Description</th>
                          <th className="whitespace-nowrap px-3 py-2.5 text-right">Sats</th>
                          <th className="whitespace-nowrap px-3 py-2.5">Statut Django</th>
                          <th className="whitespace-nowrap px-3 py-2.5">Lightning</th>
                          <th className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((row) => (
                          <tr key={row.id} className="border-t border-line">
                            <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">{formatJoined(row.created_at)}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted">{shortPaymentId(row.id)}</td>
                            <td className="max-w-[12rem] truncate px-3 py-2.5">{row.description.trim() || "—"}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium">{row.amount_sats.toLocaleString("fr-FR")}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-xs">{merchantPaymentStatusLabel(row.status)}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-xs">{lightningStatusLabel(row.lightning_status)}</td>
                            <td className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right">
                              <button
                                type="button"
                                disabled
                                title={MERCHANT_PAYMENT_DETAIL_UNAVAILABLE}
                                className="inline-flex min-h-8 min-w-[4.5rem] items-center justify-center rounded-lg bg-blue-low px-3 py-1.5 text-xs font-semibold text-muted disabled:opacity-60"
                              >
                                Voir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mx-6 mb-6 rounded-lg bg-blue-low px-3 py-8 text-center text-sm text-muted">{EMPTY_MERCHANT_PAYMENTS}</p>
                )}
              </section>

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <SectionTitle>Journal des événements</SectionTitle>
                  <span className="rounded bg-blue-low px-2 py-0.5 text-[11px] font-semibold uppercase text-muted">Audit</span>
                </div>
                <p className="rounded-lg bg-blue-low px-3 py-8 text-center text-sm text-muted">{MERCHANT_AUDIT_UNAVAILABLE}</p>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
