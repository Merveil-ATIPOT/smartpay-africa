import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MerchantHeader, MerchantSmartPayExit } from "../components/MerchantChrome";
import { formatSats } from "../lib/format";
import {
  DEMO_RATE_LINE,
  DEMO_RECEIPT_DATE,
  DEMO_SHOP,
  MERCHANT_RECEIPT_DISCLAIMER,
  getSaleById,
  merchantSatsFromFcfa,
  saleStatusLabel,
} from "../lib/merchantDemo";
import { merchantReceiptHtml, merchantReceiptShareMessage } from "../lib/merchantReceipt";
import { printMerchantHtml, shareMerchantPdf, sharePlainMessage } from "../lib/merchantReceiptExport";
import { isUserShareCancel } from "../lib/transferReceipt";
import { userFacingRequestError } from "../services/errors";
import { goMerchantCaisse } from "../lib/merchantNavigation";
import type { MerchantStackParamList } from "../navigation/types";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<MerchantStackParamList, "MerchantReceipt">;

export function MerchantReceiptScreen({ navigation, route }: Props) {
  const sale = getSaleById(route.params.saleId);
  const [exporting, setExporting] = useState(false);

  if (!sale) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <MerchantHeader title="Reçu marchand" />
        <Text style={styles.missing}>Reçu introuvable.</Text>
      </SafeAreaView>
    );
  }

  const documented = sale;
  const sats = merchantSatsFromFcfa(documented.amountFcfa);

  async function onShare() {
    if (exporting) {
      return;
    }
    setExporting(true);
    try {
      await sharePlainMessage(merchantReceiptShareMessage(documented, DEMO_SHOP));
    } catch (error) {
      if (isUserShareCancel(error)) {
        return;
      }
      Alert.alert("Partage impossible", userFacingRequestError(error, "Le spécimen n'a pas été partagé."));
    } finally {
      setExporting(false);
    }
  }

  async function onPdf() {
    if (exporting) {
      return;
    }
    setExporting(true);
    try {
      const outcome = await shareMerchantPdf(merchantReceiptHtml(documented, DEMO_SHOP));
      if (outcome === "unavailable") {
        Alert.alert(
          "Partage indisponible",
          "Le spécimen PDF n'a pas pu être partagé depuis cet appareil. Aucun fichier n'a été enregistré de façon permanente.",
        );
      }
    } catch (error) {
      if (isUserShareCancel(error)) {
        return;
      }
      Alert.alert("Justificatif PDF", userFacingRequestError(error, "La génération du spécimen a échoué."));
    } finally {
      setExporting(false);
    }
  }

  async function onPrint() {
    if (exporting) {
      return;
    }
    setExporting(true);
    try {
      const outcome = await printMerchantHtml(merchantReceiptHtml(documented, DEMO_SHOP));
      if (outcome === "unavailable") {
        Alert.alert(
          "Impression indisponible",
          "Aucun service d'impression n'est disponible sur cet appareil. Aucune imprimante Bluetooth n'a été recherchée.",
        );
      }
    } catch (error) {
      if (isUserShareCancel(error)) {
        return;
      }
      Alert.alert("Impression", userFacingRequestError(error, "L'impression du spécimen a échoué."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <MerchantHeader title="Reçu de paiement" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.check}>
            <Ionicons name="document-text-outline" size={28} color={colors.orange} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Exemple de reçu · spécimen</Text>
          </View>
          <Text style={styles.heroTitle}>Aucun paiement confirmé</Text>
          <Text style={styles.heroBody}>{MERCHANT_RECEIPT_DISCLAIMER}</Text>
        </View>

        <View style={styles.receipt}>
          <View style={styles.receiptHead}>
            <Text style={styles.headKicker}>SmartPay Business · Spécimen</Text>
            <Text style={styles.shop}>{DEMO_SHOP.name}</Text>
            <Text style={styles.headMeta}>
              {DEMO_SHOP.city} · {DEMO_SHOP.id}
            </Text>
          </View>
          <View style={styles.amountBlock}>
            <Text style={styles.label}>Montant (démonstration)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amount}>{formatSats(documented.amountFcfa)}</Text>
              <Text style={styles.unit}>FCFA</Text>
            </View>
            <Text style={styles.sats}>~{formatSats(sats)} sats · équivalent indicatif</Text>
          </View>
          <View style={styles.rows}>
            <Row label="Date" value={DEMO_RECEIPT_DATE} />
            <Row label="Référence (fictive)" value={`SP-DEMO-${documented.id}`} />
            <Row label="Caisse / commande" value={`#${documented.id} · ${DEMO_SHOP.till}`} />
            <Row label="Libellé" value={documented.label} />
            <Row label="Statut" value={saleStatusLabel(documented.status)} />
            <Row label="Réseau" value="Aucune session Lightning réelle" />
            <Row label="Frais réseau" value="Non confirmés · démonstration" />
            <Row label="Taux utilisé" value={DEMO_RATE_LINE} />
          </View>
          <View style={styles.lightning}>
            <Ionicons name="shield-outline" size={20} color="#B54708" />
            <View style={styles.flex}>
              <Text style={styles.lightningTitle}>Statut Lightning</Text>
              <Text style={styles.lightningBody}>
                Illustration uniquement. Pas de lookup LND, pas de préimage, pas de preuve cryptographique.
              </Text>
              <Text style={styles.specimen}>Spécimen · non vérifié</Text>
            </View>
          </View>
        </View>

        <Pressable style={[styles.navyBtn, exporting && styles.busy]} onPress={() => void onPrint()} disabled={exporting}>
          <Ionicons name="print-outline" size={18} color={colors.white} />
          <Text style={styles.navyBtnText}>{exporting ? "Préparation…" : "Imprimer"}</Text>
        </Pressable>
        <View style={styles.rowBtns}>
          <Pressable style={[styles.half, exporting && styles.busy]} onPress={() => void onShare()} disabled={exporting}>
            <Text style={styles.halfText}>Partager</Text>
          </Pressable>
          <Pressable style={[styles.half, exporting && styles.busy]} onPress={() => void onPdf()} disabled={exporting}>
            <Text style={styles.halfText}>PDF</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.cta}
          onPress={() => navigation.navigate("MerchantCreateInvoice", { presetFcfa: documented.amountFcfa })}
        >
          <Text style={styles.ctaText}>Nouvelle facture</Text>
        </Pressable>
        <Pressable style={styles.back} onPress={() => goMerchantCaisse(navigation)}>
          <Text style={styles.halfText}>Retour à la caisse</Text>
        </Pressable>
        <MerchantSmartPayExit />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 32, gap: 12, width: "100%" },
  missing: { padding: spacing.md, color: colors.muted, textAlign: "center" },
  hero: { width: "100%", alignItems: "center", gap: 8, paddingVertical: 8 },
  check: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: { backgroundColor: "#FEF0C7", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: "#B54708", fontSize: 11, fontWeight: "800" },
  heroTitle: { color: colors.navy, fontSize: 22, fontWeight: "800", textAlign: "center" },
  heroBody: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 18 },
  receipt: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
    ...shadow.card,
  },
  receiptHead: { backgroundColor: colors.stitchNavy, padding: spacing.md, alignItems: "center", gap: 4 },
  headKicker: { color: colors.stitchOrange, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  shop: { color: colors.white, fontSize: 18, fontWeight: "800", textAlign: "center" },
  headMeta: { color: "#BFC6DC", fontSize: 12, textAlign: "center" },
  amountBlock: { padding: spacing.md, alignItems: "center", gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  amount: { color: colors.navy, fontSize: 32, fontWeight: "800" },
  unit: { color: colors.orange, fontSize: 18, fontWeight: "800" },
  sats: { color: colors.muted, fontSize: 13 },
  rows: { padding: spacing.md, gap: 12 },
  kv: { width: "100%", gap: 2 },
  kvLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  kvValue: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  lightning: {
    margin: spacing.md,
    marginTop: 0,
    backgroundColor: colors.stitchBlueLow,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  flex: { flex: 1, minWidth: 0 },
  lightningTitle: { color: colors.navy, fontWeight: "800" },
  lightningBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  specimen: { color: "#B54708", fontSize: 11, fontWeight: "800", marginTop: 8, textTransform: "uppercase" },
  navyBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  navyBtnText: { color: colors.white, fontWeight: "700" },
  busy: { opacity: 0.55 },
  rowBtns: { flexDirection: "row", gap: 8, width: "100%" },
  half: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  halfText: { color: colors.navy, fontWeight: "700" },
  cta: {
    width: "100%",
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.stitchOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: colors.navy, fontWeight: "800" },
  back: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
