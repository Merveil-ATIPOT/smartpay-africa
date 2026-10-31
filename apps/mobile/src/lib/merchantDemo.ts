import { DEMO_FCFA_PER_BTC, fcfaToSats, satsToFcfa } from "./transferConversion";

export const MERCHANT_DEMO_ENTRY_LABEL = "Démo Espace Marchand";

export const MERCHANT_DEMO_SHOP_BANNER =
  "Boutique Teranga — Démonstration locale non liée à votre compte";

export const MERCHANT_DEMO_DISCLAIMER =
  "Espace Marchand en démonstration locale. Aucune facture Lightning, aucun send_payment, aucun POST /confirm/.";

export const MERCHANT_QR_DISCLAIMER =
  "QR de démonstration — non payable. Ce n'est pas une facture BOLT11. Aucun règlement n'est écouté.";

export const MERCHANT_RECEIPT_DISCLAIMER =
  "Spécimen de démonstration. Aucune préimage réelle, aucun lookup LND, aucun paiement confirmé.";

export const DEMO_SHOP = {
  name: "Épicerie Moderne Teranga",
  id: "MERCH-DKR-8842",
  city: "Dakar, Sénégal",
  till: "Caisse A · Poste 01",
  tillName: "Caisse A",
  tillPost: "Poste 01",
} as const;

export const DEMO_TILLS = [
  {
    id: "A",
    name: "Caisse A",
    post: "Poste 01",
    active: true,
    status: "Poste actif · démonstration",
    terminal: "Terminal fictif · aucune connexion réelle",
  },
  {
    id: "B",
    name: "Caisse B",
    post: "Poste 02",
    active: false,
    status: "Hors ligne · démonstration",
    terminal: "Aucun terminal physique associé",
  },
] as const;

export type MerchantUnit = "FCFA" | "SATS";
export type MerchantSaleStatus = "settled" | "specimen" | "demo" | "pending" | "void";
export type MerchantSaleFilter = "all" | "today" | "pending" | "refunds";
export type MerchantAnalyticsRange = "today" | "7d" | "30d" | "all";
export type MerchantTabKey = "home" | "sales" | "history" | "shop";

/** Rubriques stables du navigateur marchand. Facture / QR / reçu restent un flux secondaire. */
export const MERCHANT_TAB_SCREENS = {
  home: "MerchantHome",
  sales: "MerchantSalesAnalytics",
  history: "MerchantSalesHistory",
  shop: "MerchantShop",
} as const;

export type MerchantSale = {
  id: string;
  label: string;
  amountFcfa: number;
  status: MerchantSaleStatus;
  timeLabel: string;
  daysAgo: number;
  note: string;
  specimen: boolean;
};

export const DEMO_SALES: readonly MerchantSale[] = [
  {
    id: "SN-8924",
    label: "Commande #SN-8924",
    amountFcfa: 25_000,
    status: "specimen",
    timeLabel: "14:32",
    daysAgo: 0,
    note: "Articles divers · spécimen",
    specimen: true,
  },
  {
    id: "SN-8923",
    label: "Client #428 — Boissons",
    amountFcfa: 4_500,
    status: "demo",
    timeLabel: "13:10",
    daysAgo: 0,
    note: "Opération fictive du jour · non réglée",
    specimen: false,
  },
  {
    id: "SN-8922",
    label: "Client #427 — Épicerie vrac",
    amountFcfa: 28_000,
    status: "demo",
    timeLabel: "11:05",
    daysAgo: 0,
    note: "Opération fictive du jour · non réglée",
    specimen: false,
  },
  {
    id: "SN-8910",
    label: "Table 4 — en attente démo",
    amountFcfa: 6_000,
    status: "pending",
    timeLabel: "Hier",
    daysAgo: 1,
    note: "Statut fictif · pas un paiement Lightning",
    specimen: false,
  },
  {
    id: "SN-8901",
    label: "Annulation démo",
    amountFcfa: 2_000,
    status: "void",
    timeLabel: "Hier",
    daysAgo: 1,
    note: "Remboursement fictif",
    specimen: false,
  },
];

export const DEMO_HOURLY_BARS = [18, 28, 24, 42, 36, 58, 44, 70] as const;

/** Indicateur de démonstration affiché sur M28. Ce n'est pas un total d'encaissements. */
export const TODAY_SALES_FCFA = 145_000;
export const TODAY_DEMO_VOLUME_LABEL = "Indicateur fictif du jour · non encaissé";
export const DEMO_RECEIPT_DATE = "29 octobre 2026 · 14:32 UTC (date fictive)";
export const FICTIVE_OPS_TOTAL_LABEL = "Montant total des opérations fictives";
export const ANALYTICS_DISCLAIMER = "Données fictives — démonstration locale";

export type MerchantShopSettings = {
  defaultExpiryMinutes: 15 | 60;
  tipEnabled: boolean;
  showSats: boolean;
};

const DEFAULT_SHOP_SETTINGS: MerchantShopSettings = {
  defaultExpiryMinutes: 15,
  tipEnabled: false,
  showSats: true,
};

let shopSettings: MerchantShopSettings = { ...DEFAULT_SHOP_SETTINGS };

export function getShopSettings(): MerchantShopSettings {
  return { ...shopSettings };
}

export function setShopSettings(next: Partial<MerchantShopSettings>): MerchantShopSettings {
  shopSettings = { ...shopSettings, ...next };
  return getShopSettings();
}

export function resetShopSettings(): MerchantShopSettings {
  shopSettings = { ...DEFAULT_SHOP_SETTINGS };
  return getShopSettings();
}

export function merchantSatsFromFcfa(amountFcfa: number): number {
  return fcfaToSats(amountFcfa);
}

export function merchantFcfaFromSats(amountSats: number): number {
  return satsToFcfa(amountSats);
}

export function applyKeypadDigit(amount: number, digit: string, maxLen = 9): number {
  if (!/^(?:\d|00)$/.test(digit)) {
    return amount;
  }
  const current = Number.isInteger(amount) && amount > 0 ? String(amount) : "0";
  let next = current;
  if (current === "0") {
    next = digit === "00" ? "0" : digit;
  } else if (current.length + digit.length <= maxLen) {
    next = current + digit;
  }
  return parseInt(next, 10) || 0;
}

export function applyKeypadBackspace(amount: number): number {
  const current = String(Math.max(0, Math.floor(amount)));
  if (current.length <= 1) {
    return 0;
  }
  return parseInt(current.slice(0, -1), 10) || 0;
}

export function createDemoReference(now = Date.now()): string {
  return `SPA-DEMO-${now.toString(16).slice(-8).toUpperCase()}`;
}

export function buildDemoQrPayload(reference: string, amountFcfa: number): string {
  return `smartpay-demo:${DEMO_SHOP.id}:${reference}:${amountFcfa}XOF`;
}

export function looksLikeBolt11(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/^lightning:/, "");
  return (
    normalized.startsWith("lnbcrt") ||
    normalized.startsWith("lnbc") ||
    normalized.startsWith("lntbs") ||
    normalized.startsWith("lntb")
  );
}

export function saleStatusLabel(status: MerchantSaleStatus): string {
  switch (status) {
    case "settled":
      return "Réglé fictivement";
    case "specimen":
      return "Spécimen · non réglé";
    case "demo":
      return "Non réglé (démo)";
    case "pending":
      return "En attente";
    case "void":
      return "Annulé";
    default:
      return "Démonstration";
  }
}

export function isFictivelySettled(sale: MerchantSale): boolean {
  return sale.status === "settled";
}

export function saleStatusTone(status: MerchantSaleStatus): "settled" | "pending" | "unpaid" | "void" {
  if (status === "settled") {
    return "settled";
  }
  if (status === "pending") {
    return "pending";
  }
  if (status === "void") {
    return "void";
  }
  return "unpaid";
}

export function filterSales(
  sales: readonly MerchantSale[],
  query: string,
  filter: MerchantSaleFilter,
): MerchantSale[] {
  const needle = query.trim().toLowerCase();
  return sales.filter((sale) => {
    if (filter === "today" && sale.daysAgo !== 0) {
      return false;
    }
    if (filter === "pending" && sale.status !== "pending") {
      return false;
    }
    if (filter === "refunds" && sale.status !== "void") {
      return false;
    }
    if (!needle) {
      return true;
    }
    return (
      sale.id.toLowerCase().includes(needle) ||
      sale.label.toLowerCase().includes(needle) ||
      sale.note.toLowerCase().includes(needle)
    );
  });
}

export function getSaleById(id: string): MerchantSale | undefined {
  return DEMO_SALES.find((sale) => sale.id === id);
}

export function salesInRange(
  sales: readonly MerchantSale[],
  range: MerchantAnalyticsRange,
): MerchantSale[] {
  return sales.filter((sale) => {
    if (range === "all") {
      return true;
    }
    if (range === "today") {
      return sale.daysAgo === 0;
    }
    if (range === "7d") {
      return sale.daysAgo <= 6;
    }
    return sale.daysAgo <= 29;
  });
}

export type MerchantStats = {
  settledFcfa: number;
  settledCount: number;
  pendingFcfa: number;
  pendingCount: number;
  voidFcfa: number;
  voidCount: number;
  unpaidFcfa: number;
  unpaidCount: number;
  totalOpsFcfa: number;
  totalCount: number;
};

export function computeMerchantStats(sales: readonly MerchantSale[]): MerchantStats {
  return sales.reduce<MerchantStats>(
    (acc, sale) => {
      acc.totalOpsFcfa += sale.amountFcfa;
      acc.totalCount += 1;
      if (isFictivelySettled(sale)) {
        acc.settledFcfa += sale.amountFcfa;
        acc.settledCount += 1;
        return acc;
      }
      if (sale.status === "pending") {
        acc.pendingFcfa += sale.amountFcfa;
        acc.pendingCount += 1;
        return acc;
      }
      if (sale.status === "void") {
        acc.voidFcfa += sale.amountFcfa;
        acc.voidCount += 1;
        return acc;
      }
      acc.unpaidFcfa += sale.amountFcfa;
      acc.unpaidCount += 1;
      return acc;
    },
    {
      settledFcfa: 0,
      settledCount: 0,
      pendingFcfa: 0,
      pendingCount: 0,
      voidFcfa: 0,
      voidCount: 0,
      unpaidFcfa: 0,
      unpaidCount: 0,
      totalOpsFcfa: 0,
      totalCount: 0,
    },
  );
}

export function dailyActivityBars(
  sales: readonly MerchantSale[],
  days = 7,
): { label: string; amountFcfa: number; count: number }[] {
  return Array.from({ length: days }, (_, index) => {
    const daysAgo = days - 1 - index;
    const bucket = sales.filter((sale) => sale.daysAgo === daysAgo);
    return {
      label: daysAgo === 0 ? "Auj." : daysAgo === 1 ? "J-1" : `J-${daysAgo}`,
      amountFcfa: bucket.reduce((sum, sale) => sum + sale.amountFcfa, 0),
      count: bucket.length,
    };
  });
}

export function statusBreakdown(sales: readonly MerchantSale[]): {
  status: MerchantSaleStatus;
  label: string;
  count: number;
  amountFcfa: number;
}[] {
  const order: MerchantSaleStatus[] = ["settled", "demo", "specimen", "pending", "void"];
  return order
    .map((status) => {
      const bucket = sales.filter((sale) => sale.status === status);
      return {
        status,
        label: saleStatusLabel(status),
        count: bucket.length,
        amountFcfa: bucket.reduce((sum, sale) => sum + sale.amountFcfa, 0),
      };
    })
    .filter((item) => item.count > 0);
}

export const DEMO_RATE_LINE = `Taux de démo · 1 BTC ≈ ${DEMO_FCFA_PER_BTC.toLocaleString("fr-FR")} FCFA · non contractuel`;
