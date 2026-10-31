import type { TransferExecutionResult } from "@smartpay/contracts";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TransferFooterNote, TransferHeader } from "../components/TransferChrome";
import { ErrorBanner, GhostButton, LoadingBlock, PrimaryButton } from "../components/ui";
import { useTransferDraft } from "../hooks/useTransferDraft";
import { formatSats } from "../lib/format";
import { getCorridor, type DestinationCode } from "../lib/transferCorridors";
import {
  DEMO_PROOF_STAMP,
  DEMO_RESULT_DISCLAIMER,
} from "../lib/transferDraft";
import {
  demoReceiptHtml,
  demoShareMessage,
  isUserShareCancel,
  receiptHtml,
  serverShareMessage,
} from "../lib/transferReceipt";
import { printAndShareHtml, sharePlainMessage } from "../lib/transferReceiptShare";
import { SIMULATED_MM_DISCLAIMER } from "../lib/transferSafety";
import { lightningHeadline, transferStatusLabel } from "../lib/transferStatus";
import type { AppStackParamList } from "../navigation/types";
import { userFacingRequestError } from "../services/errors";
import { fetchTransfer, fetchTransferResult } from "../services/transfers";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "TransferResult">;

export function TransferResultScreen({ navigation, route }: Props) {
  const { preview, reset, draft } = useTransferDraft();
  const transferId = route.params?.transferId || draft.transferId;
  const [result, setResult] = useState<TransferExecutionResult | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(transferId));
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const corridor = getCorridor(
    preview?.destinationCode || (result?.destination_country as DestinationCode | undefined) || draft.destinationCode,
  );
  const operator = corridor?.operators.find((item) => item.id === (preview?.operator || draft.operator));

  const loadResult = useCallback(async () => {
    if (!transferId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchTransferResult(transferId);
      setResult(payload);
      try {
        const detail = await fetchTransfer(transferId);
        setCreatedAt(detail.created_at || null);
      } catch {
        setCreatedAt(null);
      }
    } catch (err) {
      setResult(null);
      setCreatedAt(null);
      setError(userFacingRequestError(err, "Résultat serveur indisponible."));
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  function goHome() {
    reset();
    navigation.popToTop();
  }

  async function onShare() {
    if (exporting) {
      return;
    }
    const message = result ? serverShareMessage(result) : preview ? demoShareMessage(preview) : "";
    if (!message) {
      Alert.alert("Partage impossible", "Aucun résultat à partager.");
      return;
    }
    setExporting(true);
    try {
      await sharePlainMessage(message);
    } catch (err) {
      if (isUserShareCancel(err)) {
        return;
      }
      Alert.alert("Partage impossible", userFacingRequestError(err, "Le partage a échoué."));
    } finally {
      setExporting(false);
    }
  }

  async function onPdf() {
    if (exporting) {
      return;
    }
    const html = result ? receiptHtml(result, createdAt) : preview ? demoReceiptHtml(preview) : null;
    if (!html) {
      Alert.alert("Justificatif indisponible", "Aucun résultat serveur ni démonstration à documenter.");
      return;
    }
    setExporting(true);
    try {
      const outcome = await printAndShareHtml(html);
      if (outcome === "unavailable") {
        Alert.alert(
          "Partage indisponible",
          "Le justificatif PDF n'a pas pu être partagé depuis cet appareil. Aucun fichier n'a été enregistré de façon permanente.",
        );
      }
    } catch (err) {
      if (isUserShareCancel(err)) {
        return;
      }
      Alert.alert("Justificatif PDF", userFacingRequestError(err, "La génération du justificatif a échoué."));
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TransferHeader onBack={goHome} title="Résultat" />
        <LoadingBlock label="Lecture du résultat Django…" />
      </SafeAreaView>
    );
  }

  if (result) {
    const confirmed = result.lightning_confirmed;
    const when = result.lightning_settled_at || "";
    const stamp = when ? new Date(when).toLocaleString("fr-FR") : "Non réglé";
    const title = confirmed
      ? "Règlement Lightning vérifié"
      : transferStatusLabel(result.status);
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <TransferHeader onBack={goHome} title="Résultat serveur" />
          <View style={styles.hero}>
            <View style={[styles.iconWrap, !confirmed && styles.iconWait]}>
              <Ionicons
                name={confirmed ? "checkmark-circle" : result.status === "failed" ? "close-circle" : "time"}
                size={48}
                color={confirmed ? colors.green : colors.orange}
              />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>
              {lightningHeadline({
                lightningConfirmed: result.lightning_confirmed,
                status: result.status,
                aliceStatus: result.alice_status,
                bobStatus: result.bob_status,
              })}
            </Text>
          </View>
          {error ? <ErrorBanner message={error} /> : null}
          <View style={styles.card}>
            <Text style={styles.stamp}>
              {confirmed ? "Preuve LND requise · HTTP 200 insuffisant" : DEMO_PROOF_STAMP}
            </Text>
            <Row label="Référence" value={result.public_reference} />
            <Row label="Statut du transfert" value={transferStatusLabel(result.status)} />
            <Row label="Statut Lightning" value={confirmed ? "Confirmé Alice/Bob" : "Non confirmé"} />
            <Row label="Alice" value={result.alice_status || "n/a"} />
            <Row label="Bob" value={result.bob_status || "n/a"} />
            <Row
              label="Mobile Money"
              value={
                result.mobile_money_credit_status === "simulated"
                  ? "Simulé"
                  : result.mobile_money_credit_status === "failed"
                    ? "Échec simulé"
                    : "Aucun"
              }
            />
            <Row label="Bénéficiaire" value={result.beneficiary_name} />
            <Row label="Opérateur" value={`${result.operator} · ${result.destination_country}`} />
            <Row label="Montant" value={`${formatSats(result.amount_local)} FCFA`} />
            <Row label="Lightning" value={`${formatSats(result.invoice_amount_sats)} sats`} />
            <Row
              label="Frais LND réels"
              value={result.lnd_fee_sats_paid == null ? "Non disponibles" : `${result.lnd_fee_sats_paid} sat`}
            />
            <Row label="Frais démo B1" value={`${result.demo_fee_sats} sat`} />
            <Row label="Date" value={stamp} />
            {result.simulated_credit_reference ? (
              <Row label="Réf. crédit simulé" value={result.simulated_credit_reference} />
            ) : null}
          </View>
          {result.mobile_money_credit_status === "simulated" ? (
            <Text style={styles.mm}>{SIMULATED_MM_DISCLAIMER}</Text>
          ) : (
            <Text style={styles.mm}>Aucun FCFA réel n'a été envoyé.</Text>
          )}
          <View style={styles.actions}>
            <Pressable
              onPress={() => void onShare()}
              style={[styles.action, exporting && styles.actionBusy]}
              disabled={exporting}
            >
              <Ionicons name="share-outline" size={18} color={colors.navy} />
              <Text style={styles.actionText}>Partager</Text>
            </Pressable>
            <Pressable
              onPress={() => void onPdf()}
              style={[styles.action, exporting && styles.actionBusy]}
              disabled={exporting}
            >
              <Ionicons name="document-outline" size={18} color={colors.navy} />
              <Text style={styles.actionText}>{exporting ? "Préparation…" : "Justificatif PDF"}</Text>
            </Pressable>
          </View>
          <PrimaryButton label="Retour à l'accueil" icon="home" onPress={goHome} />
          <GhostButton label="Nouveau parcours" onPress={() => navigation.navigate("TransferDestination")} />
          <TransferFooterNote>
            Un HTTP 200 n'est jamais une preuve de paiement. lightning_confirmed={String(result.lightning_confirmed)}.
          </TransferFooterNote>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!preview) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <TransferHeader onBack={goHome} />
        <View style={styles.content}>
          {error ? <ErrorBanner message={error} /> : null}
          <Text style={styles.missing}>Aucun résultat. Reprenez le parcours depuis le pays ou consultez un transfert existant.</Text>
          <PrimaryButton label="Retour à l'accueil" onPress={goHome} />
        </View>
      </SafeAreaView>
    );
  }

  const when = new Date(preview.createdAt);
  const stamp = Number.isNaN(when.getTime()) ? preview.createdAt : when.toLocaleString("fr-FR");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TransferHeader onBack={goHome} title="Résultat démo" />
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={48} color={colors.green} />
          </View>
          <Text style={styles.title}>Parcours de démonstration terminé</Text>
          <Text style={styles.body}>{DEMO_RESULT_DISCLAIMER}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.stamp}>{DEMO_PROOF_STAMP}</Text>
          <Row label="Bénéficiaire" value={preview.beneficiaryName} />
          <Row label="Opérateur" value={`${operator?.label ?? preview.operator} · ${corridor?.name ?? ""}`} />
          <Row label="Téléphone" value={preview.phone} />
          <Row label="Montant FCFA" value={`${formatSats(preview.quote.amountFcfa)} FCFA`} />
          <Row label="Équivalent sats" value={`${formatSats(preview.quote.amountSats)} sats`} />
          <Row label="Frais démo" value={`${preview.quote.feeSats} sat`} />
          <Row label="Référence locale" value={preview.localReference} />
          <Row label="Horodatage" value={stamp} />
          <Row label="Réseau" value="Simulation locale · pas un règlement Lightning" />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => void onShare()}
            style={[styles.action, exporting && styles.actionBusy]}
            disabled={exporting}
          >
            <Ionicons name="share-outline" size={18} color={colors.navy} />
            <Text style={styles.actionText}>Partager</Text>
          </Pressable>
          <Pressable
            onPress={() => void onPdf()}
            style={[styles.action, exporting && styles.actionBusy]}
            disabled={exporting}
          >
            <Ionicons name="document-outline" size={18} color={colors.navy} />
            <Text style={styles.actionText}>{exporting ? "Préparation…" : "Justificatif PDF"}</Text>
          </Pressable>
        </View>
        <PrimaryButton label="Retour à l'accueil" icon="home" onPress={goHome} />
        <GhostButton label="Modifier le parcours" onPress={() => navigation.navigate("TransferDestination")} />
        <TransferFooterNote>
          Cette référence {preview.localReference} n'est pas un identifiant de transaction serveur ni un payment hash
          LND. Lightning exécuté : {String(preview.lightningExecuted)}. Crédit Mobile Money :{" "}
          {String(preview.mobileMoneyCredited)}.
        </TransferFooterNote>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  missing: { color: colors.muted, marginVertical: 24, textAlign: "center" },
  hero: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: 8,
    ...shadow.card,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWait: { backgroundColor: colors.stitchPeach },
  title: { color: colors.navy, fontWeight: "800", fontSize: 22, textAlign: "center" },
  body: { color: colors.muted, textAlign: "center", lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 8, ...shadow.card },
  stamp: {
    color: "#6B3B00",
    backgroundColor: colors.stitchPeach,
    borderRadius: radius.md,
    overflow: "hidden",
    padding: 8,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  kv: { gap: 2 },
  muted: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  value: { color: colors.navy, fontWeight: "700" },
  mm: {
    color: "#6B3B00",
    backgroundColor: colors.stitchPeach,
    borderRadius: radius.md,
    padding: spacing.md,
    fontWeight: "700",
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 8 },
  action: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    ...shadow.card,
  },
  actionText: { color: colors.navy, fontWeight: "700" },
  actionBusy: { opacity: 0.55 },
});
