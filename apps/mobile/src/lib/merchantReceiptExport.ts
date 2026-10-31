import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { isUserShareCancel } from "./transferReceipt";
import { sharePlainMessage } from "./transferReceiptShare";

export type MerchantExportOutcome = "shared" | "printed" | "unavailable" | "cancelled";

export { sharePlainMessage };

export async function shareMerchantPdf(html: string): Promise<MerchantExportOutcome> {
  const file = await Print.printToFileAsync({ html });
  if (!file.uri) {
    throw new Error("La génération du spécimen PDF a échoué.");
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return "unavailable";
  }
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Spécimen SmartPay Africa",
    });
    return "shared";
  } catch (error) {
    if (isUserShareCancel(error)) {
      return "cancelled";
    }
    throw error;
  }
}

export async function printMerchantHtml(html: string): Promise<MerchantExportOutcome> {
  try {
    await Print.printAsync({ html });
    return "printed";
  } catch (error) {
    if (isUserShareCancel(error)) {
      return "cancelled";
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/printer|print service|not available|unavailable/i.test(message)) {
      return "unavailable";
    }
    throw error;
  }
}
