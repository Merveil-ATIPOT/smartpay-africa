import type {
  InternationalTransfer,
  Paginated,
  TransferCatalog,
  TransferExecutionResult,
  TransferOperatorsResponse,
  TransferPaymentPreview,
  TransferQuote,
} from "@smartpay/contracts";

import { assertTransferConfirmAllowed } from "../lib/transferSafety";
import { api } from "./api";

function request<T>(
  path: string,
  options?: Parameters<typeof api.request>[1],
): Promise<T> {
  return api.request<T>(path, options);
}

export async function fetchDestinations(): Promise<TransferCatalog> {
  return request<TransferCatalog>("/api/v1/transfers/destinations/");
}

export async function fetchDestinationOperators(code: string): Promise<TransferOperatorsResponse> {
  return request<TransferOperatorsResponse>(`/api/v1/transfers/destinations/${code}/operators/`);
}

export async function fetchStandaloneQuote(input: {
  amountLocal: number;
  destinationCountry: string;
}): Promise<TransferQuote> {
  return request<TransferQuote>("/api/v1/transfers/quotes/", {
    method: "POST",
    body: {
      amount_local: input.amountLocal,
      destination_country: input.destinationCountry,
    },
  });
}

export async function listTransfers(): Promise<InternationalTransfer[]> {
  const page = await request<Paginated<InternationalTransfer>>("/api/v1/transfers/");
  return page.results ?? [];
}

export async function createTransfer(input: {
  sourceCountry?: string;
  destinationCountry: string;
  operator?: string;
  beneficiaryName?: string;
  phoneNumber?: string;
  reason?: string;
  amountLocal?: number;
  idempotencyKey: string;
}): Promise<InternationalTransfer> {
  return request<InternationalTransfer>("/api/v1/transfers/", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: {
      source_country: input.sourceCountry ?? "",
      destination_country: input.destinationCountry,
      operator: input.operator ?? "",
      beneficiary_name: input.beneficiaryName ?? "",
      phone_number: input.phoneNumber ?? "",
      reason: input.reason ?? "",
      amount_local: input.amountLocal ?? 0,
      idempotency_key: input.idempotencyKey,
    },
  });
}

export async function updateTransfer(
  id: string,
  input: {
    destinationCountry?: string;
    operator?: string;
    beneficiaryName?: string;
    phoneNumber?: string;
    reason?: string;
    amountLocal?: number;
    sourceCountry?: string;
  },
): Promise<InternationalTransfer> {
  return request<InternationalTransfer>(`/api/v1/transfers/${id}/`, {
    method: "PATCH",
    body: {
      ...(input.destinationCountry ? { destination_country: input.destinationCountry } : {}),
      ...(input.operator ? { operator: input.operator } : {}),
      ...(input.beneficiaryName !== undefined ? { beneficiary_name: input.beneficiaryName } : {}),
      ...(input.phoneNumber ? { phone_number: input.phoneNumber } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.amountLocal !== undefined ? { amount_local: input.amountLocal } : {}),
      ...(input.sourceCountry ? { source_country: input.sourceCountry } : {}),
    },
  });
}

export async function saveBeneficiary(
  id: string,
  input: {
    operator: string;
    beneficiaryName: string;
    phoneNumber: string;
    reason?: string;
  },
): Promise<InternationalTransfer> {
  return request<InternationalTransfer>(`/api/v1/transfers/${id}/beneficiary/`, {
    method: "POST",
    body: {
      operator: input.operator,
      beneficiary_name: input.beneficiaryName,
      phone_number: input.phoneNumber,
      reason: input.reason ?? "",
    },
  });
}

export async function quoteTransfer(id: string, amountLocal?: number): Promise<InternationalTransfer> {
  return request<InternationalTransfer>(`/api/v1/transfers/${id}/quote/`, {
    method: "POST",
    body: amountLocal !== undefined ? { amount_local: amountLocal } : {},
  });
}

export async function markTransferReady(id: string, idempotencyKey: string): Promise<InternationalTransfer> {
  return request<InternationalTransfer>(`/api/v1/transfers/${id}/ready/`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: { idempotency_key: idempotencyKey },
  });
}

export async function previewTransferPayment(id: string): Promise<TransferPaymentPreview> {
  return request<TransferPaymentPreview>(`/api/v1/transfers/${id}/preview-payment/`);
}

export async function fetchTransfer(id: string): Promise<InternationalTransfer> {
  return request<InternationalTransfer>(`/api/v1/transfers/${id}/`);
}

export async function fetchTransferResult(id: string): Promise<TransferExecutionResult> {
  return request<TransferExecutionResult>(`/api/v1/transfers/${id}/result/`);
}

/** B3 : ne pas appeler depuis l'UI. Le drapeau bloque tout envoi. */
export async function confirmTransfer(id: string, idempotencyKey: string): Promise<InternationalTransfer> {
  assertTransferConfirmAllowed();
  return request<InternationalTransfer>(`/api/v1/transfers/${id}/confirm/`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    timeoutMs: 90_000,
    body: { idempotency_key: idempotencyKey },
  });
}
