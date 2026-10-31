import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { MerchantHeader, MerchantSmartPayExit } from "../components/MerchantChrome";
import { formatSats } from "../lib/format";
import {
  DEMO_RATE_LINE,
  DEMO_SHOP,
  MERCHANT_QR_DISCLAIMER,
  buildDemoQrPayload,
  looksLikeBolt11,
} from "../lib/merchantDemo";
import { isUserShareCancel } from "../lib/transferReceipt";
import { sharePlainMessage } from "../lib/transferReceiptShare";
import { goMerchantCaisse } from "../lib/merchantNavigation";
import type { MerchantStackParamList } from "../navigation/types";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<MerchantStackParamList, "MerchantQr">;

export function MerchantQrScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const { amountFcfa, amountSats, note, expiryMinutes, till, reference } = route.params;
  const payload = useMemo(() => buildDemoQrPayload(reference, amountFcfa), [reference, amountFcfa]);
  const qrSize = Math.min(240, Math.max(180, width - 96));
  const unsafe = looksLikeBolt11(payload);
  const [copied, setCopied] = useState(false);

  async function shareReference() {
    try {
      await sharePlainMessage(
        [
          "SmartPay Africa — référence de démonstration",
          reference,
          MERCHANT_QR_DISCLAIMER,
          "Aucun règlement n'est exécuté.",
        ].join("\n"),
      );
    } catch (error) {
      if (isUserShareCancel(error)) {
        return;
      }
      Alert.alert("Partage impossible", "La référence n'a pas été partagée.");
    }
  }

  async function copyPayload() {
    await Clipboard.setStringAsync(payload);
    setCopied(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <MerchantHeader title="QR d'encaissement" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Ionicons name="warning-outline" size={18} color="#B54708" />
          <Text style={styles.bannerText}>{MERCHANT_QR_DISCLAIMER}</Text>
        </View>

        <Text style={styles.shop}>
          {DEMO_SHOP.name} · {till}
        </Text>

        <View style={styles.navy}>
          <Text style={styles.kicker}>Montant demandé (démo)</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{formatSats(amountFcfa)}</Text>
            <Text style={styles.unit}>FCFA</Text>
          </View>
          <Text style={styles.sub}>≈ {formatSats(amountSats)} sats</Text>
          <Text style={styles.rate}>{DEMO_RATE_LINE}</Text>
        </View>

        <View style={styles.qrCard}>
          <Text style={styles.expire}>Expiration indicative · {expiryMinutes} min · non contractuelle</Text>
          {unsafe ? (
            <Text style={styles.unsafe}>QR bloqué : payload trop proche d'une facture Lightning.</Text>
          ) : (
            <View style={styles.qrWrap}>
              <QRCode value={payload} size={qrSize} color={colors.navy} backgroundColor={colors.white} />
            </View>
          )}
          <Text style={styles.refLabel}>Référence lisible</Text>
          <Text style={styles.ref}>{reference}</Text>
          <Text style={styles.note}>{note || "Sans note"}</Text>
        </View>

        <Pressable style={styles.secondary} onPress={() => void shareReference()}>
          <Ionicons name="share-outline" size={18} color={colors.navy} />
          <Text style={styles.secondaryText}>Partager la référence</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => void copyPayload()}>
          <Ionicons name="copy-outline" size={18} color={colors.navy} />
          <Text style={styles.secondaryText}>{copied ? "Données du QR copiées" : "Copier les données du QR"}</Text>
        </Pressable>
        <Pressable
          style={styles.ghost}
          onPress={() =>
            Alert.alert("Annulation locale", "Le brouillon démo est abandonné. Aucune facture LND n'existait.", [
              { text: "OK", onPress: () => goMerchantCaisse(navigation) },
            ])
          }
        >
          <Text style={styles.ghostText}>Annuler le brouillon</Text>
        </Pressable>
        <Pressable style={styles.back} onPress={() => goMerchantCaisse(navigation)}>
          <Text style={styles.secondaryText}>Retour à la caisse</Text>
        </Pressable>
        <MerchantSmartPayExit />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 32, gap: 12, width: "100%", alignItems: "stretch" },
  banner: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FEF0C7",
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FEDF89",
  },
  bannerText: { flex: 1, color: "#7A2E0E", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  shop: { color: colors.muted, fontSize: 13 },
  navy: {
    width: "100%",
    backgroundColor: colors.stitchNavy,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: 6,
  },
  kicker: { color: "#BFC6DC", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  amount: { color: colors.white, fontSize: 32, fontWeight: "800" },
  unit: { color: colors.stitchOrange, fontSize: 18, fontWeight: "800" },
  sub: { color: "#FFB874", fontWeight: "700" },
  rate: { color: "#7C8498", fontSize: 11, textAlign: "center" },
  qrCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: 10,
    ...shadow.card,
  },
  expire: { color: colors.muted, fontSize: 12, textAlign: "center" },
  qrWrap: { padding: 12, backgroundColor: colors.white },
  refLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  ref: { color: colors.navy, fontWeight: "800" },
  note: { color: colors.muted, fontSize: 13, textAlign: "center" },
  unsafe: { color: colors.danger, fontWeight: "700", textAlign: "center" },
  secondary: {
    width: "100%",
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadow.card,
  },
  secondaryText: { color: colors.navy, fontWeight: "700" },
  ghost: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  ghostText: { color: colors.muted, fontWeight: "700" },
  back: {
    width: "100%",
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.stitchBlueLow,
    alignItems: "center",
    justifyContent: "center",
  },
});
