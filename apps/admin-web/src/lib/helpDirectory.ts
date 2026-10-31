import {
  ADMIN_AUDIT_HREF,
  ADMIN_INFRASTRUCTURE_HREF,
  ADMIN_MERCHANTS_HREF,
  ADMIN_TRANSACTIONS_HREF,
  ADMIN_USERS_HREF,
} from "./nav";

export const HELP_TITLE = "Assistance";

export const HELP_SUBTITLE = "Centre d'aide et d'orientation du portail administrateur SmartPay Africa.";

export const HELP_REGTEST_BADGE = "Environnement Regtest";

export const HELP_DEMO_NOTE =
  "Environnement de démonstration. Aucun service d'assistance externe n'est connecté. Aucune maquette W12.";

export const HELP_SECURITY_NOTE =
  "Aucun secret LND, jeton JWT, seed, macaroon, mot de passe, identifiant RPC ou chemin de certificat n'est affiché.";

export type HelpGuide = {
  id: string;
  title: string;
  body: string;
  actions: { href: string; label: string }[];
};

export const HELP_GUIDES: readonly HelpGuide[] = [
  {
    id: "infrastructure",
    title: "Infrastructure Lightning",
    body:
      "La page Infrastructure interroge GET /api/v1/admin/infrastructure/. Elle affiche l'état d'Alice, de Bob, de Django et de PostgreSQL. Bitcoin Core n'est pas vérifié directement. Connecté n'est pas synchronisé.",
    actions: [{ href: ADMIN_INFRASTRUCTURE_HREF, label: "Voir l'infrastructure" }],
  },
  {
    id: "audit",
    title: "Audit et sécurité",
    body:
      "Le journal GET /api/v1/admin/audit/ liste les événements payment.* et transfer.* réellement persistés. Ce n'est pas une supervision des connexions ou des inscriptions administrateur, qui ne sont pas journalisées.",
    actions: [{ href: ADMIN_AUDIT_HREF, label: "Consulter l'audit" }],
  },
  {
    id: "transactions",
    title: "Transactions Regtest",
    body:
      "L'écran Transactions consulte les paiements et simulations Django du laboratoire. Aucune valeur Mainnet. GET /payments/{id}/ n'est pas utilisé ici, car il peut déclencher une réconciliation Lightning.",
    actions: [{ href: ADMIN_TRANSACTIONS_HREF, label: "Voir les transactions" }],
  },
  {
    id: "directory",
    title: "Utilisateurs et marchands",
    body:
      "Les annuaires /users et /merchants sont en lecture seule via PostgreSQL. Aucune fiche, aucun solde et aucun journal utilisateur n'est inventé.",
    actions: [
      { href: ADMIN_USERS_HREF, label: "Voir les utilisateurs" },
      { href: ADMIN_MERCHANTS_HREF, label: "Voir les marchands" },
    ],
  },
];

export type HelpFaq = {
  id: string;
  question: string;
  answer: string;
};

export const HELP_FAQ: readonly HelpFaq[] = [
  {
    id: "regtest",
    question: "Qu'est-ce que l'environnement Regtest ?",
    answer:
      "Regtest est le réseau Bitcoin de laboratoire utilisé par SmartPay Africa. Les soldes n'ont aucune valeur réelle. Le Mainnet n'est pas branché. Wave, Orange Money et MTN ne sont pas contactés.",
  },
  {
    id: "sync",
    question: "Quelle différence entre un nœud connecté et synchronisé ?",
    answer:
      "Connecté signifie que Django a obtenu une réponse LND getinfo. Synchronisé correspond à synced_to_chain. Un nœud peut être joignable et encore en retard sur la chaîne. La page Infrastructure et les Paramètres affichent ces deux états séparément.",
  },
  {
    id: "unavailable",
    question: "Pourquoi certaines fonctionnalités sont-elles indisponibles ?",
    answer:
      "Corridors internationaux n'a pas d'écran branché. Mot de passe, 2FA, sessions, préférences et notifications n'ont pas d'API. Les tickets d'assistance n'ont pas de modèle Django. Le menu le signale au lieu d'inventer une action.",
  },
  {
    id: "audit-content",
    question: "Que contient le journal d'audit ?",
    answer:
      "Uniquement les actions réellement écrites : création et règlement de paiements, devis et statuts de transferts. Les métadonnées sont filtrées. Les adresses IP, factures BOLT11 et secrets ne sont pas exposés. Les connexions JWT et les inscriptions ne sont pas journalisées.",
  },
  {
    id: "corridors",
    question: "Pourquoi les paiements transfrontaliers ne sont-ils pas encore opérationnels ?",
    answer:
      "L'écran Corridors internationaux (W08) reste hors périmètre. Les transferts du laboratoire appliquent un devis de démonstration et un crédit Mobile Money simulé. Aucun opérateur réel ni partenaire financier n'est branché.",
  },
  {
    id: "infra-status",
    question: "Comment interpréter les statuts d'infrastructure ?",
    answer:
      "Django disponible correspond à une réponse de l'API. PostgreSQL disponible correspond à une base joignable. Alice et Bob peuvent être connectés, non synchronisés, en délai d'attente, indisponibles ou non configurés. Bitcoin Core est annoncé « non vérifié directement » : aucune preuve RPC n'est faite depuis le portail.",
  },
];

export const HELP_UNAVAILABLE_SUPPORT = [
  {
    id: "ticket",
    label: "Création de ticket",
    note: "Aucun modèle Ticket n'existe. Aucun formulaire n'est proposé.",
  },
  {
    id: "history",
    label: "Historique des demandes",
    note: "Aucune demande n'est persistée.",
  },
  {
    id: "incidents",
    label: "Suivi des incidents",
    note: "Aucun incident de support n'est enregistré. Le journal d'audit reste applicatif.",
  },
  {
    id: "notifications",
    label: "Notifications de support",
    note: "Aucun canal e-mail, WhatsApp ou notification n'est connecté.",
  },
] as const;

export function helpGuideHrefs(): string[] {
  return HELP_GUIDES.flatMap((guide) => guide.actions.map((action) => action.href));
}

export function helpContainsSecrets(payload: unknown): boolean {
  const blob = JSON.stringify(payload).toLowerCase();
  return /admin\.macaroon|\/run\/lnd|grpc-metadata|eyj[a-z0-9_-]+\.|encoded_invoice/.test(blob);
}

export function helpCopiesMobileSupport(): boolean {
  const blob = JSON.stringify({ guides: HELP_GUIDES, faq: HELP_FAQ, support: HELP_UNAVAILABLE_SUPPORT }).toLowerCase();
  return blob.includes("wa.me") || blob.includes("assistant ia") || blob.includes("221770000000");
}

export function helpHasTicketForm(): boolean {
  return false;
}
