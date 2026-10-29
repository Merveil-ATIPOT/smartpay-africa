import type { InternationalTransfer } from "@smartpay/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { newIdempotencyKey } from "../lib/confirmLock";
import {
  EMPTY_DRAFT,
  applyAmount,
  applyBeneficiary,
  createLocalPreview,
  selectCountry,
  type DemoPreview,
  type TransferDraft,
  type TransferSessionMode,
} from "../lib/transferDraft";
import type { DestinationCode, OperatorId } from "../lib/transferCorridors";
import { isSettledOrBusy } from "../lib/transferStatus";

function freshDraft(mode: TransferSessionMode = "backend"): TransferDraft {
  return { ...EMPTY_DRAFT, mode, draftKey: newIdempotencyKey() };
}

function applyServer(current: TransferDraft, transfer: InternationalTransfer): TransferDraft {
  return {
    ...current,
    mode: "backend",
    transferId: transfer.id,
    publicReference: transfer.public_reference,
    serverStatus: transfer.status,
    destinationCode: (transfer.destination_country as DestinationCode) || current.destinationCode,
    operator: (transfer.operator as OperatorId) || current.operator,
    beneficiaryName: transfer.beneficiary_name || current.beneficiaryName,
    amountFcfa: transfer.amount_local || current.amountFcfa,
    quoteExpiresAt: transfer.quote_expires_at,
    quoteCurrent: transfer.quote_current,
    serverAmountSats: transfer.amount_sats,
    serverFeeSats: transfer.fee_sats,
    serverTotalSats: transfer.total_sats,
    serverRate: transfer.demo_rate_fcfa_per_btc,
    quoteVersion: transfer.quote_version,
  };
}

type TransferContextValue = {
  draft: TransferDraft;
  preview: DemoPreview | null;
  setCountry: (code: DestinationCode) => void;
  setBeneficiary: (input: {
    operator: OperatorId;
    beneficiaryName: string;
    phone: string;
    reason: string;
  }) => void;
  setAmount: (amountFcfa: number, availableSats: number) => void;
  setAvailableSats: (availableSats: number) => void;
  setSourceCountry: (code: DestinationCode | null) => void;
  setMode: (mode: TransferSessionMode) => void;
  attachServer: (transfer: InternationalTransfer) => void;
  beginNewFlow: () => void;
  launchDemo: () => DemoPreview | null;
  reset: () => void;
};

const TransferContext = createContext<TransferContextValue | undefined>(undefined);

export function TransferDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<TransferDraft>(() => freshDraft());
  const [preview, setPreview] = useState<DemoPreview | null>(null);

  const setCountry = useCallback((code: DestinationCode) => {
    setPreview(null);
    setDraft((current) => selectCountry(current, code));
  }, []);

  const setBeneficiary = useCallback(
    (input: { operator: OperatorId; beneficiaryName: string; phone: string; reason: string }) => {
      setPreview(null);
      setDraft((current) => applyBeneficiary(current, input));
    },
    [],
  );

  const setAmount = useCallback((amountFcfa: number, availableSats: number) => {
    setPreview(null);
    setDraft((current) => applyAmount(current, amountFcfa, availableSats));
  }, []);

  const setAvailableSats = useCallback((availableSats: number) => {
    setDraft((current) => ({ ...current, availableSats }));
  }, []);

  const setSourceCountry = useCallback((code: DestinationCode | null) => {
    setDraft((current) => ({ ...current, sourceCountry: code }));
  }, []);

  const setMode = useCallback((mode: TransferSessionMode) => {
    setDraft((current) => ({ ...current, mode }));
  }, []);

  const attachServer = useCallback((transfer: InternationalTransfer) => {
    setDraft((current) => applyServer(current, transfer));
  }, []);

  const beginNewFlow = useCallback(() => {
    setDraft((current) => {
      if (isSettledOrBusy(current.serverStatus)) {
        return freshDraft(current.mode);
      }
      if (!current.draftKey) {
        return { ...current, draftKey: newIdempotencyKey() };
      }
      return current;
    });
    setPreview(null);
  }, []);

  const launchDemo = useCallback(() => {
    const created = createLocalPreview(draft);
    if (!created) {
      return null;
    }
    setPreview(created);
    setDraft((current) => ({ ...current, status: "demo_preview", mode: "demo" }));
    return created;
  }, [draft]);

  const reset = useCallback(() => {
    setDraft(freshDraft());
    setPreview(null);
  }, []);

  const value = useMemo(
    () => ({
      draft,
      preview,
      setCountry,
      setBeneficiary,
      setAmount,
      setAvailableSats,
      setSourceCountry,
      setMode,
      attachServer,
      beginNewFlow,
      launchDemo,
      reset,
    }),
    [
      draft,
      preview,
      setCountry,
      setBeneficiary,
      setAmount,
      setAvailableSats,
      setSourceCountry,
      setMode,
      attachServer,
      beginNewFlow,
      launchDemo,
      reset,
    ],
  );

  return <TransferContext.Provider value={value}>{children}</TransferContext.Provider>;
}

export function useTransferDraft(): TransferContextValue {
  const value = useContext(TransferContext);
  if (!value) {
    throw new Error("useTransferDraft doit être utilisé dans TransferDraftProvider.");
  }
  return value;
}
