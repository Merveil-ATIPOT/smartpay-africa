/** Consultation WA.3 — snapshot Django, sans lookup LND ni chiffres Stitch. */

export const TRANSACTIONS_HREF = "/transactions";
export const PAYMENTS_LIST_PATH = "/api/v1/payments/";
export const TRANSFERS_LIST_PATH = "/api/v1/transfers/";
export const SIMULATIONS_LIST_PATH = "/api/v1/transfers/simulations/";
export const TRANSACTIONS_PAGE_SIZE = 7;
export const TRANSACTIONS_LIST_CAP = 100;

export const TRANSACTIONS_SOURCE_NOTE =
  "Snapshot Django des 100 derniers enregistrements par endpoint. Cette page n'interroge pas LND et ne reconcilie pas les factures.";

export const TRANSACTIONS_COMPLIANCE =
  "Les transactions Regtest utilisent exclusivement des bitcoins de test sans valeur monétaire. Les devis et simulations de transfert n'entraînent aucun règlement réel. Aucun transfert Wave, Orange Money ou MTN n'est effectué. Un enregistrement Django n'est pas une preuve LND.";

export type TxSource = "payment" | "transfer" | "simulation";
export type TxKind = "invoice" | "outgoing" | "quote" | "simulation";
export type TxStatusKey =
  | "lnd_recorded"
  | "pending"
  | "expired"
  | "failed"
  | "mock_ack"
  | "simulation"
  | "unpaid_quote";
export type ActivityPeriod = "day" | "week" | "month";
export type CorridorFilter = "all" | "SN" | "CI" | "CG";

export type PaymentSnapshot = {
  id: string;
  amount_sats: number;
  description?: string;
  status: string;
  settlement_mode?: string;
  is_lightning_settled?: boolean;
  lightning_status?: string;
  direction?: string;
  provider_reference?: string;
  encoded_invoice?: string;
  failure_reason?: string;
  expires_at?: string | null;
  created_at: string;
  invoice?: { payment_hash?: string; memo?: string; is_mock?: boolean } | null;
  warnings?: string[];
};

export type TransferSnapshot = {
  id: string;
  public_reference?: string;
  source_country?: string;
  destination_country?: string;
  amount_sats: number;
  amount_local?: string | number | null;
  currency?: string;
  status: string;
  lightning_payment_hash?: string | null;
  lightning_settled_at?: string | null;
  mobile_money_credit_status?: string;
  disclaimer?: string;
  created_at: string;
};

export type SimulationSnapshot = {
  id: number | string;
  source_country?: string;
  destination_country?: string;
  amount_sats: number;
  status: string;
  disclaimer?: string;
  created_at: string;
};

export type TxRow = {
  id: string;
  source: TxSource;
  kind: TxKind;
  kindLabel: string;
  createdAt: string;
  reference: string;
  origin: string;
  destination: string;
  amountSats: number;
  amountLocal: string | null;
  status: TxStatusKey;
  statusLabel: string;
  corridor: string | null;
  warning: string;
};

export type TxFilters = {
  query: string;
  kind: "all" | TxKind;
  status: "all" | TxStatusKey;
  corridor: CorridorFilter;
};

export const KIND_FILTERS = [
  { id: "all" as const, label: "Tous les types" },
  { id: "invoice" as const, label: "Facture Lightning (Django)" },
  { id: "outgoing" as const, label: "Paiement sortant (Django)" },
  { id: "quote" as const, label: "Devis / transfert (Django)" },
  { id: "simulation" as const, label: "Simulation de transfert" },
];

export const STATUS_FILTERS = [
  { id: "all" as const, label: "Tous les statuts" },
  { id: "lnd_recorded" as const, label: "Règlement LND enregistré" },
  { id: "pending" as const, label: "En attente (Django)" },
  { id: "expired" as const, label: "Expiré (Django)" },
  { id: "failed" as const, label: "Échoué (Django)" },
  { id: "mock_ack" as const, label: "Accusé Mock" },
  { id: "simulation" as const, label: "Simulation uniquement" },
  { id: "unpaid_quote" as const, label: "Devis non réglé" },
];

export const CORRIDOR_FILTERS = [
  { id: "all" as const, label: "Tous corridors (si renseigné)" },
  { id: "SN" as const, label: "Sénégal (SN)" },
  { id: "CI" as const, label: "Côte d'Ivoire (CI)" },
  { id: "CG" as const, label: "Congo (CG)" },
];

export const ACTIVITY_PERIODS = [
  { id: "day" as const, label: "Jour" },
  { id: "week" as const, label: "Semaine" },
  { id: "month" as const, label: "Mois" },
];

const UNPAID_TRANSFER = new Set(["draft", "quoted", "ready"]);

export function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

export function shortenHash(value: string, size = 18): string {
  if (value.length <= size) {
    return value;
  }
  const keep = Math.max(4, Math.floor((size - 1) / 2));
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

export function formatStamp(iso: string): { date: string; time: string } {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "—", time: "—" };
  }
  return {
    date: parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
    time: parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

export function paymentStatus(item: PaymentSnapshot): { key: TxStatusKey; label: string } {
  if (item.is_lightning_settled) {
    return { key: "lnd_recorded", label: "Règlement LND enregistré" };
  }
  if (item.status === "expired") {
    return { key: "expired", label: "Expiré (Django)" };
  }
  if (item.status === "failed") {
    return { key: "failed", label: "Échoué (Django)" };
  }
  if (item.status === "confirmed" && item.settlement_mode === "mock") {
    return { key: "mock_ack", label: "Accusé Mock, pas un règlement LND" };
  }
  if (item.status === "confirmed") {
    return { key: "pending", label: "Confirmé métier, LND non prouvé" };
  }
  return { key: "pending", label: "En attente (Django)" };
}

export function normalizePayment(item: PaymentSnapshot): TxRow {
  const incoming = item.direction === "incoming";
  const status = paymentStatus(item);
  const reference =
    item.invoice?.payment_hash || item.provider_reference || item.id;
  return {
    id: `pay-${item.id}`,
    source: "payment",
    kind: incoming ? "invoice" : "outgoing",
    kindLabel: incoming ? "Facture Lightning (Django)" : "Paiement sortant (Django)",
    createdAt: item.created_at,
    reference,
    origin: incoming ? "Facture entrante" : "Paiement sortant",
    destination: incoming ? "Nœud Regtest (non nommé)" : "Destination non exposée par l'API",
    amountSats: item.amount_sats,
    amountLocal: null,
    status: status.key,
    statusLabel: status.label,
    corridor: null,
    warning: item.warnings?.[0] ?? "Statut issu de PostgreSQL, non revérifié auprès de LND.",
  };
}

export function normalizeTransfer(item: TransferSnapshot): TxRow {
  const settled = Boolean(item.lightning_settled_at);
  let status: TxStatusKey = "unpaid_quote";
  let statusLabel = "Devis / préparation, non réglé";
  if (settled) {
    status = "lnd_recorded";
    statusLabel = "Règlement LND enregistré (transfert)";
  } else if (item.status === "failed") {
    status = "failed";
    statusLabel = "Échoué (Django)";
  } else if (item.status === "payment_pending" || item.status === "pending_reconciliation") {
    status = "pending";
    statusLabel = "En attente (Django)";
  } else if (UNPAID_TRANSFER.has(item.status)) {
    status = "unpaid_quote";
    statusLabel = "Devis non réglé";
  }
  const local =
    item.amount_local != null && item.amount_local !== ""
      ? `${item.amount_local} ${item.currency ?? ""}`.trim()
      : null;
  return {
    id: `tr-${item.id}`,
    source: "transfer",
    kind: "quote",
    kindLabel: "Devis / transfert (Django)",
    createdAt: item.created_at,
    reference: item.public_reference || item.lightning_payment_hash || item.id,
    origin: item.source_country ?? "—",
    destination: item.destination_country ?? "—",
    amountSats: item.amount_sats,
    amountLocal: local,
    status,
    statusLabel,
    corridor: item.source_country ?? item.destination_country ?? null,
    warning: item.disclaimer ?? "Crédit Mobile Money simulé. Aucun opérateur réel n'est contacté.",
  };
}

export function normalizeSimulation(item: SimulationSnapshot): TxRow {
  return {
    id: `sim-${item.id}`,
    source: "simulation",
    kind: "simulation",
    kindLabel: "Simulation de transfert",
    createdAt: item.created_at,
    reference: `sim-${item.id}`,
    origin: item.source_country ?? "—",
    destination: item.destination_country ?? "—",
    amountSats: item.amount_sats,
    amountLocal: null,
    status: "simulation",
    statusLabel: "Simulation uniquement",
    corridor: item.source_country ?? item.destination_country ?? null,
    warning: item.disclaimer ?? "Aucun dépôt FCFA, aucun versement Wave / Orange Money / MTN.",
  };
}

export function mergeSnapshots(
  payments: readonly PaymentSnapshot[],
  transfers: readonly TransferSnapshot[],
  simulations: readonly SimulationSnapshot[],
): TxRow[] {
  return [
    ...payments.map(normalizePayment),
    ...transfers.map(normalizeTransfer),
    ...simulations.map(normalizeSimulation),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function filterRows(rows: readonly TxRow[], filters: TxFilters): TxRow[] {
  const query = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.kind !== "all" && row.kind !== filters.kind) {
      return false;
    }
    if (filters.status !== "all" && row.status !== filters.status) {
      return false;
    }
    if (filters.corridor !== "all") {
      if (row.corridor !== filters.corridor && row.origin !== filters.corridor && row.destination !== filters.corridor) {
        return false;
      }
    }
    if (!query) {
      return true;
    }
    const haystack = `${row.reference} ${row.id} ${row.kindLabel} ${row.origin} ${row.destination}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function paginateRows(rows: readonly TxRow[], page: number, size = TRANSACTIONS_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const safe = Math.min(Math.max(1, page), pages);
  const start = (safe - 1) * size;
  return { rows: rows.slice(start, start + size), page: safe, pages, total: rows.length };
}

export function computeKpis(rows: readonly TxRow[]) {
  const invoices = rows.filter((row) => row.kind === "invoice").length;
  const settled = rows.filter((row) => row.status === "lnd_recorded").length;
  const expiredOrFailed = rows.filter((row) => row.status === "expired" || row.status === "failed").length;
  const simulations = rows.filter((row) => row.source === "simulation" || row.status === "unpaid_quote").length;
  return { invoices, settled, expiredOrFailed, simulations, total: rows.length };
}

export type ActivityPoint = { label: string; invoices: number; settled: number };

function dayKey(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function activitySeries(rows: readonly TxRow[], period: ActivityPeriod, now = new Date()): ActivityPoint[] {
  const length = period === "day" ? 1 : period === "week" ? 7 : 30;
  const start = addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), 1 - length);
  const buckets = new Map<string, ActivityPoint>();
  for (let index = 0; index < length; index += 1) {
    const date = addDays(start, index);
    const key = date.toISOString().slice(0, 10);
    const label =
      period === "month"
        ? date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
        : date.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" });
    buckets.set(key, { label, invoices: 0, settled: 0 });
  }
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    const bucket = buckets.get(key);
    if (!bucket) {
      continue;
    }
    if (row.kind === "invoice") {
      bucket.invoices += 1;
    }
    if (row.status === "lnd_recorded") {
      bucket.settled += 1;
    }
  }
  return [...buckets.values()];
}

export function chartPoints(series: readonly ActivityPoint[], height = 180) {
  const max = Math.max(1, ...series.map((point) => Math.max(point.invoices, point.settled)));
  const step = series.length > 1 ? 600 / (series.length - 1) : 0;
  return series.map((point, index) => ({
    x: series.length === 1 ? 300 : index * step,
    invoicesY: height - (point.invoices / max) * (height - 20),
    settledY: height - (point.settled / max) * (height - 20),
  }));
}

export function polyline(points: readonly { x: number; y: number }[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function area(points: readonly { x: number; y: number }[], height = 180): string {
  if (!points.length) {
    return "";
  }
  const body = points.map((point) => `${point.x},${point.y}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  return `${first.x},${height} ${body} ${last.x},${height}`;
}

export function exportCsv(rows: readonly TxRow[]): string {
  const header = [
    "source",
    "created_at",
    "reference",
    "kind",
    "origin",
    "destination",
    "amount_sats",
    "amount_local",
    "status",
    "warning",
  ];
  const lines = rows.map((row) =>
    [
      row.source,
      row.createdAt,
      row.reference,
      row.kindLabel,
      row.origin,
      row.destination,
      String(row.amountSats),
      row.amountLocal ?? "",
      row.statusLabel,
      row.warning,
    ]
      .map((cell) => `"${cell.replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function stitchKpisAreNotUsed(): boolean {
  return true;
}

export function liveLndLookupEnabled(): boolean {
  return false;
}
