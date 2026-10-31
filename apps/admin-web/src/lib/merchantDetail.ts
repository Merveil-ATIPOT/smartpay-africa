import type { CountryCode } from "@smartpay/contracts";

import { ADMIN_MERCHANTS_PATH, type AdminMerchant, type MerchantOwner, type MerchantStatus } from "./merchantsDirectory";
import { exportContainsSecrets } from "./userDetail";

export const ADMIN_MERCHANT_DETAIL_SOURCE = "GET /api/v1/admin/merchants/{id}/";

export const MERCHANT_DETAIL_BANNER =
  "Consultation PostgreSQL · Banc d'essai Regtest (Dakar Bitcoin Hack 2026)";

export const MERCHANT_DETAIL_SOURCE_NOTE =
  "Source : GET /api/v1/admin/merchants/{id}/. Paiements filtrés sur cette boutique uniquement.";

export const MERCHANT_DETAIL_UNAVAILABLE = "Marchand introuvable.";

export const MERCHANT_DETAIL_ACCESS_DENIED = "Accès interdit. Cette fiche est réservée aux administrateurs.";

export const MERCHANT_QR_UNAVAILABLE = "QR marchand indisponible dans cette version.";

export const MERCHANT_AUDIT_UNAVAILABLE =
  "Journal d'audit indisponible : aucun événement marchand n'est exposé par l'API.";

export const MERCHANT_PDF_UNAVAILABLE = "Relevé PDF indisponible dans cette version.";

export const MERCHANT_SETTINGS_UNAVAILABLE = "Paramètres de la boutique indisponibles (lecture seule).";

export const MERCHANT_PAYMENT_DETAIL_UNAVAILABLE =
  "Fiche paiement non ouverte ici : la consultation unitaire déclencherait une réconciliation LND.";

export const MERCHANT_SUCCESS_RATE_UNAVAILABLE = "Taux de réussite non calculé.";

export const EMPTY_MERCHANT_PAYMENTS = "Aucun paiement lié à cette boutique.";

export type MerchantLightningStatus = "not_applicable" | "pending" | "settled" | "failed" | "expired";

export type MerchantLinkedPayment = {
  id: string;
  amount_sats: number;
  description: string;
  status: string;
  settlement_mode: string;
  is_lightning_settled: boolean;
  lightning_status: MerchantLightningStatus;
  direction: string;
  network: string;
  created_at: string;
  failure_reason: string;
};

export type MerchantPaymentsSummary = {
  linked: number;
  pending: number;
  django_confirmed: number;
  lightning_settled: number;
  failed_or_expired: number;
  amount_sats_linked: number;
};

export type AdminMerchantDetail = AdminMerchant & {
  payments_summary: MerchantPaymentsSummary;
  recent_payments: MerchantLinkedPayment[];
};

export const EMPTY_PAYMENTS_SUMMARY: MerchantPaymentsSummary = {
  linked: 0,
  pending: 0,
  django_confirmed: 0,
  lightning_settled: 0,
  failed_or_expired: 0,
  amount_sats_linked: 0,
};

export function adminMerchantDetailPath(id: number): string {
  return `${ADMIN_MERCHANTS_PATH}${id}/`;
}

export function adminMerchantLookupEnabled(): boolean {
  return true;
}

export function parseMerchantRouteId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

export function merchantPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    created: "Créé",
    pending: "En attente",
    confirmed: "Confirmé (métier)",
    failed: "Échoué",
    expired: "Expiré",
  };
  return labels[status] ?? status;
}

export function lightningStatusLabel(status: MerchantLightningStatus | string): string {
  const labels: Record<string, string> = {
    not_applicable: "Hors Lightning",
    pending: "Lightning en attente",
    settled: "Réglé Lightning",
    failed: "Lightning échoué",
    expired: "Lightning expiré",
  };
  return labels[status] ?? status;
}

export type MerchantDetailExport = {
  source: typeof ADMIN_MERCHANT_DETAIL_SOURCE;
  network: "regtest";
  note: string;
  merchant: {
    id: number;
    legal_name: string;
    display_name: string;
    country: CountryCode;
    registration_number: string;
    status: MerchantStatus;
    created_at: string;
    updated_at: string;
    owner: MerchantOwner;
  };
  payments_summary: MerchantPaymentsSummary;
  recent_payments: Array<{
    id: string;
    amount_sats: number;
    description: string;
    status: string;
    settlement_mode: string;
    is_lightning_settled: boolean;
    lightning_status: MerchantLightningStatus;
    direction: string;
    network: string;
    created_at: string;
  }>;
};

export function buildMerchantExport(detail: AdminMerchantDetail): MerchantDetailExport {
  return {
    source: ADMIN_MERCHANT_DETAIL_SOURCE,
    network: "regtest",
    note: MERCHANT_DETAIL_SOURCE_NOTE,
    merchant: {
      id: detail.id,
      legal_name: detail.legal_name,
      display_name: detail.display_name,
      country: detail.country,
      registration_number: detail.registration_number,
      status: detail.status,
      created_at: detail.created_at,
      updated_at: detail.updated_at,
      owner: {
        id: detail.owner.id,
        email: detail.owner.email,
        first_name: detail.owner.first_name,
        last_name: detail.owner.last_name,
      },
    },
    payments_summary: detail.payments_summary,
    recent_payments: detail.recent_payments.map((row) => ({
      id: row.id,
      amount_sats: row.amount_sats,
      description: row.description,
      status: row.status,
      settlement_mode: row.settlement_mode,
      is_lightning_settled: row.is_lightning_settled,
      lightning_status: row.lightning_status,
      direction: row.direction,
      network: row.network,
      created_at: row.created_at,
    })),
  };
}

export function merchantExportFilename(id: number, now = new Date()): string {
  return `smartpay-w06-merchant-${id}-regtest-${now.toISOString().slice(0, 10)}.json`;
}

export function merchantExportContainsSecrets(payload: unknown): boolean {
  return exportContainsSecrets(payload);
}

export function shortPaymentId(id: string): string {
  return id.replaceAll("-", "").slice(0, 12);
}
