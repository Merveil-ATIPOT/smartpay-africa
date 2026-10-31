export const ADMIN_INFRASTRUCTURE_PATH = "/api/v1/admin/infrastructure/";

export const INFRASTRUCTURE_TITLE = "Nœud & Infrastructure Lightning";

export const INFRASTRUCTURE_REGTEST_BADGE = "Environnement Regtest";

export const INFRASTRUCTURE_SOURCE_NOTE =
  "Source : GET /api/v1/admin/infrastructure/. Lecture seule. Aucun chiffre Stitch.";

export const INFRASTRUCTURE_ACCESS_DENIED =
  "Accès interdit. La supervision d'infrastructure est réservée aux administrateurs.";

export const INFRASTRUCTURE_EVENTS_UNAVAILABLE =
  "Journal d'événements indisponible : aucun endpoint d'audit n'expose ces messages.";

export const INFRASTRUCTURE_EXPORT_UNAVAILABLE = "Export PDF indisponible dans cette version.";

export const INFRASTRUCTURE_EMPTY_JOURNAL =
  "Aucun événement d'infrastructure n'est exposé par l'API. Aucune ligne n'est inventée.";

export const INFRASTRUCTURE_SECURITY_NOTE =
  "Les macaroons, seeds, certificats TLS, identifiants RPC et jetons JWT restent côté serveur. " +
  "Cette mention décrit le périmètre de l'écran ; ce n'est pas une certification de sécurité.";

export const INFRASTRUCTURE_BITCOIN_UNVERIFIED = "Non vérifié directement";

export const INFRASTRUCTURE_LOADING = "Lecture de la sonde d'infrastructure…";

export const STITCH_ILLUSTRATION_MARKERS = [
  "0.45 BTC",
  "18 canaux",
  "14 canaux",
  "1 842",
  "1842",
  "1 216",
  "1216",
  "v1.4.2",
  "dkr-regtest-01",
] as const;

export type NodeProbeStatus = "connected" | "unavailable" | "timeout" | "not_configured";

export type InfrastructureNode = {
  alias: string | null;
  connected: boolean;
  synced_to_chain: boolean | null;
  block_height: number | null;
  num_active_channels: number | null;
  num_peers: number | null;
  channel_balance_sats: number | null;
  status: NodeProbeStatus;
};

export type InfrastructureSnapshot = {
  checked_at: string;
  cache_hit: boolean;
  network: string;
  payment_provider: string;
  warnings: string[];
  alice: InfrastructureNode;
  bob: InfrastructureNode;
  bitcoin_core: {
    status: "not_verified";
    verified: boolean;
    note: string;
  };
  django: {
    status: "ok";
    service: string;
    version: string;
    network: string;
    payment_provider: string;
  };
  postgres: {
    status: "up" | "down";
  };
  payments: {
    recorded_count: number;
    lightning_settled_count: number;
    note: string;
  };
};

export const EMPTY_NODE: InfrastructureNode = {
  alias: null,
  connected: false,
  synced_to_chain: null,
  block_height: null,
  num_active_channels: null,
  num_peers: null,
  channel_balance_sats: null,
  status: "unavailable",
};

export function nodeStatusLabel(node: Pick<InfrastructureNode, "status" | "synced_to_chain" | "connected">): string {
  if (node.status === "timeout") {
    return "Délai d'attente dépassé";
  }
  if (node.status === "not_configured") {
    return "Non configuré";
  }
  if (node.status === "unavailable" || !node.connected) {
    return "Indisponible";
  }
  if (node.synced_to_chain === false) {
    return "Connecté · non synchronisé";
  }
  return "Connecté";
}

export function nodeStatusTone(status: NodeProbeStatus | "ok" | "up" | "down" | "not_verified"): "ok" | "warn" | "bad" | "muted" {
  if (status === "connected" || status === "ok" || status === "up") {
    return "ok";
  }
  if (status === "timeout" || status === "not_verified") {
    return "warn";
  }
  if (status === "unavailable" || status === "down") {
    return "bad";
  }
  return "muted";
}

export function formatInteger(value: number | null | undefined, unit: string, empty = "Indisponible"): string {
  if (value == null || Number.isNaN(value)) {
    return empty;
  }
  const label = value === 1 && unit === "canaux" ? "canal" : value === 1 && unit === "pairs" ? "pair" : value === 1 && unit === "blocs" ? "bloc" : unit;
  return `${value.toLocaleString("fr-FR")} ${label}`;
}

export function formatCheckedAt(iso: string | undefined): string {
  if (!iso) {
    return "Horodatage indisponible";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Horodatage indisponible";
  }
  return date.toLocaleString("fr-FR");
}

export function containsStitchIllustration(value: string): boolean {
  const haystack = value.toLowerCase();
  return STITCH_ILLUSTRATION_MARKERS.some((marker) => haystack.includes(marker.toLowerCase()));
}

export function snapshotContainsSecrets(snapshot: InfrastructureSnapshot): boolean {
  const blob = JSON.stringify(snapshot).toLowerCase();
  return /admin\.macaroon|identity_pubkey|\/run\/lnd|grpc-metadata|eyj[a-z0-9_-]+\./i.test(blob);
}

export function infrastructureExportFilename(): string {
  return "infrastructure-regtest.json";
}

export function topologyHealth(
  snapshot: InfrastructureSnapshot,
): Record<"mobile" | "django" | "postgres" | "alice" | "bob" | "bitcoin", string> {
  return {
    mobile: "Hors sonde",
    django: snapshot.django.status === "ok" ? "Disponible" : "Indisponible",
    postgres: snapshot.postgres.status === "up" ? "Disponible" : "Indisponible",
    alice: nodeStatusLabel(snapshot.alice),
    bob: nodeStatusLabel(snapshot.bob),
    bitcoin: INFRASTRUCTURE_BITCOIN_UNVERIFIED,
  };
}
