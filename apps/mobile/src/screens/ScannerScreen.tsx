import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { WalletConnection } from "@smartpay/contracts";

import { BrandMark, ErrorBanner } from "../components/ui";
import { DotLattice } from "../components/DotLattice";
import { ScanViewfinder } from "../components/ScanViewfinder";
import { assertCompatibleInvoice, classifyInvoice, InvoiceError, parseBolt11AmountSats } from "../lib/invoice";
import type { AppStackParamList, TabParamList } from "../navigation/types";
import { previewPayment } from "../services/payments";
import { fetchWallet } from "../services/wallet";
import { colors, radius, shadow, spacing } from "../theme";

export function ScannerScreen() {
  const tabs = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState("");
  const [mockAmount, setMockAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [lastPreview, setLastPreview] = useState<string | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    void fetchWallet()
      .then(setWallet)
      .catch(() => undefined);
  }, []);

  const provider = wallet?.provider ?? "mock";

  async function openPreview(raw: string) {
    if (lock.current || busy) {
      return;
    }
    setError(null);
    let encoded = "";
    try {
      encoded = assertCompatibleInvoice(raw, provider);
    } catch (err) {
      setError(err instanceof InvoiceError ? err.message : "Facture invalide.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const amountHint =
        parseBolt11AmountSats(encoded) ??
        (Number(mockAmount) > 0 ? Number(mockAmount) : undefined);
      if (classifyInvoice(encoded).kind === "mock" && !amountHint) {
        throw new InvoiceError(
          "incompatible",
          "Facture Mock sans montant. Saisissez le montant en sats avant l'aperçu.",
        );
      }
      const preview = await previewPayment({
        encodedInvoice: encoded,
        amountSats: amountHint,
      });
      setLastPreview(`${preview.amount_sats || "?"} sats · aperçu uniquement`);
      const parent = tabs.getParent<NativeStackNavigationProp<AppStackParamList>>();
      parent?.navigate("Confirm", { encodedInvoice: encoded, preview });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Décodage impossible.");
    } finally {
      setBusy(false);
      setTimeout(() => {
        lock.current = false;
      }, 800);
    }
  }

  async function pasteInvoice() {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      setError("Presse-papiers vide.");
      return;
    }
    setManual(text);
    await openPreview(text);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandCol}>
            <BrandMark compact />
            <View style={styles.demoPill}>
              <Text style={styles.demoText}>
                {provider === "lnd_regtest" ? "Mode Démonstration · Regtest" : "Mode Démonstration · Mock"}
              </Text>
            </View>
          </View>
          <View style={styles.avatar}>
            <Ionicons name="person" size={16} color={colors.white} />
          </View>
        </View>

        <View style={styles.cameraCard}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => {
                void openPreview(data);
              }}
            />
          ) : null}
          <LinearGradient
            colors={["rgba(20,27,44,0.55)", "rgba(13,19,34,0.35)", "rgba(20,27,44,0.7)"]}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <DotLattice />

          <View style={styles.cameraChrome}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour"
              onPress={() => tabs.navigate("Home")}
              style={styles.chromeBtn}
            >
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </Pressable>
            <View style={styles.cameraTitles}>
              <Text style={styles.cameraTitle}>Scanner QR</Text>
              <View style={styles.regionPill}>
                <View style={styles.regionDot} />
                <Text style={styles.regionText}>RÉGION OUEST · REGTEST</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={torch ? "Éteindre la torche" : "Activer la torche"}
              onPress={() => setTorch((value) => !value)}
              style={[styles.chromeBtn, torch && styles.chromeBtnOn]}
            >
              <Ionicons name={torch ? "flash" : "flash-off"} size={20} color={colors.white} />
            </Pressable>
          </View>

          {permission?.granted ? (
            <ScanViewfinder />
          ) : (
            <View style={styles.permission}>
              <Text style={styles.permissionText}>
                La caméra sert uniquement à lire une facture BOLT11. Aucun paiement n'est déclenché au scan.
              </Text>
              <Pressable style={styles.permitBtn} onPress={() => void requestPermission()}>
                <Text style={styles.permitText}>Autoriser la caméra</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.hintPill}>
            <Ionicons name="flash" size={16} color={colors.stitchOrange} />
            <Text style={styles.hintText}>Pointez vers un code BOLT11, LNURL ou PayRequest</Text>
          </View>

          {lastPreview ? (
            <View style={styles.lastPill}>
              <View style={styles.lastIcon}>
                <Ionicons name="time-outline" size={16} color={colors.stitchOrange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lastKicker}>DERNIER APERÇU (CETTE SESSION)</Text>
                <Text style={styles.lastValue} numberOfLines={1}>
                  {lastPreview}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.actionRow}>
          <Pressable style={styles.actionCard} onPress={() => void pasteInvoice()}>
            <View style={styles.pasteIcon}>
              <Ionicons name="clipboard-outline" size={20} color="#6B3B00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle} numberOfLines={1}>
                Coller facture
              </Text>
              <Text style={styles.actionSub}>Presse-papiers</Text>
            </View>
          </Pressable>
          <View style={[styles.actionCard, styles.actionDisabled]}>
            <View style={styles.galleryIcon}>
              <Ionicons name="images-outline" size={20} color={colors.stitchNavy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle} numberOfLines={1}>
                Importer image
              </Text>
              <Text style={styles.actionSub}>Non disponible P03</Text>
            </View>
          </View>
        </View>

        <View style={styles.manual}>
          <View style={styles.manualHead}>
            <View style={styles.manualTitleRow}>
              <Ionicons name="at" size={18} color={colors.stitchOrange} />
              <Text style={styles.manualTitle}>Saisie manuelle</Text>
            </View>
            <View style={styles.feePill}>
              <Text style={styles.feeText}>0 FRAIS LN</Text>
            </View>
          </View>
          <View style={styles.manualField}>
            <TextInput
              value={manual}
              onChangeText={setManual}
              placeholder="lnbcrt… ou mockln1…"
              placeholderTextColor={colors.stitchOnVariant}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Pressable
              style={[styles.validate, (!manual.trim() || busy) && styles.validateOff]}
              disabled={!manual.trim() || busy}
              onPress={() => {
                const kind = classifyInvoice(manual);
                if (kind.error) {
                  setError(kind.error);
                  return;
                }
                void openPreview(manual);
              }}
            >
              <Text style={styles.validateText}>{busy ? "…" : "Valider"}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.white} />
            </Pressable>
          </View>
          <TextInput
            value={mockAmount}
            onChangeText={setMockAmount}
            placeholder="Montant sats (requis pour une facture mockln1)"
            placeholderTextColor={colors.stitchOnVariant}
            keyboardType="number-pad"
            style={styles.amountInput}
          />
          <Text style={styles.fine}>
            Valider appelle POST /payments/preview/ uniquement. Aucun paiement n'est envoyé ici.
          </Text>
        </View>

        <View style={styles.trust}>
          <Ionicons name="shield-checkmark" size={16} color={colors.stitchGreen} />
          <Text style={styles.trustText}>
            Règlement instantané cryptographique sans intermédiaire bancaire
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 120, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandCol: { gap: 4 },
  demoPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.stitchPeach,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  demoText: { color: "#2D1600", fontSize: 11, fontWeight: "600" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraCard: {
    minHeight: 460,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.stitchNavy,
    padding: spacing.md,
    justifyContent: "space-between",
    gap: 12,
  },
  cameraChrome: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 2 },
  chromeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(217,227,251,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  chromeBtnOn: { backgroundColor: colors.stitchOrange },
  cameraTitles: { alignItems: "center", flex: 1 },
  cameraTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  regionPill: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,220,191,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  regionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.stitchOrange },
  regionText: { color: colors.stitchPeach, fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  permission: { alignItems: "center", gap: 12, paddingVertical: 32, zIndex: 2 },
  permissionText: { color: "#D9E3FB", textAlign: "center", paddingHorizontal: 12 },
  permitBtn: {
    backgroundColor: colors.stitchOrange,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  permitText: { color: colors.white, fontWeight: "700" },
  hintPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(20,27,44,0.8)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 2,
  },
  hintText: { color: "#D9E3FB", fontSize: 12, fontWeight: "500" },
  lastPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(217,227,251,0.18)",
    borderRadius: 12,
    padding: 12,
    zIndex: 2,
  },
  lastIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(254,152,33,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  lastKicker: { color: "#C6C6CD", fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  lastValue: { color: colors.white, fontSize: 12, fontWeight: "600", marginTop: 2 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionCard: {
    flex: 1,
    minHeight: 64,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.card,
  },
  actionDisabled: { opacity: 0.55 },
  pasteIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.stitchPeach,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.stitchBlueHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { color: colors.stitchNavy, fontWeight: "700", fontSize: 14 },
  actionSub: { color: colors.stitchOnVariant, fontSize: 12, marginTop: 2 },
  manual: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    gap: 12,
    ...shadow.card,
  },
  manualHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  manualTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  manualTitle: { color: colors.stitchNavy, fontSize: 18, fontWeight: "700" },
  feePill: {
    backgroundColor: colors.stitchBlue,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  feeText: { color: colors.stitchOnVariant, fontSize: 10, fontWeight: "700" },
  manualField: { position: "relative", justifyContent: "center" },
  input: {
    minHeight: 52,
    backgroundColor: colors.stitchBlueLow,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 100,
    color: colors.stitchNavy,
    fontSize: 14,
  },
  validate: {
    position: "absolute",
    right: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.stitchNavy,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  validateOff: { opacity: 0.45 },
  validateText: { color: colors.white, fontWeight: "700", fontSize: 12 },
  amountInput: {
    minHeight: 44,
    backgroundColor: colors.stitchBlueLow,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: colors.stitchNavy,
  },
  fine: { color: colors.stitchOnVariant, fontSize: 11, lineHeight: 16 },
  trust: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  trustText: { color: colors.stitchOnVariant, fontSize: 12, flex: 1 },
});
