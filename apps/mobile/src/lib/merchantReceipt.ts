import { formatSats } from "./format";
import {
  ANALYTICS_DISCLAIMER,
  DEMO_RATE_LINE,
  DEMO_RECEIPT_DATE,
  DEMO_SHOP,
  merchantSatsFromFcfa,
  saleStatusLabel,
  type MerchantSale,
} from "./merchantDemo";

export const MERCHANT_SPECIMEN_BANNER = "SPÉCIMEN — NON VALABLE COMME PREUVE DE PAIEMENT";
export const MERCHANT_NO_PAYMENT_LINE = "Aucun paiement Lightning confirmé.";
export const MERCHANT_REGTEST_LINE = "Bitcoin Lightning Regtest · démonstration locale · hors Mainnet";

export type MerchantReceiptShop = {
  name: string;
  id: string;
  city: string;
  till: string;
  tillName: string;
  tillPost: string;
};

export function escapeMerchantHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function merchantReceiptShareMessage(sale: MerchantSale, shop: MerchantReceiptShop = DEMO_SHOP): string {
  return [
    "SmartPay Africa",
    shop.name,
    `Référence fictive : SP-DEMO-${sale.id}`,
    `Montant : ${formatSats(sale.amountFcfa)} FCFA`,
    `Date : ${DEMO_RECEIPT_DATE}`,
    `Statut : ${saleStatusLabel(sale.status)}`,
    "Spécimen — aucun paiement confirmé",
    MERCHANT_REGTEST_LINE,
    MERCHANT_NO_PAYMENT_LINE,
  ].join("\n");
}

export function merchantReceiptHtml(sale: MerchantSale, shop: MerchantReceiptShop = DEMO_SHOP): string {
  const sats = merchantSatsFromFcfa(sale.amountFcfa);
  const title = "Reçu marchand · spécimen";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeMerchantHtml(title)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; color: #141B2C; background: #ffffff; }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .bolt { width: 36px; height: 36px; border-radius: 10px; background: #141B2C; color: #FE9821; font-size: 20px; text-align: center; line-height: 36px; }
  .name { font-weight: 800; font-size: 20px; }
  h1 { font-size: 22px; margin: 0 0 16px; }
  .row { margin: 0 0 10px; }
  .label { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #667085; }
  .value { font-size: 15px; font-weight: 700; margin-top: 2px; word-break: break-word; }
  .banner { border-radius: 10px; padding: 10px 12px; margin: 0 0 10px; font-size: 12px; font-weight: 800; background: #FEF0C7; color: #7A2E0E; }
  .note { margin-top: 18px; font-size: 12px; color: #667085; line-height: 1.45; }
</style>
</head>
<body>
  <div class="brand"><div class="bolt">⚡</div><div class="name">SmartPay Africa</div></div>
  <h1>${escapeMerchantHtml(title)}</h1>
  <div class="banner">${escapeMerchantHtml(MERCHANT_SPECIMEN_BANNER)}</div>
  <div class="banner">${escapeMerchantHtml(MERCHANT_NO_PAYMENT_LINE)}</div>
  ${row("Boutique", shop.name)}
  ${row("Identifiant", shop.id)}
  ${row("Ville", shop.city)}
  ${row("Référence fictive", `SP-DEMO-${sale.id}`)}
  ${row("Date", DEMO_RECEIPT_DATE)}
  ${row("Caisse", shop.tillName)}
  ${row("Poste", shop.tillPost)}
  ${row("Montant", `${formatSats(sale.amountFcfa)} FCFA`)}
  ${row("Équivalent indicatif", `~${formatSats(sats)} sats`)}
  ${row("Statut fictif", saleStatusLabel(sale.status))}
  ${row("Réseau", MERCHANT_REGTEST_LINE)}
  ${row("Taux", DEMO_RATE_LINE)}
  <p class="note">${escapeMerchantHtml(ANALYTICS_DISCLAIMER)}. Illustration uniquement. Pas de préimage, pas de hash Lightning, pas de preuve cryptographique.</p>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<div class="row"><div class="label">${escapeMerchantHtml(label)}</div><div class="value">${escapeMerchantHtml(value)}</div></div>`;
}
