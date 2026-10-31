import type { TransferExecutionResult } from "@smartpay/contracts";

import { formatSats } from "./format";
import { getCorridor, type DestinationCode, type OperatorId } from "./transferCorridors";
import {
  DEMO_PROOF_STAMP,
  DEMO_RESULT_DISCLAIMER,
  type DemoPreview,
} from "./transferDraft";
import { SIMULATED_MM_DISCLAIMER } from "./transferSafety";

export const UNCONFIRMED_PAYMENT_LINE =
  "Aucun paiement Lightning confirmé. Aucun FCFA réel envoyé.";

export const PDF_UNCONFIRMED_TITLE = "Justificatif de préparation de transfert";
export const PDF_CONFIRMED_TITLE = "Relevé de règlement Lightning Regtest";
export const PDF_DEMO_TITLE = "Justificatif de démonstration locale";
export const NO_PAYMENT_BANNER = "AUCUN PAIEMENT CONFIRMÉ";
export const REGTEST_NOT_PROOF = "DÉMONSTRATION REGTEST — NON VALABLE COMME PREUVE DE PAIEMENT";
export const DEMO_NOT_SERVER_RECEIPT = "DÉMONSTRATION LOCALE — CE N'EST PAS UN REÇU SERVEUR";
export const DATE_UNAVAILABLE = "Date serveur indisponible";
export const REGTEST_LINE = "Réseau Bitcoin Lightning Regtest · simulation · hors Mainnet";

const FORBIDDEN_SUCCESS = ["Paiement réussi", "Fonds envoyés", "Crédit effectué"] as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isUserShareCancel(error: unknown): boolean {
  if (error == null) {
    return false;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /cancell?ed|dismiss|did not share|user did not share|sharing canceled/i.test(message);
}

export function formatServerDate(value: string | null | undefined): string | null {
  if (!value || !value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes} UTC`;
}

export function countryLabel(code: string): string {
  return getCorridor(code as DestinationCode)?.name ?? code;
}

export function operatorLabel(country: string, operator: string): string {
  const corridor = getCorridor(country as DestinationCode);
  return corridor?.operators.find((item) => item.id === (operator as OperatorId))?.label ?? operator;
}

export function lightningReceiptStatus(result: TransferExecutionResult): string {
  if (result.lightning_confirmed) {
    const parts = ["Lightning confirmé selon le serveur"];
    if (result.alice_status) {
      parts.push(`Alice ${result.alice_status}`);
    }
    if (result.bob_status) {
      parts.push(`Bob ${result.bob_status}`);
    }
    return parts.join(" · ");
  }
  return UNCONFIRMED_PAYMENT_LINE;
}

export function mobileMoneyReceiptStatus(result: TransferExecutionResult): string {
  switch (result.mobile_money_credit_status) {
    case "simulated":
      return SIMULATED_MM_DISCLAIMER;
    case "failed":
      return "Crédit Mobile Money en échec (simulation) — aucun FCFA réel envoyé.";
    default:
      return "Aucun crédit Mobile Money.";
  }
}

export function lndFeeLabel(paid: number | null | undefined): string {
  if (paid == null) {
    return "Non disponibles";
  }
  return `${formatSats(paid)} sat`;
}

export function serverShareMessage(result: TransferExecutionResult): string {
  const lines = [
    "SmartPay Africa",
    REGTEST_LINE,
    `Référence : ${result.public_reference}`,
    `Pays : ${countryLabel(result.destination_country)}`,
    `Opérateur : ${operatorLabel(result.destination_country, result.operator)}`,
    `Montant : ${formatSats(result.amount_local)} FCFA`,
    `Montant Lightning : ${formatSats(result.invoice_amount_sats)} sats`,
    `Statut Lightning : ${lightningReceiptStatus(result)}`,
    `Statut Mobile Money : ${mobileMoneyReceiptStatus(result)}`,
  ];
  if (!result.lightning_confirmed) {
    lines.push(UNCONFIRMED_PAYMENT_LINE);
  }
  return lines.join("\n");
}

export function demoShareMessage(preview: DemoPreview): string {
  return [
    "SmartPay Africa",
    DEMO_NOT_SERVER_RECEIPT,
    DEMO_PROOF_STAMP,
    preview.disclaimer || DEMO_RESULT_DISCLAIMER,
    `Référence locale : ${preview.localReference}`,
    `Pays : ${countryLabel(preview.destinationCode)}`,
    `Opérateur : ${operatorLabel(preview.destinationCode, preview.operator)}`,
    `Montant : ${formatSats(preview.quote.amountFcfa)} FCFA`,
    `Montant : ${formatSats(preview.quote.amountSats)} sats`,
    REGTEST_LINE,
    UNCONFIRMED_PAYMENT_LINE,
  ].join("\n");
}

export function receiptHtml(result: TransferExecutionResult, createdAt?: string | null): string {
  const confirmed = result.lightning_confirmed;
  const title = confirmed ? PDF_CONFIRMED_TITLE : PDF_UNCONFIRMED_TITLE;
  const settled = formatServerDate(result.lightning_settled_at);
  const created = formatServerDate(createdAt);
  const dateRows: string[] = [];
  if (settled) {
    dateRows.push(row("Date de règlement", settled));
  }
  if (created) {
    dateRows.push(row("Date de création", created));
  }
  if (!settled && !created) {
    dateRows.push(row("Date", DATE_UNAVAILABLE));
  }

  const banners = confirmed
    ? banner("REGTEST", REGTEST_LINE)
    : `${banner("ALERT", NO_PAYMENT_BANNER)}${banner("WARN", REGTEST_NOT_PROOF)}`;

  return document(title, `
    ${banners}
    ${row("Référence", result.public_reference)}
    ${dateRows.join("")}
    ${row("Pays", countryLabel(result.destination_country))}
    ${row("Opérateur", operatorLabel(result.destination_country, result.operator))}
    ${row("Montant", `${formatSats(result.amount_local)} FCFA`)}
    ${row("Montant Lightning", `${formatSats(result.invoice_amount_sats)} sats`)}
    ${row("Frais de démonstration", `${formatSats(result.demo_fee_sats)} sat`)}
    ${row("Frais LND réels", lndFeeLabel(result.lnd_fee_sats_paid))}
    ${row("Statut Lightning", lightningReceiptStatus(result))}
    ${row("Statut Mobile Money", mobileMoneyReceiptStatus(result))}
    ${row("Réseau", REGTEST_LINE)}
    ${note(confirmed
      ? "Document établi à partir des données serveur. Ce n'est pas une preuve cryptographique. Aucune préimage ni hash Lightning n'est publié."
      : "Document de préparation. Aucun paiement Lightning confirmé. Aucun FCFA réel envoyé. Non valable comme preuve de paiement.")}
  `);
}

export function demoReceiptHtml(preview: DemoPreview): string {
  const created = formatServerDate(preview.createdAt);
  return document(PDF_DEMO_TITLE, `
    ${banner("ALERT", DEMO_NOT_SERVER_RECEIPT)}
    ${banner("WARN", NO_PAYMENT_BANNER)}
    ${banner("WARN", DEMO_PROOF_STAMP)}
    ${row("Référence locale", preview.localReference)}
    ${row("Date locale", created ?? DATE_UNAVAILABLE)}
    ${row("Pays", countryLabel(preview.destinationCode))}
    ${row("Opérateur", operatorLabel(preview.destinationCode, preview.operator))}
    ${row("Montant", `${formatSats(preview.quote.amountFcfa)} FCFA`)}
    ${row("Montant", `${formatSats(preview.quote.amountSats)} sats`)}
    ${row("Frais de démonstration", `${formatSats(preview.quote.feeSats)} sat`)}
    ${row("Frais LND réels", "Non applicables · démo locale")}
    ${row("Statut Lightning", UNCONFIRMED_PAYMENT_LINE)}
    ${row("Statut Mobile Money", "Aucun crédit Mobile Money.")}
    ${row("Réseau", REGTEST_LINE)}
    ${note(preview.disclaimer || DEMO_RESULT_DISCLAIMER)}
  `);
}

export function containsForbiddenSuccess(text: string): boolean {
  return FORBIDDEN_SUCCESS.some((phrase) => text.includes(phrase));
}

function document(title: string, body: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; color: #141B2C; background: #ffffff; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .bolt { width: 36px; height: 36px; border-radius: 10px; background: #141B2C; color: #FE9821; font-size: 20px; text-align: center; line-height: 36px; }
  .name { font-weight: 800; font-size: 20px; }
  h1 { font-size: 22px; margin: 0 0 16px; }
  .row { margin: 0 0 10px; }
  .label { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #667085; }
  .value { font-size: 15px; font-weight: 700; margin-top: 2px; word-break: break-word; }
  .banner { border-radius: 10px; padding: 10px 12px; margin: 0 0 10px; font-size: 12px; font-weight: 800; }
  .ALERT { background: #FEF0C7; color: #7A2E0E; }
  .WARN { background: #FFDCBF; color: #6B3B00; }
  .REGTEST { background: #F0F3FF; color: #141B2C; }
  .note { margin-top: 18px; font-size: 12px; color: #667085; line-height: 1.45; }
</style>
</head>
<body>
  <div class="brand"><div class="bolt">⚡</div><div class="name">SmartPay Africa</div></div>
  <h1>${safeTitle}</h1>
  ${body}
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<div class="row"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`;
}

function banner(tone: "ALERT" | "WARN" | "REGTEST", text: string): string {
  return `<div class="banner ${tone}">${escapeHtml(text)}</div>`;
}

function note(text: string): string {
  return `<p class="note">${escapeHtml(text)}</p>`;
}
