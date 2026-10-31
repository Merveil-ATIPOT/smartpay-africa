import { normalizeInvoice } from "./invoice";

export function scannedInvoiceKey(raw: string): string {
  return normalizeInvoice(raw);
}

/** Ignore le même QR tant que le scanner n'a pas été quitté volontairement. */
export function shouldIgnoreBarcode(input: {
  focused: boolean;
  scanned: string;
  suppressed: string | null;
}): boolean {
  if (!input.focused) {
    return true;
  }
  const key = scannedInvoiceKey(input.scanned);
  return Boolean(key && input.suppressed && key === input.suppressed);
}

export function nextSuppressedOnFocus(
  returnedFromPreview: boolean,
  current: string | null,
): string | null {
  return returnedFromPreview ? current : null;
}

/** Accueil / autre onglet = départ volontaire : le même QR pourra être relu. */
export function shouldClearSuppressForTab(tabName: string | undefined): boolean {
  return Boolean(tabName && tabName !== "Scanner");
}
