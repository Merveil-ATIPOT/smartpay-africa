/** Contrats TypeScript alignés sur packages/contracts/openapi/openapi.yaml */

export type CountryCode = "SN" | "CG" | "CI";
export type UserRole = "individual" | "student" | "merchant" | "business" | "admin";
export type PaymentStatus = "created" | "pending" | "confirmed" | "failed" | "expired";
export type SettlementMode = "mock" | "lightning_regtest";
export type PaymentDirection = "incoming" | "outgoing";
export type BitcoinNetwork = "regtest";
export type WalletProvider = "mock" | "lnd_regtest";

export interface HealthResponse {
  status: "ok" | "degraded";
  service: "smartpay-api";
  version: string;
  network: BitcoinNetwork;
  payment_provider: WalletProvider;
  lightning: "not_connected" | "regtest";
  database: "up" | "down";
  checked_at: string;
  warnings: string[];
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: UserRole;
  country: CountryCode;
  is_active: boolean;
  date_joined: string;
}

export interface WalletConnection {
  id: number;
  provider: WalletProvider;
  public_identifier: string;
  node_pubkey: string;
  alias: string;
  is_active: boolean;
  mock_balance_sats: number;
  channel_balance_sats: number;
  is_lightning_connected: boolean;
  connected_at: string;
  warnings: string[];
}

export interface PaymentInvoice {
  encoded_invoice: string;
  payment_hash: string;
  memo: string;
  expires_at: string;
  is_mock: boolean;
}

export interface Payment {
  id: string;
  amount_sats: number;
  description: string;
  status: PaymentStatus;
  settlement_mode: SettlementMode;
  is_lightning_settled: boolean;
  lightning_status: "not_applicable" | "pending" | "settled" | "failed" | "expired";
  network: BitcoinNetwork;
  direction: PaymentDirection;
  idempotency_key: string;
  provider_reference: string;
  failure_reason: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  invoice: PaymentInvoice | null;
  warnings: string[];
}

export interface PaymentPreview {
  amount_sats: number;
  fee_sats: number;
  settlement_mode: SettlementMode;
  network: BitcoinNetwork;
  is_lightning_settled: boolean;
  encoded_invoice?: string;
  payment_hash?: string;
  warnings: string[];
}

export interface CreateInvoiceRequest {
  amount_sats: number;
  memo?: string;
  expiry_seconds?: number;
}

export interface CreatePaymentRequest {
  amount_sats: number;
  description?: string;
  merchant_id?: number;
  idempotency_key?: string;
  encoded_invoice?: string;
  confirm?: boolean;
}

export interface TransferSimulation {
  id: number;
  source_country: CountryCode;
  destination_country: CountryCode;
  amount_sats: number;
  status: PaymentStatus;
  disclaimer: string;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  results: T[];
}
