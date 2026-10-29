import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Payment } from "@smartpay/contracts";

import { Badge, ErrorBanner, GhostButton, ModeBanner, PrimaryButton } from "../components/ui";
import { ConfirmLock, newIdempotencyKey } from "../lib/confirmLock";
import { FCFA_DISCLAIMER, formatSats, remainingLabel, shortenInvoice } from "../lib/format";
import { assertNotExpired, InvoiceError } from "../lib/invoice";
import { isLightningSuccess, settlementCaption, statusLabel, uiPaymentState } from "../lib/paymentStatus";
import type { AppStackParamList } from "../navigation/types";
import { confirmPayment, pollPayment } from "../services/payments";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Confirm">;

export function ConfirmScreen({ navigation, route }: Props) {
  const { encodedInvoice, preview } = route.params;
  const lock = useRef(new ConfirmLock());
  const idempotencyKey = useRef(newIdempotencyKey());
  const [amount, setAmount] = useState(
    preview.amount_sats > 0 ? String(preview.amount_sats) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);

  const amountSats = Number(amount);
  const canPay = Number.isInteger(amountSats) && amountSats > 0 && !busy;
  const state = payment ? uiPaymentState(payment) : null;
  const expires = remainingLabel(preview.expires_at ?? null);

  const destinationLabel = useMemo(() => {
    if (preview.destination) {
      return shortenInvoice(preview.destination, 10, 8);
    }
    return null;
  }, [preview.destination]);

  async function onConfirm() {
    if (!lock.current.tryAcquire()) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      assertNotExpired(preview.expires_at);
      const created = await confirmPayment({
        encodedInvoice,
        amountSats,
        description: preview.description,
        idempotencyKey: idempotencyKey.current,
      });
      const latest = await pollPayment(created.id, { timeoutMs: 45_000 });
      setPayment(latest);
      if (latest.status === "failed") {
        idempotencyKey.current = newIdempotencyKey();
      }
    } catch (err) {
      idempotencyKey.current = newIdempotencyKey();
      setError(err instanceof InvoiceError || err instanceof Error ? err.message : "Paiement impossible.");
    } finally {
      setBusy(false);
      lock.current.release();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.nav}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={colors.navy} />
          </Pressable>
          <Text style={styles.navTitle}>Détails de transaction</Text>
          <Badge label={preview.settlement_mode === "mock" ? "Mock" : "Regtest"} tone="orange" />
        </View>
        <ModeBanner provider={preview.settlement_mode === "mock" ? "mock" : "lnd_regtest"} />

        <View style={styles.amountCard}>
          <Text style={styles.kicker}>MONTANT À TRANSFÉRER</Text>
          {preview.amount_sats > 0 ? (
            <Text style={styles.amount}>
              {formatSats(preview.amount_sats)} <Text style={styles.sats}>sats</Text>
            </Text>
          ) : (
            <>
              <Text style={styles.unavailable}>Montant indisponible sur la facture — saisie requise</Text>
              <TextInput
                keyboardType="number-pad"
                value={amount}
                onChangeText={setAmount}
                placeholder="Montant en sats"
                style={styles.input}
              />
            </>
          )}
          <Text style={styles.fcfa}>{FCFA_DISCLAIMER}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>DESTINATAIRE</Text>
            <Badge label={destinationLabel ? "Présent, non vérifié KYC" : "Indisponible"} tone={destinationLabel ? "green" : "muted"} />
          </View>
          <Text style={styles.value}>{destinationLabel ?? "Non fourni par le décodage"}</Text>
          <Text style={styles.invoice} onPress={() => void Clipboard.setStringAsync(encodedInvoice)}>
            {shortenInvoice(encodedInvoice)} · copier
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Détails du règlement</Text>
          <Row label="Montant" value={`${formatSats(amountSats || 0)} sats`} />
          <Row
            label="Frais réseau estimés"
            value={preview.fee_sats > 0 ? `${formatSats(preview.fee_sats)} sats` : "Indisponibles"}
          />
          <Row label="Expiration" value={expires ?? "Indisponible"} />
          <Row
            label="Mode"
            value={preview.settlement_mode === "mock" ? "MOCK" : "LIGHTNING REGTEST"}
          />
          <Text style={styles.note}>
            Les données ci-dessus viennent de POST /payments/preview/. Un aperçu n'est jamais un règlement.
          </Text>
        </View>

        {preview.description ? (
          <View style={styles.card}>
            <Text style={styles.label}>MOTIF (MÉMO)</Text>
            <Text style={styles.value}>{preview.description}</Text>
          </View>
        ) : null}

        {(preview.warnings ?? []).map((warning) => (
          <Text key={warning} style={styles.warning}>
            {warning}
          </Text>
        ))}

        {error ? <ErrorBanner message={error} /> : null}

        {payment ? (
          <View style={[styles.result, isLightningSuccess(payment) ? styles.resultOk : styles.resultWait]}>
            <Text style={styles.resultTitle}>{statusLabel(state ?? "unknown")}</Text>
            <Text style={styles.resultBody}>{settlementCaption(payment)}</Text>
            {payment.failure_reason ? <Text style={styles.resultBody}>{payment.failure_reason}</Text> : null}
          </View>
        ) : null}

        <PrimaryButton
          icon="flash"
          label={busy ? "Traitement…" : `Confirmer et payer ${amountSats || "?"} sats`}
          onPress={() => void onConfirm()}
          disabled={!canPay || Boolean(payment && state !== "failed")}
          loading={busy}
        />
        <GhostButton label="Annuler la transaction" onPress={() => navigation.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  nav: { flexDirection: "row", alignItems: "center", gap: 8 },
  navTitle: { flex: 1, color: colors.navy, fontWeight: "800", fontSize: 18 },
  amountCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  kicker: { color: colors.muted, letterSpacing: 1, fontSize: 11, fontWeight: "700" },
  amount: { color: colors.navy, fontSize: 36, fontWeight: "800" },
  sats: { fontSize: 18, color: colors.orange },
  unavailable: { color: colors.muted, textAlign: "center" },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: 12,
    color: colors.navy,
    textAlign: "center",
  },
  fcfa: { color: colors.muted, fontSize: 11, textAlign: "center" },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  value: { color: colors.navy, fontWeight: "700", fontSize: 16 },
  invoice: { color: colors.orange, fontSize: 12 },
  section: { color: colors.navy, fontWeight: "800" },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  k: { color: colors.muted, flex: 1 },
  v: { color: colors.navy, fontWeight: "700" },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  warning: { color: colors.orange, fontSize: 12 },
  result: { borderRadius: radius.lg, padding: spacing.md, gap: 6 },
  resultOk: { backgroundColor: colors.mint },
  resultWait: { backgroundColor: colors.peach },
  resultTitle: { color: colors.navy, fontWeight: "800" },
  resultBody: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
