import type { NavigatorScreenParams } from "@react-navigation/native";
import type { PaymentPreview } from "@smartpay/contracts";

export type MerchantTabParamList = {
  MerchantHome: undefined;
  MerchantSalesAnalytics: undefined;
  MerchantSalesHistory: undefined;
  MerchantShop: undefined;
};

export type MerchantQrParams = {
  amountFcfa: number;
  amountSats: number;
  note: string;
  expiryMinutes: number;
  till: string;
  reference: string;
};

export type MerchantStackParamList = {
  MerchantTabs: NavigatorScreenParams<MerchantTabParamList> | undefined;
  MerchantCreateInvoice: { presetFcfa?: number } | undefined;
  MerchantQr: MerchantQrParams;
  MerchantReceipt: { saleId: string };
};

export type TabParamList = {
  Home: undefined;
  Activity: undefined;
  Scanner: undefined;
  Services: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Welcome: undefined;
  Login:
    | { registeredEmail?: string; notice?: string; fromRegister?: boolean }
    | undefined;
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Confirm: {
    encodedInvoice: string;
    preview: PaymentPreview;
    amountOverride?: number;
  };
  Receive: undefined;
  TransferDestination: undefined;
  TransferBeneficiary: undefined;
  TransferAmount: undefined;
  TransferReview: undefined;
  TransferResult: { transferId?: string };
  Merchant: NavigatorScreenParams<MerchantStackParamList> | undefined;
  AssistantHome: undefined;
  AssistantChat: { conversationId: string; draftQuestion?: string };
};
