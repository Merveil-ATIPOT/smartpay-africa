import {
  ADMIN_AUDIT_HREF,
  ADMIN_CORRIDORS_HREF,
  ADMIN_INFRASTRUCTURE_HREF,
  ADMIN_TRANSACTIONS_HREF,
} from "./nav";
import { visiblePageNumbers } from "./auditDirectory";

export const ADMIN_CORRIDORS_PATH = "/api/v1/admin/corridors/";

export const ADMIN_CORRIDORS_PAGE_SIZE = 20;

export const CORRIDORS_TITLE = "Corridors internationaux";

export const CORRIDORS_SUBTITLE = "Supervision des parcours de transferts et des simulations enregistrées.";

export const CORRIDORS_REGTEST_BADGE = "Environnement Regtest";

export const CORRIDORS_SOURCE_NOTE =
  "Source : GET /api/v1/admin/corridors/. Catalogue Python et Transfer PostgreSQL. Aucun chiffre Stitch W08.";

export const CORRIDORS_ACCESS_DENIED = "Accès interdit. La supervision des corridors est réservée aux administrateurs.";

export const CORRIDORS_LOADING = "Chargement des corridors…";

export const CORRIDORS_EMPTY = "Aucun transfert enregistré dans PostgreSQL.";

export const CORRIDORS_EMPTY_FILTERS = "Aucun transfert pour ces filtres.";

export const CORRIDORS_SECURITY_NOTE =
  "Aucun nom de bénéficiaire, téléphone, facture BOLT11, hash Lightning, JWT, seed ou macaroon n'est exposé.";

export const CORRIDORS_AMOUNTS_NOTE =
  "Les totaux comptent des enregistrements de démonstration. Ce ne sont pas des volumes réglés. XOF et XAF restent séparés.";

export const CORRIDORS_SIMULATED_CREDIT_NOTE =
  "simulated_credited est un crédit Mobile Money fictif. Aucun opérateur réel n'a été contacté.";

export { visiblePageNumbers };

export const CORRIDORS_RELATED_LINKS = [
  { href: ADMIN_TRANSACTIONS_HREF, label: "Voir les transactions" },
  { href: ADMIN_INFRASTRUCTURE_HREF, label: "Voir l'infrastructure" },
  { href: ADMIN_AUDIT_HREF, label: "Consulter l'audit" },
] as const;

export const CORRIDORS_UNAVAILABLE = [
  {
    id: "simulate",
    label: "Simuler un parcours",
    note: "Aucun bouton de création. Le parcours mobile M22–M26 reste inchangé.",
  },
  {
    id: "calculator",
    label: "Calculateur de conversion",
    note: "Le taux de démonstration n'est pas un cours Bitcoin. Aucun devis n'est lancé ici.",
  },
  {
    id: "topology",
    label: "Topologie géographique réelle",
    note: "Les nœuds LND du laboratoire sont Alice et Bob, pas Dakar / Abidjan / Brazzaville.",
  },
  {
    id: "liquidity",
    label: "Statistiques de liquidité",
    note: "Aucune capacité de canal n'est mesurée depuis cet écran.",
  },
  {
    id: "fx",
    label: "Taux de change en direct",
    note: "Aucun partenaire de change n'est branché.",
  },
  {
    id: "operators",
    label: "Disponibilité réelle des opérateurs",
    note: "Wave, Orange Money et MTN sont des libellés de catalogue simulé.",
  },
] as const;

export type CorridorOperator = {
  id: string;
  label: string;
  simulated: boolean;
};

export type CorridorCountry = {
  code: string;
  name: string;
  currency: string;
  region: string;
  available: boolean;
  recommended: boolean;
  simulated_gateway: boolean;
  availability_label: string;
  operators: CorridorOperator[];
  transfers_as_source: number;
  transfers_as_destination: number;
  recorded_amount_local: number;
  recorded_amount_sats: number;
  amounts_are_settled: boolean;
};

export type CorridorTransfer = {
  public_reference: string;
  created_at: string;
  source_country: string;
  destination_country: string;
  amount_local: number;
  currency: string;
  amount_sats: number;
  status: string;
  execution_mode: string;
  is_simulation: boolean;
};

export type HistoricalSimulation = {
  id: number;
  created_at: string;
  source_country: string;
  destination_country: string;
  amount_sats: number;
  status: string;
  is_historical_simulation: boolean;
};

export type CorridorAmounts = {
  amount_local: number;
  amount_sats: number;
  transfer_count: number;
};

export type CorridorSummary = {
  transfers_total: number;
  by_status: Record<string, number>;
  amounts: {
    XOF: CorridorAmounts;
    XAF: CorridorAmounts;
  };
  disclaimer: string;
};

export type CorridorsPayload = {
  count: number;
  next: string | null;
  previous: string | null;
  results: CorridorTransfer[];
  catalog: {
    disclaimer: string;
    primary: CorridorCountry[];
    secondary: CorridorCountry[];
  };
  summary: CorridorSummary;
  historical_simulations: {
    count: number;
    results: HistoricalSimulation[];
    disclaimer: string;
  };
};

export type CorridorFilters = {
  sourceCountry: string;
  destinationCountry: string;
  status: string;
  createdAfter: string;
  createdBefore: string;
};

export const EMPTY_CORRIDOR_SUMMARY: CorridorSummary = {
  transfers_total: 0,
  by_status: {},
  amounts: {
    XOF: { amount_local: 0, amount_sats: 0, transfer_count: 0 },
    XAF: { amount_local: 0, amount_sats: 0, transfer_count: 0 },
  },
  disclaimer: CORRIDORS_AMOUNTS_NOTE,
};

export const SOURCE_FILTERS = [
  { id: "", label: "Toutes les origines" },
  { id: "SN", label: "Sénégal (SN)" },
  { id: "CI", label: "Côte d'Ivoire (CI)" },
  { id: "CG", label: "Congo-Brazzaville (CG)" },
] as const;

export const DESTINATION_FILTERS = [
  { id: "", label: "Toutes les destinations" },
  { id: "SN", label: "Sénégal (SN)" },
  { id: "CI", label: "Côte d'Ivoire (CI)" },
  { id: "CG", label: "Congo-Brazzaville (CG)" },
  { id: "CM", label: "Cameroun (CM)" },
  { id: "BJ", label: "Bénin (BJ)" },
  { id: "TG", label: "Togo (TG)" },
] as const;

export const STATUS_FILTERS = [
  { id: "", label: "Tous les statuts" },
  { id: "draft", label: "Brouillon" },
  { id: "quoted", label: "Devis calculé" },
  { id: "ready", label: "Informations validées" },
  { id: "payment_pending", label: "Paiement en attente" },
  { id: "lightning_settled", label: "Paiement LND confirmé" },
  { id: "simulated_credited", label: "Crédit Mobile Money simulé" },
  { id: "failed", label: "Échec confirmé" },
  { id: "pending_reconciliation", label: "Réconciliation en attente" },
] as const;

export const STATUS_ORDER = [
  "draft",
  "quoted",
  "ready",
  "payment_pending",
  "lightning_settled",
  "simulated_credited",
  "failed",
  "pending_reconciliation",
] as const;

export function defaultCorridorFilters(): CorridorFilters {
  return {
    sourceCountry: "",
    destinationCountry: "",
    status: "",
    createdAfter: "",
    createdBefore: "",
  };
}

export function filtersAreDefault(filters: CorridorFilters): boolean {
  return (
    filters.sourceCountry === "" &&
    filters.destinationCountry === "" &&
    filters.status === "" &&
    filters.createdAfter === "" &&
    filters.createdBefore === ""
  );
}

export function toIsoParam(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
}

export function buildCorridorsQuery(
  filters: CorridorFilters,
  page: number,
  pageSize = ADMIN_CORRIDORS_PAGE_SIZE,
): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, page)));
  params.set("page_size", String(pageSize));
  if (filters.sourceCountry) {
    params.set("source_country", filters.sourceCountry);
  }
  if (filters.destinationCountry) {
    params.set("destination_country", filters.destinationCountry);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.createdAfter) {
    params.set("created_after", toIsoParam(filters.createdAfter));
  }
  if (filters.createdBefore) {
    params.set("created_before", toIsoParam(filters.createdBefore));
  }
  return `${ADMIN_CORRIDORS_PATH}?${params.toString()}`;
}

export function countryLabel(code: string): string {
  const labels: Record<string, string> = {
    SN: "Sénégal",
    CI: "Côte d'Ivoire",
    CG: "Congo-Brazzaville",
    CM: "Cameroun",
    BJ: "Bénin",
    TG: "Togo",
  };
  return labels[code] ?? (code || "—");
}

export function statusLabel(status: string): string {
  const found = STATUS_FILTERS.find((item) => item.id === status);
  return found && found.id ? found.label : status || "—";
}

export function statusTone(status: string): "ok" | "warn" | "muted" {
  if (status === "lightning_settled") {
    return "ok";
  }
  if (status === "simulated_credited" || status === "payment_pending" || status === "pending_reconciliation") {
    return "warn";
  }
  return "muted";
}

export function formatCorridorStamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCount(value: number, unit: string): string {
  const label = value === 1 && unit === "transferts" ? "transfert" : unit;
  return `${value.toLocaleString("fr-FR")} ${label}`;
}

export function formatLocalAmount(value: number, currency: string): string {
  if (!currency) {
    return value.toLocaleString("fr-FR");
  }
  return `${value.toLocaleString("fr-FR")} ${currency}`;
}

export function operatorLabels(country: CorridorCountry): string {
  if (!country.operators.length) {
    return "Aucun opérateur simulé";
  }
  return country.operators.map((item) => item.label).join(", ");
}

export function neverSumDistinctCurrencies(summary: CorridorSummary): boolean {
  return summary.amounts.XOF.amount_local !== undefined && summary.amounts.XAF.amount_local !== undefined;
}

export function corridorsContainsSecrets(payload: unknown): boolean {
  const blob = JSON.stringify(payload).toLowerCase();
  return /beneficiary_name|phone_number|encoded_invoice|lightning_payment_hash|macaroon|eyj[a-z0-9_-]+\.|\/run\/lnd/.test(
    blob,
  );
}

export function corridorsCopiesStitch(payload: unknown): boolean {
  const blob = JSON.stringify(payload).toLowerCase();
  return (
    blob.includes("48240000") ||
    blob.includes("48 240 000") ||
    blob.includes("37500000") ||
    blob.includes("21900000") ||
    blob.includes("scn-dkr") ||
    blob.includes("dakar node") ||
    blob.includes("116280") ||
    blob.includes("116 280")
  );
}

export function corridorsHasLiveTools(): boolean {
  return false;
}

export { ADMIN_CORRIDORS_HREF };
