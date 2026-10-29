import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Payment, WalletConnection } from "@smartpay/contracts";

import { ErrorBanner } from "../components/ui";
import { FCFA_DISCLAIMER, formatSats, remainingLabel, shortenInvoice } from "../lib/format";
import { isLightningSuccess, settlementCaption, statusLabel, uiPaymentState } from "../lib/paymentStatus";
import type { AppStackParamList } from "../navigation/types";
import { createInvoice, fetchPayment } from "../services/payments";
import { fetchWallet } from "../services/wallet";
import { colors, shadow, spacing } from "../theme";

const CHIPS = [5_000, 10_000, 50_000];

type Props = NativeStackScreenProps<AppStackParamList, "Receive">;

export function ReceiveScreen({ navigation }: Props) {
  const [amount, setAmount] = useState(50_000);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void fetchWallet()
      .then(setWallet)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!payment?.id) {
      return;
    }
    if (payment.is_lightning_settled || payment.status === "failed" || payment.status === "expired") {
      return;
    }
    const timer = setInterval(() => {
      void fetchPayment(payment.id)
        .then(setPayment)
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [payment?.id, payment?.is_lightning_settled, payment?.status]);

  const encoded = payment?.invoice?.encoded_invoice ?? "";
  const isMockInvoice =
    payment?.invoice?.is_mock || payment?.settlement_mode === "mock" || encoded.startsWith("mockln");
  const state = payment ? uiPaymentState(payment) : null;
  const paid = payment ? isLightningSuccess(payment) : false;
  const isLnd = wallet?.provider === "lnd_regtest";
  const countdown = remainingLabel(payment?.expires_at, now);

  async function onCreate() {
    setError(null);
    setBusy(true);
    try {
      const created = await createInvoice({
        amount_sats: amount,
        memo: "Facture SmartPay Africa P03",
        expiry_seconds: 3600,
      });
      setPayment(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création de facture impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvoice() {
    if (!encoded) {
      return;
    }
    await Clipboard.setStringAsync(encoded);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.nav}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.navBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.stitchNavy} />
          </Pressable>
          <View style={styles.navLogo}>
            <Ionicons name="flash" size={14} color={colors.white} />
          </View>
          <Text style={styles.navTitle}>Émission De Facture</Text>
          <View style={styles.regtestPill}>
            <Text style={styles.regtestText}>{isLnd ? "Regtest" : "Mock"}</Text>
          </View>
          <View style={styles.avatar}>
            <Ionicons name="person" size={16} color={colors.white} />
          </View>
        </View>

        <View style={styles.modeRow}>
          <View style={styles.demoPill}>
            <View style={styles.demoDot} />
            <Text style={styles.demoText}>
              {isLnd ? "MODE DÉMONSTRATION · REGTEST" : "MODE DÉMONSTRATION · MOCK"}
            </Text>
          </View>
          <View style={[styles.netPill, !wallet?.is_lightning_connected && styles.netPillOff]}>
            <Ionicons
              name="flash"
              size={14}
              color={wallet?.is_lightning_connected ? colors.stitchGreen : colors.stitchOnVariant}
            />
            <Text
              style={[
                styles.netText,
                !wallet?.is_lightning_connected && { color: colors.stitchOnVariant },
              ]}
            >
              {wallet?.is_lightning_connected ? "Réseau Lightning Actif" : "Lightning non connecté"}
            </Text>
          </View>
        </View>

        <View style={styles.amountCard}>
          <View style={styles.glow} />
          <View style={styles.rowBetween}>
            <Text style={styles.kicker}>Montant demandé</Text>
            <View style={styles.instantPill}>
              <Text style={styles.instantText}>Facture instantanée</Text>
            </View>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{formatSats(amount)}</Text>
            <Text style={styles.sats}>SATS</Text>
          </View>
          <Text style={styles.fcfa}>{FCFA_DISCLAIMER}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {CHIPS.map((value) => {
              const selected = amount === value && !customOpen;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setAmount(value);
                    setCustom("");
                    setCustomOpen(false);
                  }}
                  style={[styles.chip, selected && styles.chipOn]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                    {value === 50_000 ? formatSats(value) : `+${formatSats(value)}`}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setCustomOpen(true)}
              style={[styles.chip, customOpen && styles.chipOn]}
            >
              <Ionicons name="pencil" size={14} color={customOpen ? "#663800" : colors.white} />
              <Text style={[styles.chipText, customOpen && styles.chipTextOn]}>Montant libre</Text>
            </Pressable>
          </ScrollView>
          {customOpen ? (
            <TextInput
              keyboardType="number-pad"
              value={custom}
              placeholder="Montant libre (sats)"
              placeholderTextColor="#7C8498"
              onChangeText={(value) => {
                setCustom(value);
                const parsed = Number(value);
                if (Number.isInteger(parsed) && parsed > 0) {
                  setAmount(parsed);
                }
              }}
              style={styles.customInput}
            />
          ) : null}
          <Pressable style={styles.generate} onPress={() => void onCreate()} disabled={busy}>
            <Text style={styles.generateText}>{busy ? "Création…" : "Générer la facture"}</Text>
          </Pressable>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        {payment && encoded ? (
          <View style={styles.qrCard}>
            <View style={styles.qrHead}>
              <View style={styles.timerRow}>
                <Ionicons name="time-outline" size={16} color="#8C4F00" />
                <Text style={styles.expire}>
                  {countdown === "Expirée" ? "Facture expirée" : `Expire dans ${countdown ?? "—"}`}
                </Text>
              </View>
              <Pressable
                style={styles.refreshBtn}
                onPress={() => void fetchPayment(payment.id).then(setPayment)}
              >
                <Ionicons name="refresh" size={16} color={colors.stitchOnVariant} />
                <Text style={styles.refresh}>Actualiser</Text>
              </Pressable>
            </View>

            <View style={styles.qrFrame}>
              <View style={styles.qrInner}>
                <QRCode value={encoded} size={200} color={colors.stitchNavy} backgroundColor={colors.white} />
                <View style={styles.qrLogo} pointerEvents="none">
                  <View style={styles.qrLogoInner}>
                    <Ionicons name="flash" size={18} color={colors.stitchOrange} />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.invoiceBar}>
              <Ionicons name="flash" size={16} color={colors.stitchOrange} />
              <Text style={styles.invoice} numberOfLines={1}>
                {shortenInvoice(encoded, 18, 10)}
              </Text>
              <Pressable onPress={() => void copyInvoice()} hitSlop={8}>
                <Ionicons name="copy-outline" size={16} color={colors.stitchOnVariant} />
              </Pressable>
            </View>
            <View style={styles.modeTag}>
              <Text style={styles.modeTagText}>
                {isMockInvoice ? "Facture MOCK (mockln1) — pas BOLT11 Lightning" : "Facture BOLT11 REGTEST (lnbcrt)"}
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.copy} onPress={() => void copyInvoice()}>
                <Ionicons name="copy-outline" size={18} color="#663800" />
                <Text style={styles.copyText}>{copied ? "Copié" : "Copier"}</Text>
              </Pressable>
              <Pressable style={styles.share} onPress={() => void Share.share({ message: encoded })}>
                <Ionicons name="share-social-outline" size={18} color={colors.stitchNavy} />
                <Text style={styles.shareText}>Partager</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.qrPlaceholder}>
            <Text style={styles.placeholder}>
              Le QR affichera la facture réellement renvoyée par Django, jamais une facture fictive.
            </Text>
          </View>
        )}

        <View style={styles.lnurl}>
          <View style={styles.lnurlHead}>
            <View style={styles.lnurlLeft}>
              <View style={styles.atIcon}>
                <Ionicons name="at" size={14} color="#6B3B00" />
              </View>
              <Text style={styles.lnurlKicker}>Votre adresse permanente</Text>
            </View>
            <View style={styles.lnurlOff}>
              <Text style={styles.lnurlOffText}>LNURL non implémenté P03</Text>
            </View>
          </View>
          <View style={styles.lnurlBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lnurlTitle}>Non disponible en P03</Text>
              <Text style={styles.lnurlBody}>
                Les adresses user@domaine de la maquette ne sont pas branchées. Utilisez la facture BOLT11 ci-dessus.
              </Text>
            </View>
          </View>
        </View>

        {payment ? (
          <View style={styles.status}>
            <View style={styles.statusDotWrap}>
              <View style={[styles.statusHalo, paid && styles.statusHaloOk]} />
              <View style={[styles.statusDot, paid && styles.statusDotOk]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                {paid ? "Payé (confirmé serveur)" : statusLabel(state ?? "pending")}
              </Text>
              <Text style={styles.statusBody}>{settlementCaption(payment)}</Text>
              {!paid ? (
                <Text style={styles.statusBody}>
                  En attente de détection. « Payé » uniquement après confirmation backend
                  {isMockInvoice ? " — une facture Mock n'est jamais Lightning settled." : "."}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.status}>
            <View style={styles.statusDotWrap}>
              <View style={styles.statusHalo} />
              <View style={styles.statusDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>En attente de génération de facture</Text>
              <Text style={styles.statusBody}>Validation automatique sans confirmation de bloc, après lookup serveur.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: 12 },
  nav: { flexDirection: "row", alignItems: "center", gap: 8 },
  navBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  navLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.stitchNavy,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { flex: 1, color: colors.stitchNavy, fontWeight: "700", fontSize: 18 },
  regtestPill: {
    backgroundColor: colors.stitchPeach,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  regtestText: { color: "#6B3B00", fontSize: 11, fontWeight: "700" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  modeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  demoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.stitchPeach,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 1,
  },
  demoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#8C4F00" },
  demoText: { color: "#6B3B00", fontSize: 10, fontWeight: "700" },
  netPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(81,223,142,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  netPillOff: { backgroundColor: colors.stitchBlue },
  netText: { color: colors.stitchGreen, fontSize: 10, fontWeight: "700" },
  amountCard: {
    backgroundColor: colors.stitchNavy,
    borderRadius: 12,
    padding: spacing.md,
    gap: 8,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    right: -32,
    top: -32,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(254,152,33,0.15)",
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: "#7C8498", fontSize: 12 },
  instantPill: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  instantText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  amount: { color: colors.white, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  sats: { color: colors.stitchOrange, fontSize: 18, fontWeight: "700" },
  fcfa: { color: "#7C8498", fontSize: 13, lineHeight: 18 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipOn: { backgroundColor: colors.stitchOrange },
  chipText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: "#663800", fontWeight: "700" },
  customInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: colors.white,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  generate: {
    backgroundColor: colors.stitchOrange,
    borderRadius: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  generateText: { color: "#663800", fontWeight: "800" },
  qrCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    gap: 12,
    ...shadow.card,
  },
  qrHead: { flexDirection: "row", justifyContent: "space-between", width: "100%", alignItems: "center" },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  expire: { color: colors.stitchNavy, fontWeight: "600", fontSize: 12 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  refresh: { color: colors.stitchOnVariant, fontSize: 12 },
  qrFrame: {
    backgroundColor: colors.stitchBlueLow,
    borderRadius: 12,
    padding: 12,
  },
  qrInner: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  qrLogo: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  qrLogoInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.stitchNavy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
  },
  invoiceBar: {
    width: "100%",
    backgroundColor: colors.stitchBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  invoice: { flex: 1, color: colors.stitchNavy, fontSize: 13, fontWeight: "500" },
  modeTag: {
    alignSelf: "stretch",
    backgroundColor: colors.stitchBlueLow,
    borderRadius: 8,
    padding: 8,
  },
  modeTagText: { color: colors.stitchOnVariant, fontSize: 11, textAlign: "center", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, width: "100%" },
  copy: {
    flex: 1,
    backgroundColor: colors.stitchOrange,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  copyText: { color: "#663800", fontWeight: "700", fontSize: 16 },
  share: {
    flex: 1,
    backgroundColor: colors.stitchBlueHigh,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  shareText: { color: colors.stitchNavy, fontWeight: "700", fontSize: 16 },
  qrPlaceholder: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    ...shadow.card,
  },
  placeholder: { color: colors.stitchOnVariant, fontSize: 13, textAlign: "center", lineHeight: 20 },
  lnurl: { backgroundColor: colors.stitchBlue, borderRadius: 12, padding: spacing.md, gap: 8 },
  lnurlHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lnurlLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  atIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.stitchPeach,
    alignItems: "center",
    justifyContent: "center",
  },
  lnurlKicker: { color: colors.stitchOnVariant, fontSize: 12 },
  lnurlOff: {
    backgroundColor: "rgba(69,71,76,0.12)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lnurlOffText: { color: colors.stitchOnVariant, fontSize: 10, fontWeight: "700" },
  lnurlBox: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
  },
  lnurlTitle: { color: colors.stitchNavy, fontWeight: "700", fontSize: 16 },
  lnurlBody: { color: colors.stitchOnVariant, fontSize: 12, marginTop: 4, lineHeight: 18 },
  status: {
    backgroundColor: colors.stitchBlueLow,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statusDotWrap: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  statusHalo: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0,151,86,0.3)",
  },
  statusHaloOk: { backgroundColor: "rgba(18,183,106,0.35)" },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.stitchGreen },
  statusDotOk: { backgroundColor: colors.green },
  statusTitle: { color: colors.stitchNavy, fontWeight: "600", fontSize: 13 },
  statusBody: { color: colors.stitchOnVariant, fontSize: 11, marginTop: 2, lineHeight: 16 },
});
