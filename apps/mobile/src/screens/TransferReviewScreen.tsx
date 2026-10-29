import type { TransferPaymentPreview } from "@smartpay/contracts";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DemoBanner, TransferFooterNote, TransferHeader, TransferStepper } from "../components/TransferChrome";
import { ErrorBanner, GhostButton, LoadingBlock, PrimaryButton } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useTransferDraft } from "../hooks/useTransferDraft";
import { ConfirmLock, newIdempotencyKey } from "../lib/confirmLock";
import { formatSats } from "../lib/format";
import { getCorridor } from "../lib/transferCorridors";
import { displayPhone, quoteFromDraft } from "../lib/transferDraft";
import { TRANSFER_CONFIRM_BLOCKED_MESSAGE } from "../lib/transferSafety";
import { classifyPreviewBanner } from "../lib/transferPreviewUi";
import { canEditTransfer, quoteIsCurrent } from "../lib/transferStatus";
import type { AppStackParamList } from "../navigation/types";
import { userFacingRequestError } from "../services/errors";
import { markTransferReady, previewTransferPayment } from "../services/transfers";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "TransferReview">;

export function TransferReviewScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { draft, launchDemo, attachServer } = useTransferDraft();
  const lock = useRef(new ConfirmLock());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(draft.mode === "backend");
  const [previewPay, setPreviewPay] = useState<TransferPaymentPreview | null>(null);
  const corridor = getCorridor(draft.destinationCode);
  const operator = corridor?.operators.find((item) => item.id === draft.operator);
  const quote = quoteFromDraft(draft);
  const sender = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.email || "";
  const backend = draft.mode === "backend";

  useEffect(() => {
    if (!draft.destinationCode) {
      navigation.replace("TransferDestination");
      return;
    }
    if (!draft.operator || !draft.beneficiaryName) {
      navigation.replace("TransferBeneficiary");
      return;
    }
    if (draft.amountFcfa <= 0) {
      navigation.replace("TransferAmount");
    }
  }, [draft.amountFcfa, draft.beneficiaryName, draft.destinationCode, draft.operator, navigation]);

  const loadPreview = useCallback(async () => {
    if (!backend || !draft.transferId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await previewTransferPayment(draft.transferId);
      setPreviewPay(payload);
    } catch (err) {
      setPreviewPay(null);
      setError(userFacingRequestError(err, "Prévisualisation indisponible."));
    } finally {
      setLoading(false);
    }
  }, [backend, draft.transferId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function onLaunch() {
    if (!lock.current.tryAcquire()) {
      return;
    }
    setError(null);
    if (backend) {
      if (!draft.transferId) {
        lock.current.release();
        setError("Aucun transfert serveur. Reprenez le destinataire.");
        return;
      }
      if (!canEditTransfer(draft.serverStatus)) {
        lock.current.release();
        setError("Ce transfert a déjà une exécution. Ouvrez l'écran résultat en consultation.");
        return;
      }
      if (!draft.quoteCurrent || !quoteIsCurrent(draft.quoteExpiresAt)) {
        lock.current.release();
        setError("Devis expiré. Recalculez le montant avant de continuer.");
        return;
      }
      try {
        const ready = await markTransferReady(draft.transferId, draft.draftKey || newIdempotencyKey());
        attachServer(ready);
        const latest = await previewTransferPayment(draft.transferId);
        setPreviewPay(latest);
        lock.current.release();
        navigation.navigate("TransferResult", { transferId: draft.transferId });
      } catch (err) {
        lock.current.release();
        setError(userFacingRequestError(err, "Préparation serveur impossible."));
      }
      return;
    }
    const preview = launchDemo();
    if (!preview) {
      lock.current.release();
      setError("Données incomplètes. Revenez aux étapes précédentes.");
      return;
    }
    navigation.navigate("TransferResult", {});
  }

  const expired = backend && !quoteIsCurrent(draft.quoteExpiresAt);
  const previewBanner = backend ? classifyPreviewBanner(previewPay, { quoteExpiredLocal: expired }) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TransferHeader onBack={() => navigation.goBack()} title={backend ? "Transfert" : "Transfert démo"} />
        <TransferStepper step={4} />
        <DemoBanner
          badge={backend ? "Mode API Django · paiement bloqué B3" : "Mode démonstration locale"}
          message={
            backend
              ? TRANSFER_CONFIRM_BLOCKED_MESSAGE
              : "Simulation de transfert international. Aucun fonds réel en monnaie fiduciaire ni paiement Lightning n'est prélevé."
          }
        />

        <View style={styles.card}>
          <Text style={styles.kicker}>Expéditeur</Text>
          <Text style={styles.value}>{sender}</Text>
          <Text style={styles.muted}>{user?.email}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.kicker}>Destinataire</Text>
          <Text style={styles.value}>{draft.beneficiaryName}</Text>
          <Text style={styles.muted}>
            {operator?.label} · {corridor?.flag} {corridor?.name}
          </Text>
          <Text style={styles.muted}>{displayPhone(draft)}</Text>
          <Text style={styles.muted}>Motif : {draft.reason || "Non renseigné"}</Text>
          {draft.publicReference ? <Text style={styles.muted}>Référence : {draft.publicReference}</Text> : null}
        </View>
        <View style={styles.card}>
          <Row label="Montant FCFA" value={`${formatSats(quote.amountFcfa)} FCFA`} />
          <Row label="Équivalent sats (devis)" value={`${formatSats(quote.amountSats)} sats`} />
          <Row label="Frais de démonstration" value={`${quote.feeSats} sat`} />
          <Row label="Total indicatif" value={`${formatSats(quote.totalSats)} sats`} />
        </View>
        {backend ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>Conditions d'exécution (preview)</Text>
            {loading ? <LoadingBlock label="Lecture du preview Django…" /> : null}
            {previewPay ? (
              <>
                <Row label="Peut exécuter" value={previewPay.can_execute ? "Oui (B3 : non lancé)" : "Non"} />
                <Row label="Solde canal" value={`${formatSats(previewPay.channel_balance_sats)} sats`} />
                <Row label="Alice" value={previewPay.lightning_connected ? "Connectée" : "Injoignable"} />
                <Row
                  label="Frais LND estimés"
                  value={
                    previewPay.lnd_fee_estimate_available
                      ? `${previewPay.lnd_fee_sats_estimated} sats`
                      : "Non disponibles (plafond 50 sats)"
                  }
                />
                {previewPay.warnings.map((item) => (
                  <Text key={item} style={styles.muted}>
                    {item}
                  </Text>
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        {previewBanner?.tone === "info" ? <InfoNote message={previewBanner.message} /> : null}
        {previewBanner?.tone === "error" ? <ErrorBanner message={previewBanner.message} /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        <PrimaryButton
          label={
            backend
              ? "Enregistrer la préparation (sans paiement)"
              : `Lancer la simulation (${formatSats(quote.totalSats)} sats)`
          }
          icon={backend ? "save-outline" : "flask"}
          loading={loading}
          disabled={!draft.operator || draft.amountFcfa <= 0 || expired}
          onPress={() => void onLaunch()}
        />
        <GhostButton label="Modifier les informations" onPress={() => navigation.navigate("TransferBeneficiary")} />
        <Pressable onPress={() => navigation.navigate("TransferAmount")}>
          <Text style={styles.link}>Modifier le montant</Text>
        </Pressable>
        <TransferFooterNote>
          {backend
            ? "Ce bouton n'appelle pas POST /confirm/. Aucun send_payment LND, aucun crédit Mobile Money réel."
            : "Ce bouton n'appelle aucun endpoint de paiement. Aucune preuve LND, aucun payment hash et aucun règlement confirmé ne sont créés."}
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

function InfoNote({ message }: { message: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 6, ...shadow.card },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  value: { color: colors.navy, fontWeight: "800" },
  muted: { color: colors.muted, fontSize: 13 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  link: { color: colors.orange, fontWeight: "800", textAlign: "center" },
  infoBox: {
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoText: { color: colors.navy, fontWeight: "700", lineHeight: 20 },
});
