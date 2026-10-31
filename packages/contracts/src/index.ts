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
  lab_counterparty?: boolean;
  checked_at: string;
  warnings: string[];
}

export interface LabCounterpartyInvoice {
  encoded_invoice: string;
  payment_hash: string;
  amount_sats: number;
  expires_at: string;
  counterparty: "bob";
  is_user_wallet: false;
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
  description?: string;
  destination?: string;
  expiry_seconds?: number;
  expires_at?: string | null;
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

export type TransferDestinationCode = "SN" | "CI" | "CG" | "CM" | "BJ" | "TG" | "FR";
export type TransferOperatorId = "wave" | "orange" | "mtn" | "free" | "airtel" | "moov" | "tmoney";
export type TransferStatus =
  | "draft"
  | "quoted"
  | "ready"
  | "payment_pending"
  | "lightning_settled"
  | "simulated_credited"
  | "failed"
  | "pending_reconciliation";
export type TransferExecutionMode = "regtest_mobile_money_simulation";
export type MobileMoneyCreditStatus = "none" | "simulated" | "failed";

export interface TransferDestination {
  code: TransferDestinationCode;
  name: string;
  currency: "XOF" | "XAF" | "EUR";
  region: "uemoa" | "cemac" | "intl";
  recommended: boolean;
  available: boolean;
  simulated_gateway: boolean;
  dial_code: string;
  operators: { id: TransferOperatorId; label: string; short_label: string }[];
}

export interface TransferQuote {
  amount_local: number;
  currency: "XOF" | "XAF";
  amount_sats: number;
  fee_sats: number;
  total_sats: number;
  demo_rate_fcfa_per_btc: number;
  quote_version: string;
  quoted_at: string;
  expires_at: string;
  is_fictional_rate: true;
  is_lnd_fee_estimate: false;
  lnd_fee_estimate_available: false;
  disclaimer: string;
  fee_disclaimer: string;
}

export interface InternationalTransfer {
  id: string;
  public_reference: string;
  source_country: CountryCode | "";
  destination_country: Exclude<TransferDestinationCode, "FR"> | "";
  currency: "XOF" | "XAF" | "";
  operator: TransferOperatorId | "";
  beneficiary_name: string;
  phone_number: string;
  reason: string;
  amount_local: number;
  demo_rate_fcfa_per_btc: number;
  amount_sats: number;
  fee_sats: number;
  total_sats: number;
  quote_version: string;
  quoted_at: string | null;
  quote_expires_at: string | null;
  status: TransferStatus;
  execution_mode: TransferExecutionMode;
  lightning_payment_id: string | null;
  lightning_payment_hash: string;
  lightning_settled_at: string | null;
  mobile_money_credit_status: MobileMoneyCreditStatus;
  simulated_credit_reference: string;
  disclaimer: string;
  created_at: string;
  updated_at: string;
  quote_current: boolean;
  warnings: string[];
  invoice_amount_sats: number;
  lnd_fee_sats_estimated: number;
  lnd_fee_sats_paid: number | null;
  total_debited_sats: number;
}

export interface TransferCatalog {
  disclaimer: string;
  count: number;
  results: TransferDestination[];
}

export interface TransferOperatorsResponse {
  code: string;
  name: string;
  available: boolean;
  currency: string;
  disclaimer: string;
  operators: { id: TransferOperatorId; label: string; short_label: string }[];
}

export interface TransferPaymentPreview {
  transfer_id: string;
  public_reference: string;
  status: TransferStatus;
  amount_local: number;
  currency: string;
  invoice_amount_sats: number;
  demo_fee_sats: number;
  indicative_total_sats: number;
  lnd_fee_sats_estimated: number;
  lnd_fee_estimate_available: boolean;
  lnd_fee_sats_paid: number | null;
  channel_balance_sats: number;
  lightning_connected: boolean;
  can_execute: boolean;
  execution_mode: TransferExecutionMode;
  warnings: string[];
}

export interface TransferExecutionResult {
  id: string;
  public_reference: string;
  status: TransferStatus;
  amount_local: number;
  currency: string;
  operator: string;
  destination_country: string;
  beneficiary_name: string;
  invoice_amount_sats: number;
  demo_fee_sats: number;
  lnd_fee_sats_estimated: number;
  lnd_fee_sats_paid: number | null;
  total_debited_sats: number;
  lightning_payment_hash: string;
  lightning_settled_at: string | null;
  lightning_confirmed: boolean;
  alice_status: string;
  bob_status: string;
  mobile_money_credit_status: MobileMoneyCreditStatus;
  simulated_credit_reference: string;
  credited_amount_local: number;
  credit_disclaimer: string;
  warnings: string[];
}

export interface Paginated<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export type AssistantMessageRole = "user" | "assistant";
export type AssistantResponseType = "faq" | "unsupported" | "error" | "blocked" | "";

export interface AssistantConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface AssistantMessage {
  id: string;
  role: AssistantMessageRole;
  content: string;
  response_type: AssistantResponseType;
  created_at: string;
}

export interface AssistantMessageExchange {
  user_message: AssistantMessage;
  assistant_message: AssistantMessage;
}
