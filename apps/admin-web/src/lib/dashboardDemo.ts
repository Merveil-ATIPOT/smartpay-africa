/** Jeu d'illustration W02. Aucune lecture PostgreSQL, LND ou API de supervision. */

export const DASHBOARD_DEMO_SOURCE = "dashboardDemo" as const;

export const DASHBOARD_DEMO_DISCLAIMER =
  "Données de démonstration — Aucune valeur monétaire réelle.";

export const DASHBOARD_ILLUSTRATIVE_LABEL = "Données illustratives";

export const DASHBOARD_SEARCH_UNAVAILABLE = "Recherche indisponible dans WA.2";

export const DASHBOARD_FX_NOTE =
  "Contre-valeur indicative fictive · aucun taux BTC/FCFA réel n'est appliqué.";

export type ActivityPeriod = "week" | "month" | "global";

export type DemoOpType = "merchant" | "transfer" | "swap" | "p2p" | "invoice";

export type DemoOpStatus = "done" | "running" | "fictive" | "invoice";

export type DemoOperation = {
  id: string;
  timeLabel: string;
  clock: string;
  reference: string;
  type: DemoOpType;
  typeLabel: string;
  detail: string;
  amountSats: number;
  amountFcfa: number;
  status: DemoOpStatus;
  corridor: string;
  corridorMeta: string;
};

export type ActivityPoint = {
  label: string;
  sats: number;
  fcfa: number;
};

export type CorridorShare = {
  id: "sn" | "ci" | "cg" | "other";
  flag: string;
  label: string;
  percent: number;
  count: number;
  barClass: string;
};

export type ServiceProbe = {
  id: "lnd" | "django" | "liquidity" | "indexer";
  name: string;
  detail: string;
  statusLabel: string;
  footnote: string;
};

export const DEMO_OP_STATUS_LABEL: Record<DemoOpStatus, string> = {
  done: "Simulation terminée",
  running: "Simulation en cours",
  fictive: "Scénario fictif",
  invoice: "Facture de démonstration",
};

export const DEMO_OP_FILTERS: { id: "all" | DemoOpType; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "merchant", label: "Encaissement" },
  { id: "transfer", label: "Transfert" },
  { id: "invoice", label: "Facture" },
  { id: "p2p", label: "P2P" },
  { id: "swap", label: "Swap" },
];

export const DEMO_STATS = {
  users: { value: 1_248, hint: "Comptes illustratifs · SN, CI, CG, BJ", extra: "78 ajouts fictifs / sem." },
  merchants: { value: 84, hint: "Boutiques de démonstration locale", extra: "Taux d'acceptation illustratif" },
  transfers: { value: 3_892, hint: "Flux simulés · Dakar ⇄ Abidjan / Brazza", extra: "48,6 M FCFA · 112,4 M sats (fictifs)" },
  capacity: { valueLabel: "12,5 M", unit: "SATS", hint: "Capacité illustrative, non lue depuis LND", localPct: 66, remotePct: 34 },
} as const;

export const DEMO_CORRIDORS: readonly CorridorShare[] = [
  { id: "sn", flag: "SN", label: "Sénégal (Dakar Hub)", percent: 48, count: 599, barClass: "bg-navy" },
  { id: "ci", flag: "CI", label: "Côte d'Ivoire (Abidjan)", percent: 31, count: 387, barClass: "bg-orange" },
  { id: "cg", flag: "CG", label: "Congo-Brazzaville (CEMAC)", percent: 14, count: 175, barClass: "bg-green" },
  { id: "other", flag: "UEMOA", label: "Bénin, Togo et autres", percent: 7, count: 87, barClass: "bg-muted" },
];

export const DEMO_CORRIDOR_NOTE =
  "Dakar ⇄ Abidjan : 62 % des transferts simulés. Répartition fictive, non issue de Django.";

export const DEMO_SERVICES: readonly ServiceProbe[] = [
  {
    id: "lnd",
    name: "LND",
    detail: "Nœud du banc d'essai",
    statusLabel: "Non vérifié",
    footnote: "Aucune sonde LND dans WA.2",
  },
  {
    id: "django",
    name: "API Django REST",
    detail: "Backend du portail",
    statusLabel: "Non vérifié",
    footnote: "GET /api/v1/health/ existe mais n'est pas interrogé ici",
  },
  {
    id: "liquidity",
    name: "Passerelle de liquidité",
    detail: "Non déployée dans ce banc",
    statusLabel: "Donnée illustrative",
    footnote: "Pas de passerelle Wave / Orange Money",
  },
  {
    id: "indexer",
    name: "Indexeur / explorateur",
    detail: "Non déployé dans ce banc",
    statusLabel: "Donnée illustrative",
    footnote: "Aucun Esplora ni hauteur de bloc affichée",
  },
];

export const OPERATIONS_PAGE_SIZE = 6;

export const DEMO_OPERATIONS: readonly DemoOperation[] = [
  {
    id: "op-01",
    timeLabel: "Il y a 42 s",
    clock: "14:28:11",
    reference: "sim_inv_almadies_4_demo_not_a_chain_hash",
    type: "invoice",
    typeLabel: "Encaissement marchand",
    detail: "Boutique Almadies #4 · spécimen",
    amountSats: 85_000,
    amountFcfa: 36_800,
    status: "invoice",
    corridor: "Dakar (SN)",
    corridorMeta: "TPE de démonstration",
  },
  {
    id: "op-02",
    timeLabel: "Il y a 3 min",
    clock: "14:25:40",
    reference: "sim_tx_dakar_abidjan_89a4ef1_local",
    type: "transfer",
    typeLabel: "Transfert transfrontalier",
    detail: "Scénario Wave ⇄ Orange Money · non exécuté",
    amountSats: 150_000,
    amountFcfa: 65_000,
    status: "done",
    corridor: "Dakar → Abidjan",
    corridorMeta: "SN → CI · simulation",
  },
  {
    id: "op-03",
    timeLabel: "Il y a 7 min",
    clock: "14:21:18",
    reference: "sim_swap_canal_4_rebalance_demo",
    type: "swap",
    typeLabel: "Submarine swap",
    detail: "Rebalancement fictif canal #4",
    amountSats: 500_000,
    amountFcfa: 216_500,
    status: "running",
    corridor: "Nœud Dakar (illustratif)",
    corridorMeta: "Aucun mempool consulté",
  },
  {
    id: "op-04",
    timeLabel: "Il y a 12 min",
    clock: "14:16:02",
    reference: "sim_p2p_fatou_amadou_11209ab",
    type: "p2p",
    typeLabel: "Démo P2P",
    detail: "Micro-paiement illustratif",
    amountSats: 12_400,
    amountFcfa: 5_370,
    status: "fictive",
    corridor: "Dakar (SN)",
    corridorMeta: "Portefeuille de démonstration",
  },
  {
    id: "op-05",
    timeLabel: "Il y a 19 min",
    clock: "14:09:44",
    reference: "sim_tx_abidjan_brazza_441fa22_local",
    type: "transfer",
    typeLabel: "Transfert transfrontalier",
    detail: "Remittance diaspora · test local",
    amountSats: 320_000,
    amountFcfa: 138_560,
    status: "done",
    corridor: "Abidjan → Brazzaville",
    corridorMeta: "CI → CG · simulation",
  },
  {
    id: "op-06",
    timeLabel: "Il y a 25 min",
    clock: "14:03:10",
    reference: "sim_inv_plateau_abidjan_demo_receipt",
    type: "merchant",
    typeLabel: "Encaissement marchand",
    detail: "Café Plateau Abidjan · spécimen",
    amountSats: 4_000,
    amountFcfa: 1_730,
    status: "invoice",
    corridor: "Abidjan (CI)",
    corridorMeta: "Terminal de démonstration",
  },
  {
    id: "op-07",
    timeLabel: "Il y a 41 min",
    clock: "13:47:02",
    reference: "sim_tx_dakar_brazza_77c0e21_local",
    type: "transfer",
    typeLabel: "Transfert transfrontalier",
    detail: "Corridor SN → CG · non payé",
    amountSats: 90_000,
    amountFcfa: 39_000,
    status: "done",
    corridor: "Dakar → Brazzaville",
    corridorMeta: "SN → CG · simulation",
  },
  {
    id: "op-08",
    timeLabel: "Il y a 1 h",
    clock: "13:28:44",
    reference: "sim_inv_teranga_caisse_a_specimen",
    type: "merchant",
    typeLabel: "Encaissement marchand",
    detail: "Épicerie Teranga · caisse A",
    amountSats: 25_000,
    amountFcfa: 10_800,
    status: "invoice",
    corridor: "Dakar (SN)",
    corridorMeta: "Boutique fictive",
  },
  {
    id: "op-09",
    timeLabel: "Il y a 2 h",
    clock: "12:19:08",
    reference: "sim_p2p_awa_mariama_demo_only",
    type: "p2p",
    typeLabel: "Démo P2P",
    detail: "Transfert interne illustratif",
    amountSats: 7_500,
    amountFcfa: 3_250,
    status: "fictive",
    corridor: "Dakar (SN)",
    corridorMeta: "Comptes de démonstration",
  },
  {
    id: "op-10",
    timeLabel: "Il y a 3 h",
    clock: "11:08:33",
    reference: "sim_swap_inbound_liquidity_story",
    type: "swap",
    typeLabel: "Submarine swap",
    detail: "Scénario de liquidité, non exécuté",
    amountSats: 210_000,
    amountFcfa: 90_900,
    status: "fictive",
    corridor: "Banc d'essai",
    corridorMeta: "Aucune chaîne consultée",
  },
  {
    id: "op-11",
    timeLabel: "Hier",
    clock: "18:42:00",
    reference: "sim_tx_abidjan_dakar_return_demo",
    type: "transfer",
    typeLabel: "Transfert transfrontalier",
    detail: "Retour CI → SN · simulation",
    amountSats: 64_000,
    amountFcfa: 27_700,
    status: "done",
    corridor: "Abidjan → Dakar",
    corridorMeta: "CI → SN · simulation",
  },
  {
    id: "op-12",
    timeLabel: "Hier",
    clock: "09:15:22",
    reference: "sim_inv_yoff_market_demo_qr",
    type: "invoice",
    typeLabel: "Encaissement marchand",
    detail: "Marché Yoff · QR spécimen",
    amountSats: 18_000,
    amountFcfa: 7_790,
    status: "invoice",
    corridor: "Dakar (SN)",
    corridorMeta: "QR non payable",
  },
];

const WEEK_SERIES: ActivityPoint[] = [
  { label: "Lun", sats: 1_120_000, fcfa: 480_000 },
  { label: "Mar", sats: 1_680_000, fcfa: 710_000 },
  { label: "Mer", sats: 1_240_000, fcfa: 540_000 },
  { label: "Jeu", sats: 2_410_000, fcfa: 1_020_000 },
  { label: "Ven", sats: 1_950_000, fcfa: 840_000 },
  { label: "Sam", sats: 2_820_000, fcfa: 1_210_000 },
  { label: "Dim", sats: 3_600_000, fcfa: 1_610_000 },
];

const MONTH_SERIES: ActivityPoint[] = [
  { label: "S1", sats: 6_200_000, fcfa: 2_680_000 },
  { label: "S2", sats: 7_450_000, fcfa: 3_210_000 },
  { label: "S3", sats: 5_880_000, fcfa: 2_540_000 },
  { label: "S4", sats: 8_920_000, fcfa: 3_860_000 },
];

const GLOBAL_SERIES: ActivityPoint[] = [
  { label: "Juil.", sats: 18_400_000, fcfa: 7_960_000 },
  { label: "Août", sats: 21_100_000, fcfa: 9_120_000 },
  { label: "Sept.", sats: 19_600_000, fcfa: 8_470_000 },
  { label: "Oct.", sats: 28_400_000, fcfa: 12_280_000 },
];

export const ACTIVITY_PERIODS: { id: ActivityPeriod; label: string }[] = [
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
  { id: "global", label: "Global" },
];

export function activitySeries(period: ActivityPeriod): readonly ActivityPoint[] {
  if (period === "month") {
    return MONTH_SERIES;
  }
  if (period === "global") {
    return GLOBAL_SERIES;
  }
  return WEEK_SERIES;
}

export function activityTotals(period: ActivityPeriod): { sats: number; fcfa: number } {
  return activitySeries(period).reduce(
    (acc, point) => {
      acc.sats += point.sats;
      acc.fcfa += point.fcfa;
      return acc;
    },
    { sats: 0, fcfa: 0 },
  );
}

export function scaleIndependent(values: readonly number[], height: number, pad = 12): number[] {
  const max = Math.max(...values, 1);
  const usable = Math.max(height - pad * 2, 1);
  return values.map((value) => height - pad - (value / max) * usable);
}

export function chartPoints(
  series: readonly ActivityPoint[],
  width = 600,
  height = 180,
): {
  sats: { x: number; y: number }[];
  fcfa: { x: number; y: number }[];
  satsMax: number;
  fcfaMax: number;
} {
  const n = series.length;
  const padX = 8;
  const xs = series.map((_, index) => padX + (index * (width - padX * 2)) / Math.max(n - 1, 1));
  const satsY = scaleIndependent(
    series.map((point) => point.sats),
    height,
  );
  const fcfaY = scaleIndependent(
    series.map((point) => point.fcfa),
    height,
  );
  return {
    sats: xs.map((x, index) => ({ x, y: satsY[index] ?? height })),
    fcfa: xs.map((x, index) => ({ x, y: fcfaY[index] ?? height })),
    satsMax: Math.max(...series.map((point) => point.sats), 1),
    fcfaMax: Math.max(...series.map((point) => point.fcfa), 1),
  };
}

export function polylinePath(points: readonly { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

export function areaPath(points: readonly { x: number; y: number }[], baseline: number): string {
  if (points.length === 0) {
    return "";
  }
  const first = points[0];
  const last = points[points.length - 1];
  return `${polylinePath(points)} L${last.x.toFixed(1)},${baseline} L${first.x.toFixed(1)},${baseline} Z`;
}

export function formatDemoNumber(value: number): string {
  return value.toLocaleString("fr-FR");
}

export function shortenReference(value: string, size = 18): string {
  if (value.length <= size) {
    return value;
  }
  const keep = Math.max(6, Math.floor((size - 1) / 2));
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

export function looksLikeConfirmedChainId(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.startsWith("lnbc") || lower.startsWith("lnbcrt") || /^[0-9a-f]{64}$/i.test(value);
}

export function filterOperations(
  operations: readonly DemoOperation[],
  type: "all" | DemoOpType,
): DemoOperation[] {
  if (type === "all") {
    return [...operations];
  }
  return operations.filter((item) => item.type === type);
}

export function paginateOperations(
  operations: readonly DemoOperation[],
  page: number,
  pageSize = OPERATIONS_PAGE_SIZE,
): { rows: DemoOperation[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(operations.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * pageSize;
  return {
    rows: operations.slice(start, start + pageSize),
    page: safePage,
    pages,
    total: operations.length,
  };
}

export function exportOperationsJson(operations: readonly DemoOperation[], nowIso = "2026-10-30T00:00:00Z"): string {
  return `${JSON.stringify(
    {
      source: DASHBOARD_DEMO_SOURCE,
      disclaimer: DASHBOARD_DEMO_DISCLAIMER,
      fxNote: DASHBOARD_FX_NOTE,
      generatedAt: nowIso,
      realBackend: false,
      realLightning: false,
      operations: operations.map((item) => ({
        id: item.id,
        reference: item.reference,
        type: item.typeLabel,
        status: DEMO_OP_STATUS_LABEL[item.status],
        amountSats: item.amountSats,
        amountFcfaIllustrative: item.amountFcfa,
        corridor: item.corridor,
      })),
    },
    null,
    2,
  )}\n`;
}

export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
