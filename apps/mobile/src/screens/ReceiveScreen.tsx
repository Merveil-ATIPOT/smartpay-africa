import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Payment, WalletConnection } from "@smartpay/contracts";

import { Badge, ErrorBanner, ModeBanner, PrimaryButton } from "../components/ui";
import { FCFA_DISCLAIMER, formatSats, remainingLabel, shortenInvoice } from "../lib/format";
import { isLightningSuccess, settlementCaption, statusLabel, uiPaymentState } from "../lib/paymentStatus";
import type { AppStackParamList } from "../navigation/types";
import { createInvoice, fetchPayment } from "../services/payments";
import { fetchWallet } from "../services/wallet";
import { colors, radius, spacing } from "../theme";

const CHIPS = [5_000, 10_000, 50_000];

type Props = NativeStackScreenProps<AppStackParamList, "Receive">;

export function ReceiveScreen({ navigation }: Props) {
  const [amount, setAmount] = useState(50_000);
  const [custom, setCustom] = useState("");
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void fetchWallet().then(setWallet).catch(() => undefined);
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
  const isMockInvoice = payment?.invoice?.is_mock || payment?.settlement_mode === "mock" || encoded.startsWith("mockln");
  const state = payment ? uiPaymentState(payment) : null;
  const paid = payment ? isLightningSuccess(payment) : false;

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.nav}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={colors.navy} />
          </Pressable>
          <Text style={styles.navTitle}>Émission de facture</Text>
          <Badge label={wallet?.provider === "lnd_regtest" ? "Regtest" : "Mock"} tone="orange" />
        </View>
        <ModeBanner provider={wallet?.provider ?? "mock"} lightningConnected={wallet?.is_lightning_connected} />

        <View style={styles.amountCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.kicker}>Montant demandé</Text>
            <Badge label="Facture instantanée" tone="muted" />
          </View>
          <Text style={styles.amount}>
            {formatSats(amount)} <Text style={styles.sats}>SATS</Text>
          </Text>
          <Text style={styles.fcfa}>{FCFA_DISCLAIMER}</Text>
          <View style={styles.chips}>
            {CHIPS.map((value) => (
              <Pressable
                key={value}
                onPress={() => {
                  setAmount(value);
                  setCustom("");
                }}
                style={[styles.chip, amount === value && styles.chipOn]}
              >
                <Text style={[styles.chipText, amount === value && styles.chipTextOn]}>
                  {formatSats(value)}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            keyboardType="number-pad"
            value={custom}
            placeholder="Montant libre (sats)"
            placeholderTextColor={colors.muted}
            onChangeText={(value) => {
              setCustom(value);
              const parsed = Number(value);
              if (Number.isInteger(parsed) && parsed > 0) {
                setAmount(parsed);
              }
            }}
            style={styles.input}
          />
          <PrimaryButton label={busy ? "Création…" : "Générer la facture"} onPress={() => void onCreate()} loading={busy} />
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        {payment && encoded ? (
          <View style={styles.qrCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.expire}>
                {remainingLabel(payment.expires_at, now) === "Expirée"
                  ? "Facture expirée"
                  : `Expire dans ${remainingLabel(payment.expires_at, now) ?? "—"}`}
              </Text>
              <Pressable onPress={() => void fetchPayment(payment.id).then(setPayment)}>
                <Text style={styles.refresh}>Actualiser</Text>
              </Pressable>
            </View>
            <View style={styles.qrWrap}>
              <QRCode value={encoded} size={220} color={colors.navy} backgroundColor={colors.white} />
            </View>
            <Text style={styles.invoice}>{shortenInvoice(encoded, 18, 10)}</Text>
            <Badge
              label={isMockInvoice ? "Facture MOCK (mockln1) — pas BOLT11 Lightning" : "Facture BOLT11 REGTEST (lnbcrt)"}
              tone={isMockInvoice ? "orange" : "green"}
            />
            <View style={styles.actions}>
              <Pressable
                style={styles.copy}
                onPress={() => void Clipboard.setStringAsync(encoded)}
              >
                <Ionicons name="copy" size={16} color={colors.white} />
                <Text style={styles.copyText}>Copier</Text>
              </Pressable>
              <Pressable
                style={styles.share}
                onPress={() => void Share.share({ message: encoded })}
              >
                <Text style={styles.shareText}>Partager</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.placeholder}>
            Le QR affichera la facture réellement renvoyée par Django, jamais une facture fictive.
          </Text>
        )}

        {payment ? (
          <View style={[styles.status, paid ? styles.statusOk : styles.statusWait]}>
            <Text style={styles.statusTitle}>{paid ? "Payé (confirmé serveur)" : statusLabel(state ?? "pending")}</Text>
            <Text style={styles.statusBody}>{settlementCaption(payment)}</Text>
            {!paid ? (
              <Text style={styles.statusBody}>
                En attente de détection. « Payé » n'apparaît qu'après confirmation backend
                {isMockInvoice ? " — une facture Mock ne sera jamais affichée comme Lightning settled." : "."}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.lnurl}>
          <Text style={styles.lnurlTitle}>Adresse permanente</Text>
          <Badge label="LNURL non implémenté P03" tone="muted" />
          <Text style={styles.lnurlBody}>
            Les adresses user@domaine et LNURL visibles sur la maquette Stitch ne sont pas branchées. Utilisez la facture
            BOLT11 ci-dessus.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  nav: { flexDirection: "row", alignItems: "center", gap: 8 },
  navTitle: { flex: 1, color: colors.navy, fontWeight: "800", fontSize: 18 },
  amountCard: { backgroundColor: colors.navy, borderRadius: 24, padding: spacing.md, gap: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: "#D0D5DD", fontSize: 12 },
  amount: { color: colors.white, fontSize: 32, fontWeight: "800" },
  sats: { color: colors.orange, fontSize: 16 },
  fcfa: { color: "#98A2B3", fontSize: 11 },
  chips: { flexDirection: "row", gap: 8 },
  chip: { backgroundColor: "#1D2939", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.orange },
  chipText: { color: colors.white, fontWeight: "700" },
  chipTextOn: { color: colors.white },
  input: {
    backgroundColor: "#1D2939",
    color: colors.white,
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  qrCard: { backgroundColor: colors.white, borderRadius: 24, padding: spacing.md, alignItems: "center", gap: 10 },
  expire: { color: colors.navy, fontWeight: "600" },
  refresh: { color: colors.orange, fontWeight: "700" },
  qrWrap: { padding: 12, backgroundColor: colors.white },
  invoice: { color: colors.muted, fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, width: "100%" },
  copy: {
    flex: 1,
    backgroundColor: colors.orange,
    borderRadius: radius.md,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  copyText: { color: colors.white, fontWeight: "700" },
  share: {
    flex: 1,
    backgroundColor: colors.gray,
    borderRadius: radius.md,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: { color: colors.navy, fontWeight: "700" },
  placeholder: { color: colors.muted, fontSize: 13, textAlign: "center" },
  status: { borderRadius: radius.lg, padding: spacing.md, gap: 6 },
  statusOk: { backgroundColor: colors.mint },
  statusWait: { backgroundColor: colors.peach },
  statusTitle: { color: colors.navy, fontWeight: "800" },
  statusBody: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  lnurl: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 8 },
  lnurlTitle: { color: colors.navy, fontWeight: "800" },
  lnurlBody: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
