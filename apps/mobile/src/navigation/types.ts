import type { PaymentPreview } from "@smartpay/contracts";

export type AppStackParamList = {
  Login: undefined;
  Tabs: undefined;
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
};

export type TabParamList = {
  Home: undefined;
  Activity: undefined;
  Scanner: undefined;
  Services: undefined;
  Profile: undefined;
};
