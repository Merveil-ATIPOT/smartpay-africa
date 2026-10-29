import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { WalletConnection } from "@smartpay/contracts";

import { BrandMark, ErrorBanner, ModeBanner, PrimaryButton } from "../components/ui";
import { assertCompatibleInvoice, classifyInvoice, InvoiceError, parseBolt11AmountSats } from "../lib/invoice";
import type { AppStackParamList } from "../navigation/types";
import { previewPayment } from "../services/payments";
import { fetchWallet } from "../services/wallet";
import { colors, radius, spacing } from "../theme";

export function ScannerScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState("");
  const [mockAmount, setMockAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [lastLabel, setLastLabel] = useState<string | null>(null);
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
      setLastLabel(`${preview.amount_sats || "?"} sats · aperçu uniquement`);
      const parent = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BrandMark compact />
          <View style={styles.avatar}>
            <Ionicons name="person" size={16} color={colors.navy} />
          </View>
        </View>
        <ModeBanner provider={provider} lightningConnected={wallet?.is_lightning_connected} />

        <View style={styles.cameraCard}>
          <Text style={styles.cameraTitle}>Scanner QR</Text>
          <Text style={styles.cameraSub}>RÉGION OUEST · REGTEST</Text>
          {permission?.granted ? (
            <View style={styles.viewfinder}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => {
                  void openPreview(data);
                }}
              />
              <View style={styles.frame} pointerEvents="none" />
              <Text style={styles.align}>ALIGNER LA FACTURE</Text>
            </View>
          ) : (
            <View style={styles.permission}>
              <Text style={styles.permissionText}>
                La caméra sert uniquement à lire une facture BOLT11. Aucun paiement n'est déclenché au scan.
              </Text>
              <PrimaryButton label="Autoriser la caméra" onPress={() => void requestPermission()} />
            </View>
          )}
          <Text style={styles.hint}>Pointez un QR BOLT11. LNURL et Mainnet sont rejetés.</Text>
          {lastLabel ? <Text style={styles.last}>Dernier aperçu : {lastLabel}</Text> : null}
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.row}>
          <Pressable style={styles.side} onPress={() => void pasteInvoice()}>
            <Ionicons name="clipboard-outline" size={20} color={colors.orange} />
            <Text style={styles.sideTitle}>Coller facture</Text>
            <Text style={styles.sideSub}>Presse-papiers</Text>
          </Pressable>
          <Pressable
            style={styles.side}
            onPress={() =>
              Alert.alert(
                "Import image",
                "Le décodage depuis la galerie n'est pas inclus en P03. Collez la facture ou utilisez la caméra.",
              )
            }
          >
            <Ionicons name="image-outline" size={20} color={colors.navy} />
            <Text style={styles.sideTitle}>Importer image</Text>
            <Text style={styles.sideSub}>Non disponible P03</Text>
          </Pressable>
        </View>

        <View style={styles.manual}>
          <Text style={styles.manualTitle}>Saisie manuelle</Text>
          <TextInput
            value={manual}
            onChangeText={setManual}
            placeholder="lnbcrt… ou mockln1…"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={styles.input}
          />
          <TextInput
            value={mockAmount}
            onChangeText={setMockAmount}
            placeholder="Montant sats (requis pour mockln1)"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={styles.amountInput}
          />
          <PrimaryButton
            label={busy ? "Vérification…" : "Valider l'aperçu"}
            onPress={() => {
              const kind = classifyInvoice(manual);
              if (kind.error) {
                setError(kind.error);
                return;
              }
              void openPreview(manual);
            }}
            loading={busy}
            disabled={!manual.trim()}
          />
          <Text style={styles.fine}>
            Cette action appelle POST /payments/preview/ uniquement. Aucun POST /payments/ n'est envoyé ici.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray },
  content: { padding: spacing.md, paddingBottom: 120, gap: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraCard: {
    backgroundColor: colors.navy,
    borderRadius: 24,
    padding: spacing.md,
    gap: 8,
  },
  cameraTitle: { color: colors.white, fontWeight: "800", fontSize: 18, textAlign: "center" },
  cameraSub: { color: colors.orange, fontSize: 11, fontWeight: "700", textAlign: "center" },
  viewfinder: {
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 180,
    height: 180,
    borderColor: colors.orange,
    borderWidth: 3,
    borderRadius: 16,
  },
  align: { position: "absolute", bottom: 12, color: "#98A2B3", fontSize: 11, letterSpacing: 1 },
  permission: { gap: 12, paddingVertical: spacing.md },
  permissionText: { color: "#D0D5DD", textAlign: "center" },
  hint: { color: "#D0D5DD", fontSize: 12, textAlign: "center" },
  last: { color: colors.green, fontSize: 12, textAlign: "center" },
  row: { flexDirection: "row", gap: 8 },
  side: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  sideTitle: { color: colors.navy, fontWeight: "700" },
  sideSub: { color: colors.muted, fontSize: 11 },
  manual: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 10 },
  manualTitle: { color: colors.navy, fontWeight: "800" },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.navy,
    textAlignVertical: "top",
  },
  amountInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    color: colors.navy,
  },
  fine: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
