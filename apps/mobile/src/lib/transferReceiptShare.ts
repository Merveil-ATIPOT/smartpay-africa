import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";

import { isUserShareCancel } from "./transferReceipt";

export type ReceiptPdfOutcome = "shared" | "unavailable" | "cancelled";

export async function sharePlainMessage(message: string): Promise<void> {
  try {
    await Share.share({ message, title: "SmartPay Africa" });
  } catch (error) {
    if (isUserShareCancel(error)) {
      return;
    }
    throw error;
  }
}

export async function printAndShareHtml(html: string): Promise<ReceiptPdfOutcome> {
  const file = await Print.printToFileAsync({ html });
  if (!file.uri) {
    throw new Error("La génération du justificatif PDF a échoué.");
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return "unavailable";
  }
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Justificatif SmartPay Africa",
    });
    return "shared";
  } catch (error) {
    if (isUserShareCancel(error)) {
      return "cancelled";
    }
    throw error;
  }
}
