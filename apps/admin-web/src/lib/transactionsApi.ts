import { portalApi } from "./api";
import {
  PAYMENTS_LIST_PATH,
  SIMULATIONS_LIST_PATH,
  TRANSFERS_LIST_PATH,
  mergeSnapshots,
  type PaymentSnapshot,
  type SimulationSnapshot,
  type TransferSnapshot,
  type TxRow,
} from "./transactionsRegtest";

type ListPayload<T> = {
  count?: number;
  results?: T[];
};

function asList<T>(body: ListPayload<T> | T[] | null | undefined): T[] {
  if (Array.isArray(body)) {
    return body;
  }
  if (body && Array.isArray(body.results)) {
    return body.results;
  }
  return [];
}

export async function fetchTransactionSnapshots(): Promise<{
  rows: TxRow[];
  paymentCount: number;
  transferCount: number;
  simulationCount: number;
}> {
  const [payments, transfers, simulations] = await Promise.all([
    portalApi.request<ListPayload<PaymentSnapshot>>(PAYMENTS_LIST_PATH, { method: "GET" }),
    portalApi.request<ListPayload<TransferSnapshot>>(TRANSFERS_LIST_PATH, { method: "GET" }),
    portalApi.request<ListPayload<SimulationSnapshot>>(SIMULATIONS_LIST_PATH, { method: "GET" }),
  ]);
  const paymentRows = asList(payments);
  const transferRows = asList(transfers);
  const simulationRows = asList(simulations);
  return {
    rows: mergeSnapshots(paymentRows, transferRows, simulationRows),
    paymentCount: paymentRows.length,
    transferCount: transferRows.length,
    simulationCount: simulationRows.length,
  };
}
