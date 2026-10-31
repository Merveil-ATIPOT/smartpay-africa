import type { Payment } from "@smartpay/contracts";

import { formatOperationDate } from "./assistantHome";
import { formatSats } from "./format";
import { settlementCaption, statusLabel, uiPaymentState, type UiPaymentState } from "./paymentStatus";

export const EXPLAIN_NETWORK_BADGE = "Regtest · Démo";
export const EXPLAIN_FEE_UNAVAILABLE =
  "Frais réseau indisponibles. SmartPay n'affiche un frais que s'il est connu en base. Aucun frais estimé d'aperçu n'est utilisé.";
export const EXPLAIN_GENERIC_INCOMING = "Paiement reçu";
export const EXPLAIN_GENERIC_OUTGOING = "Paiement envoyé";

export const EXPLAIN_SECTION_IDS = [
  "summary",
  "status",
  "lightning",
  "fees",
  "regtest",
  "advice",
  "limits",
] as const;

export type ExplanationSectionId = (typeof EXPLAIN_SECTION_IDS)[number];

export type ExplanationSettlementModeLabel = "Mock" | "Lightning Regtest";

export type PaymentExplanationSection = {
  id: ExplanationSectionId;
  title: string;
  body: string;
};

export type PaymentExplanation = {
  payment_id: string;
  title: string;
  amount_label: string;
  status_label: string;
  settlement_caption: string;
  settlement_mode_label: ExplanationSettlementModeLabel;
  network_badge: typeof EXPLAIN_NETWORK_BADGE;
  reference_short: string | null;
  when: string;
  sections: PaymentExplanationSection[];
  can_ask_question: true;
  pdf_available: false;
};

const SECTION_TITLES: Record<ExplanationSectionId, string> = {
  summary: "Résumé de l'opération",
  status: "Comprendre le statut",
  lightning: "Rôle de Lightning",
  fees: "Frais réseau",
  regtest: "Regtest et réseau principal",
  advice: "Conseils",
  limits: "Limites de cette explication",
};

const INVOICE_PREFIXES = ["lnbc", "lntb", "lnbcrt", "lightning:"];

export function explanationTitle(payment: Payment): string {
  const memo = payment.description.trim();
  if (memo) {
    return memo;
  }
  return payment.direction === "incoming" ? EXPLAIN_GENERIC_INCOMING : EXPLAIN_GENERIC_OUTGOING;
}

export function explanationAmountLabel(payment: Payment): string {
  const sign = payment.direction === "incoming" ? "+" : "−";
  return `${sign}${formatSats(payment.amount_sats)} sats`;
}

export function explanationModeLabel(payment: Payment): ExplanationSettlementModeLabel {
  return payment.settlement_mode === "mock" ? "Mock" : "Lightning Regtest";
}

/** Jamais une facture complète, un jeton ou un hash non tronqué. */
export function shortenTechnicalReference(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) {
    return null;
  }
  const folded = value.toLowerCase();
  if (INVOICE_PREFIXES.some((prefix) => folded.startsWith(prefix))) {
    return null;
  }
  if (value.startsWith("eyJ") && value.includes(".")) {
    return null;
  }
  if (value.length <= 16) {
    return value;
  }
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

export function technicalReferenceOf(payment: Payment): string | null {
  return shortenTechnicalReference(payment.provider_reference) ?? shortenTechnicalReference(payment.invoice?.payment_hash);
}

export function explainPayment(payment: Payment): PaymentExplanation {
  const state = uiPaymentState(payment);
  const when = formatOperationDate(payment.created_at);
  return {
    payment_id: payment.id,
    title: explanationTitle(payment),
    amount_label: explanationAmountLabel(payment),
    status_label: statusLabel(state),
    settlement_caption: settlementCaption(payment),
    settlement_mode_label: explanationModeLabel(payment),
    network_badge: EXPLAIN_NETWORK_BADGE,
    reference_short: technicalReferenceOf(payment),
    when,
    sections: EXPLAIN_SECTION_IDS.map((id) => ({
      id,
      title: SECTION_TITLES[id],
      body: sectionBody(id, payment, state, when),
    })),
    can_ask_question: true,
    pdf_available: false,
  };
}

function sectionBody(id: ExplanationSectionId, payment: Payment, state: UiPaymentState, when: string): string {
  switch (id) {
    case "summary":
      return summaryBody(payment, when);
    case "status":
      return statusBody(payment, state);
    case "lightning":
      return lightningBody(payment);
    case "fees":
      return EXPLAIN_FEE_UNAVAILABLE;
    case "regtest":
      return (
        "Ceci est une explication générale. SmartPay Africa fonctionne sur Bitcoin Regtest, " +
        "un réseau de laboratoire. Ces sats n'ont pas de valeur de marché. " +
        "Le réseau principal (Mainnet) n'est pas utilisé ici."
      );
    case "advice":
      return adviceBody(payment, state);
    case "limits":
      return (
        "Cette analyse est pédagogique et en lecture seule. Elle ne détecte pas la fraude, " +
        "n'attribue aucun pourcentage de confiance, n'invente ni frais, ni conversion, ni délai. " +
        "Elle ne peut pas payer, transférer, créer une facture ni annuler une opération."
      );
  }
}

function summaryBody(payment: Payment, when: string): string {
  const direction = payment.direction === "incoming" ? "entrant" : "sortant";
  const memo = payment.description.trim();
  const memoLine = memo ? `Mémo enregistré : ${memo}.` : "Aucun mémo n'est enregistré.";
  return (
    `Paiement ${direction} de ${formatSats(payment.amount_sats)} sats. ${memoLine} ` +
    `Date : ${when}. Réseau indiqué par le serveur : ${payment.network}. ` +
    `Mode : ${explanationModeLabel(payment)}.`
  );
}

function statusBody(payment: Payment, state: UiPaymentState): string {
  const parts = [
    `Statut affiché : ${statusLabel(state)}.`,
    settlementCaption(payment),
    "Ce statut vient des champs renvoyés par l'API, pas d'un code HTTP.",
  ];
  if (payment.status === "expired") {
    parts.push("Le serveur marque cette opération comme expirée.");
  }
  const reason = payment.failure_reason.trim();
  if (reason) {
    parts.push(`Motif serveur : ${reason}.`);
  }
  return parts.join(" ");
}

function lightningBody(payment: Payment): string {
  const general =
    "Explication générale : le Lightning Network permet d'échanger des bitcoins via des canaux, " +
    "sans enregistrer chaque paiement dans un bloc. La durée d'un règlement n'est jamais garantie.";
  if (payment.settlement_mode === "mock") {
    return `${general} Pour cette opération, le mode Mock signifie un accusé simulé, pas un règlement Lightning.`;
  }
  if (
    payment.settlement_mode === "lightning_regtest" &&
    payment.is_lightning_settled &&
    payment.lightning_status === "settled"
  ) {
    return `${general} Pour cette opération, le serveur a confirmé un règlement Lightning Regtest.`;
  }
  return `${general} Pour cette opération, aucun règlement Lightning n'est confirmé par le serveur.`;
}

function adviceBody(payment: Payment, state: UiPaymentState): string {
  if (state === "confirmed") {
    return (
      "Le règlement indiqué provient du serveur. Conservez cet identifiant dans l'historique. " +
      "L'assistant ne peut ni annuler ni rejouer le paiement. " +
      "Lightning n'offre pas de rétrofacturation bancaire ; cela n'est pas une garantie juridique d'irrévocabilité."
    );
  }
  if (state === "mock_receipt") {
    return (
      "Cet accusé Mock ne prouve aucun envoi Lightning. " +
      "Aucun sat de laboratoire n'a été réglé de cette façon. " +
      "L'assistant ne peut pas transformer un accusé Mock en règlement."
    );
  }
  if (payment.status === "expired" || payment.lightning_status === "expired") {
    return (
      "Le serveur indique une expiration. Une nouvelle opération exigerait une nouvelle facture. " +
      "L'assistant ne crée pas de facture et n'invente aucun délai."
    );
  }
  if (state === "failed") {
    const reason = payment.failure_reason.trim();
    const detail = reason ? ` Motif serveur : ${reason}.` : " Aucun motif supplémentaire n'est enregistré.";
    return (
      `Le serveur indique un échec.${detail} ` +
      "Ne relancez pas le même paiement sans nouvelle facture. L'assistant ne peut pas payer."
    );
  }
  if (state === "processing" || state === "pending") {
    return (
      "Attendez le statut renvoyé par l'API. Ne confirmez pas un second paiement pour la même facture. " +
      "Un écran en cours de chargement ou un HTTP 200 n'est pas une preuve de règlement."
    );
  }
  return "Le statut n'est pas confirmé par le serveur. Aucune conclusion financière n'est tirée.";
}
