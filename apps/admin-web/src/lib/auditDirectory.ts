export const ADMIN_AUDIT_PATH = "/api/v1/admin/audit/";

export const ADMIN_AUDIT_PAGE_SIZE = 20;

export const AUDIT_TITLE = "Audit & Sécurité";

export const AUDIT_SUBTITLE =
  "Consultation des événements enregistrés dans l'environnement de démonstration SmartPay Africa.";

export const AUDIT_REGTEST_BADGE = "Environnement Regtest — Journal applicatif";

export const AUDIT_SOURCE_NOTE =
  "Source : GET /api/v1/admin/audit/. Lecture seule PostgreSQL. Aucun événement Stitch. Aucun GET /api/v1/payments/{id}/.";

export const AUDIT_ACCESS_DENIED = "Accès interdit. Seul un administrateur peut consulter le journal d'audit.";

export const AUDIT_KPI_UNAVAILABLE = "Indisponible";

export const AUDIT_LOADING = "Chargement du journal d'audit…";

export const AUDIT_EMPTY = "Aucun événement enregistré dans PostgreSQL.";

export const AUDIT_EMPTY_FILTERS = "Aucun résultat pour ces filtres.";

export const AUDIT_EXPORT_HINT = "Export JSON de la page courante. Ce n'est pas un rapport de conformité.";

export const AUDIT_SECURITY_NOTE =
  "Les métadonnées brutes, adresses IP, factures BOLT11, mots de passe, jetons JWT, seeds et macaroons ne sont pas exposés.";

export const AUDIT_DETAIL_TITLE = "Détail de l'événement";

export type AuditCategory = "payment" | "transfer" | "other";

export type AuditSeverityKey = "info" | "warning" | "unclassified";

export type AuditActor = {
  id: number;
  email: string;
} | null;

export type AuditSeverity = {
  key: AuditSeverityKey;
  label: string;
};

export type AuditEvent = {
  id: number;
  created_at: string;
  action: string;
  resource_type: string;
  resource_id: string;
  actor: AuditActor;
  category: AuditCategory;
  severity: AuditSeverity;
  metadata_safe: Record<string, string | number | boolean>;
};

export type AuditSummary = {
  total: number;
  payment: number;
  transfer: number;
};

export type AuditListPayload = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditEvent[];
  summary: AuditSummary;
};

export type AuditListFilters = {
  query: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actor: string;
  createdAfter: string;
  createdBefore: string;
};

export const EMPTY_AUDIT_SUMMARY: AuditSummary = {
  total: 0,
  payment: 0,
  transfer: 0,
};

export const ACTION_FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Toutes les actions" },
  { id: "payment.invoice_created", label: "payment.invoice_created" },
  { id: "payment.created", label: "payment.created" },
  { id: "payment.lightning_settled", label: "payment.lightning_settled" },
  { id: "transfer.created", label: "transfer.created" },
  { id: "transfer.beneficiary_updated", label: "transfer.beneficiary_updated" },
  { id: "transfer.quoted", label: "transfer.quoted" },
  { id: "transfer.quote_validated", label: "transfer.quote_validated" },
  { id: "transfer.status_changed", label: "transfer.status_changed" },
  { id: "transfer.validation_failed", label: "transfer.validation_failed" },
];

export const RESOURCE_TYPE_FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Tous les types" },
  { id: "payment", label: "Paiement" },
  { id: "transfer", label: "Transfert" },
];

export function defaultAuditFilters(): AuditListFilters {
  return {
    query: "",
    action: "",
    resourceType: "",
    resourceId: "",
    actor: "",
    createdAfter: "",
    createdBefore: "",
  };
}

export function filtersAreDefault(filters: AuditListFilters): boolean {
  return (
    filters.query.trim() === "" &&
    filters.action === "" &&
    filters.resourceType === "" &&
    filters.resourceId.trim() === "" &&
    filters.actor.trim() === "" &&
    filters.createdAfter === "" &&
    filters.createdBefore === ""
  );
}

export function buildAuditQuery(filters: AuditListFilters, page: number, pageSize = ADMIN_AUDIT_PAGE_SIZE): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, page)));
  params.set("page_size", String(pageSize));
  const query = filters.query.trim();
  if (query) {
    params.set("q", query);
  }
  if (filters.action) {
    params.set("action", filters.action);
  }
  if (filters.resourceType) {
    params.set("resource_type", filters.resourceType);
  }
  const resourceId = filters.resourceId.trim();
  if (resourceId) {
    params.set("resource_id", resourceId);
  }
  const actor = filters.actor.trim();
  if (actor) {
    params.set("actor", actor);
  }
  if (filters.createdAfter) {
    params.set("created_after", toIsoParam(filters.createdAfter));
  }
  if (filters.createdBefore) {
    params.set("created_before", toIsoParam(filters.createdBefore));
  }
  return `${ADMIN_AUDIT_PATH}?${params.toString()}`;
}

export function toIsoParam(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
}

export function categoryLabel(category: AuditCategory): string {
  if (category === "payment") {
    return "Paiement";
  }
  if (category === "transfer") {
    return "Transfert";
  }
  return "Autre";
}

export function actorLabel(actor: AuditActor): string {
  if (!actor) {
    return "Système";
  }
  return actor.email;
}

export function resourceLabel(event: Pick<AuditEvent, "resource_type" | "resource_id">): string {
  const type = event.resource_type || "—";
  const id = event.resource_id || "—";
  return `${type} #${id}`;
}

export function formatAuditStamp(iso: string): string {
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
    second: "2-digit",
  });
}

export function severityTone(key: AuditSeverityKey): "ok" | "warn" | "muted" {
  if (key === "warning") {
    return "warn";
  }
  if (key === "info") {
    return "ok";
  }
  return "muted";
}

export function metadataEntries(safe: AuditEvent["metadata_safe"]): { key: string; value: string }[] {
  return Object.entries(safe).map(([key, value]) => ({
    key,
    value: typeof value === "boolean" ? (value ? "oui" : "non") : String(value),
  }));
}

export function buildAuditExport(rows: readonly AuditEvent[], page: number) {
  return {
    source: ADMIN_AUDIT_PATH,
    network: "regtest",
    note: AUDIT_EXPORT_HINT,
    page,
    count: rows.length,
    events: rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      action: row.action,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      actor: row.actor,
      category: row.category,
      severity: row.severity,
      metadata_safe: row.metadata_safe,
    })),
  };
}

export function auditExportFilename(page: number, now = new Date()): string {
  return `smartpay-audit-page-${page}-regtest-${now.toISOString().slice(0, 10)}.json`;
}

export function auditExportContainsSecrets(payload: unknown): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  return ["password", "macaroon", "seed", "jwt", "encoded_invoice", "ip_address", '"metadata"'].some((token) =>
    text.includes(token),
  );
}

export function visiblePageNumbers(current: number, total: number): number[] {
  const pages = Math.max(1, total);
  const start = Math.max(1, Math.min(current, pages) - 2);
  const end = Math.min(pages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function neverFetchPaymentDetail(): boolean {
  return true;
}
