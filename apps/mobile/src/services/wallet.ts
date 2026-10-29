import type { HealthResponse, WalletConnection } from "@smartpay/contracts";

import { api } from "./api";

export async function fetchHealth(): Promise<HealthResponse> {
  return api.request<HealthResponse>("/api/v1/health/", { auth: false });
}

export async function fetchWallet(): Promise<WalletConnection> {
  return api.request<WalletConnection>("/api/v1/wallet/");
}
