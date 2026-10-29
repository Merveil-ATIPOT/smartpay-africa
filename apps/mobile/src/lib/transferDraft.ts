import type { TransferStatus } from "@smartpay/contracts";

import { buildQuote, quoteErrors, type TransferQuote } from "./transferConversion";
import {
  getCorridor,
  type DestinationCode,
  type OperatorId,
} from "./transferCorridors";
import { formatInternational, nationalNumber, operatorAllowed, phoneErrors } from "./transferPhone";

export type TransferSessionMode = "demo" | "backend";
export type TransferStepStatus = "country" | "beneficiary" | "amount" | "review" | "demo_preview";

export type TransferDraft = {
  sourceCountry: DestinationCode | null;
  destinationCode: DestinationCode | null;
  operator: OperatorId | null;
  beneficiaryName: string;
  phone: string;
  reason: string;
  amountFcfa: number;
  availableSats: number;
  status: TransferStepStatus;
  mode: TransferSessionMode;
  draftKey: string;
  transferId: string | null;
  publicReference: string | null;
  serverStatus: TransferStatus | "";
  quoteExpiresAt: string | null;
  quoteCurrent: boolean;
  serverAmountSats: number;
  serverFeeSats: number;
  serverTotalSats: number;
  serverRate: number;
  quoteVersion: string;
};

export const EMPTY_DRAFT: TransferDraft = {
  sourceCountry: null,
  destinationCode: null,
  operator: null,
  beneficiaryName: "",
  phone: "",
  reason: "",
  amountFcfa: 0,
  availableSats: 0,
  status: "country",
  mode: "backend",
  draftKey: "",
  transferId: null,
  publicReference: null,
  serverStatus: "",
  quoteExpiresAt: null,
  quoteCurrent: false,
  serverAmountSats: 0,
  serverFeeSats: 0,
  serverTotalSats: 0,
  serverRate: 0,
  quoteVersion: "",
};

export type DemoPreview = {
  localReference: string;
  createdAt: string;
  quote: TransferQuote;
  destinationCode: DestinationCode;
  operator: OperatorId;
  beneficiaryName: string;
  phone: string;
  reason: string;
  lightningExecuted: false;
  mobileMoneyCredited: false;
  disclaimer: string;
};

export const DEMO_RESULT_DISCLAIMER =
  "Aucun paiement Lightning ni crédit Mobile Money n'a été exécuté durant cette démonstration.";

export const DEMO_PROOF_STAMP = "DÉMONSTRATION — NON VALABLE COMME PREUVE DE PAIEMENT";

export const PDF_UNAVAILABLE_MESSAGE =
  "La génération PDF n'est pas encore implémentée. Aucun téléchargement n'a été simulé.";

export function selectCountry(draft: TransferDraft, code: DestinationCode): TransferDraft {
  const corridor = getCorridor(code);
  if (!corridor?.available) {
    return draft;
  }
  if (draft.destinationCode === code) {
    return { ...draft, status: "country" };
  }
  return {
    ...draft,
    destinationCode: code,
    operator: null,
    beneficiaryName: "",
    phone: "",
    reason: "",
    status: "country",
    transferId: null,
    publicReference: null,
    serverStatus: "",
    quoteExpiresAt: null,
    quoteCurrent: false,
    serverAmountSats: 0,
    serverFeeSats: 0,
    serverTotalSats: 0,
    serverRate: 0,
    quoteVersion: "",
  };
}

export function applyBeneficiary(
  draft: TransferDraft,
  input: { operator: OperatorId; beneficiaryName: string; phone: string; reason: string },
): TransferDraft {
  if (!draft.destinationCode || !operatorAllowed(draft.destinationCode, input.operator)) {
    return draft;
  }
  const corridor = getCorridor(draft.destinationCode);
  const national = corridor ? nationalNumber(input.phone, corridor.dialCode) : digitsSafe(input.phone);
  return {
    ...draft,
    operator: input.operator,
    beneficiaryName: input.beneficiaryName.trim(),
    phone: national,
    reason: input.reason.trim(),
    status: "beneficiary",
  };
}

function digitsSafe(value: string): string {
  return value.replace(/\D/g, "");
}

export function applyAmount(draft: TransferDraft, amountFcfa: number, availableSats: number): TransferDraft {
  return {
    ...draft,
    amountFcfa,
    availableSats,
    status: "amount",
  };
}

export function beneficiaryErrors(draft: TransferDraft): string[] {
  const errors: string[] = [];
  if (!draft.destinationCode) {
    errors.push("Choisissez un pays de destination.");
  }
  if (!draft.operator || (draft.destinationCode && !operatorAllowed(draft.destinationCode, draft.operator))) {
    errors.push("Choisissez un opérateur Mobile Money du pays sélectionné.");
  }
  if (draft.beneficiaryName.trim().length < 3) {
    errors.push("Indiquez le nom complet du bénéficiaire.");
  }
  if (draft.destinationCode) {
    errors.push(...phoneErrors(draft.destinationCode, draft.phone));
  }
  return errors;
}

export function displayPhone(draft: TransferDraft): string {
  if (!draft.destinationCode) {
    return draft.phone;
  }
  return formatInternational(draft.destinationCode, draft.phone);
}

export function quoteFromDraft(draft: TransferDraft): TransferQuote {
  const local = buildQuote(draft.amountFcfa);
  if (draft.mode === "backend" && draft.quoteCurrent && draft.serverAmountSats > 0) {
    return {
      ...local,
      amountSats: draft.serverAmountSats,
      feeSats: draft.serverFeeSats,
      totalSats: draft.serverTotalSats || draft.serverAmountSats + draft.serverFeeSats,
    };
  }
  return local;
}

export function demoShareMessage(preview: DemoPreview): string {
  return [
    DEMO_PROOF_STAMP,
    preview.disclaimer,
    `Référence locale : ${preview.localReference}`,
    `${preview.beneficiaryName} · ${preview.phone}`,
    `${preview.quote.amountFcfa} FCFA / ${preview.quote.amountSats} sats`,
  ].join("\n");
}

export function createLocalPreview(draft: TransferDraft, now = new Date()): DemoPreview | null {
  if (!draft.destinationCode || !draft.operator || beneficiaryErrors(draft).length > 0) {
    return null;
  }
  if (quoteErrors(draft.amountFcfa, draft.availableSats).length > 0) {
    return null;
  }
  const quote = quoteFromDraft(draft);
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15);
  return {
    localReference: `DEMO-${stamp}`,
    createdAt: now.toISOString(),
    quote,
    destinationCode: draft.destinationCode,
    operator: draft.operator,
    beneficiaryName: draft.beneficiaryName.trim(),
    phone: displayPhone(draft),
    reason: draft.reason.trim() || "Non renseigné",
    lightningExecuted: false,
    mobileMoneyCredited: false,
    disclaimer: DEMO_RESULT_DISCLAIMER,
  };
}
