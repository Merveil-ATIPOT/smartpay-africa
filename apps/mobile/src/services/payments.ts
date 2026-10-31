import type {
  CreateInvoiceRequest,
  LabCounterpartyInvoice,
  Paginated,
  Payment,
  PaymentPreview,
} from "@smartpay/contracts";

import { newIdempotencyKey } from "../lib/confirmLock";
import { LAB_BOB_INVOICE_MEMO } from "../lib/invoice";
import { shouldStopPolling } from "../lib/paymentStatus";
import { api } from "./api";

export async function previewPayment(input: {
  encodedInvoice: string;
  amountSats?: number;
}): Promise<PaymentPreview> {
  const body: Record<string, unknown> = {
    encoded_invoice: input.encodedInvoice,
  };
  if (input.amountSats && input.amountSats > 0) {
    body.amount_sats = input.amountSats;
  }
  return api.request<PaymentPreview>("/api/v1/payments/preview/", {
    method: "POST",
    body,
  });
}

export async function confirmPayment(input: {
  encodedInvoice: string;
  amountSats: number;
  description?: string;
  idempotencyKey?: string;
}): Promise<Payment> {
  const key = input.idempotencyKey ?? newIdempotencyKey();
  return api.request<Payment>("/api/v1/payments/", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    timeoutMs: 90_000,
    body: {
      amount_sats: input.amountSats,
      encoded_invoice: input.encodedInvoice,
      description: input.description ?? "",
      confirm: true,
      idempotency_key: key,
    },
  });
}

export async function createInvoice(input: CreateInvoiceRequest): Promise<Payment> {
  return api.request<Payment>("/api/v1/payments/invoices/", {
    method: "POST",
    body: input,
  });
}

export async function createLabCounterpartyInvoice(input: {
  amountSats: number;
  memo?: string;
}): Promise<LabCounterpartyInvoice> {
  return api.request<LabCounterpartyInvoice>("/api/v1/lab/counterparty-invoice/", {
    method: "POST",
    body: {
      amount_sats: input.amountSats,
      memo: input.memo ?? LAB_BOB_INVOICE_MEMO,
    },
  });
}

export async function fetchPayment(id: string): Promise<Payment> {
  return api.request<Payment>(`/api/v1/payments/${id}/`);
}

export async function listPayments(): Promise<Payment[]> {
  const page = await api.request<Paginated<Payment>>("/api/v1/payments/");
  return page.results ?? [];
}

export async function pollPayment(
  id: string,
  options: { intervalMs?: number; timeoutMs?: number; isCancelled?: () => boolean } = {},
): Promise<Payment> {
  const intervalMs = options.intervalMs ?? 2500;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const started = Date.now();
  let last = await fetchPayment(id);
  while (Date.now() - started < timeoutMs) {
    if (options.isCancelled?.()) {
      return last;
    }
    if (shouldStopPolling(last)) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    last = await fetchPayment(id);
  }
  return last;
}
