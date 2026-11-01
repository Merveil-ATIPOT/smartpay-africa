import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DemoBanner, TransferFooterNote, TransferHeader, TransferStepper } from "../components/TransferChrome";
import { Badge, ErrorBanner, LoadingBlock, PrimaryButton } from "../components/ui";
import { useTransferDraft } from "../hooks/useTransferDraft";
import { formatSats, LND_DEMO_NODE_BALANCE_LABEL, MOCK_BALANCE_LABEL } from "../lib/format";
import {
  resolveAmountQuoteDisplay,
  type ServerQuoteSnapshot,
} from "../lib/transferAmountQuote";
import { getCorridor } from "../lib/transferCorridors";
import {
  DEMO_FCFA_PER_BTC,
  DEMO_RATE_DISCLAIMER,
  buildQuote,
  maxFcfaForBalance,
  quoteErrors,
} from "../lib/transferConversion";
import { displayPhone } from "../lib/transferDraft";
import { quoteIsCurrent } from "../lib/transferStatus";
import type { AppStackParamList } from "../navigation/types";
import { userFacingRequestError } from "../services/errors";
import { fetchStandaloneQuote, quoteTransfer } from "../services/transfers";
import { fetchWallet } from "../services/wallet";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "TransferAmount">;

const CHIPS = [10_000, 25_000, 50_000];

export function TransferAmountScreen({ navigation }: Props) {
  const { draft, setAmount, setAvailableSats, attachServer } = useTransferDraft();
  const corridor = getCorridor(draft.destinationCode);
  const sourceCorridor = getCorridor(draft.sourceCountry || "SN");
  const sourceCurrency = sourceCorridor?.currency ?? "XOF";
  const destCurrency = corridor?.currency ?? "XAF";
  const [raw, setRaw] = useState(draft.amountFcfa > 0 ? String(draft.amountFcfa) : "50000");
  const [available, setAvailable] = useState(draft.availableSats);
  const [walletLabel, setWalletLabel] = useState("Solde portefeuille");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverQuote, setServerQuote] = useState<ServerQuoteSnapshot | null>(() =>
    draft.mode === "backend" && draft.quoteCurrent && draft.serverAmountSats > 0 && draft.amountFcfa > 0
      ? {
          amountFcfa: draft.amountFcfa,
          amountSats: draft.serverAmountSats,
          feeSats: draft.serverFeeSats,
          totalSats: draft.serverTotalSats,
          expiresAt: draft.quoteExpiresAt,
          rate: draft.serverRate || DEMO_FCFA_PER_BTC,
        }
      : null,
  );
  const [quoting, setQuoting] = useState(false);

  const loadWallet = useCallback(async () => {
    setLoadError(null);
    try {
      const wallet = await fetchWallet();
      const sats =
        wallet.provider === "lnd_regtest" ? wallet.channel_balance_sats : wallet.mock_balance_sats;
      setAvailable(sats);
      setAvailableSats(sats);
      setWalletLabel(
        wallet.provider === "lnd_regtest" ? LND_DEMO_NODE_BALANCE_LABEL : MOCK_BALANCE_LABEL,
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Solde indisponible.");
      setAvailable(0);
      setAvailableSats(0);
    } finally {
      setLoading(false);
    }
  }, [setAvailableSats]);

  useEffect(() => {
    if (!draft.destinationCode || !draft.operator) {
      navigation.replace("TransferBeneficiary");
      return;
    }
    void loadWallet();
  }, [draft.destinationCode, draft.operator, loadWallet, navigation]);

  const amountFcfa = Number(raw);
  const localQuote = useMemo(() => buildQuote(Number.isInteger(amountFcfa) ? amountFcfa : 0), [amountFcfa]);
  const quoteView = resolveAmountQuoteDisplay({
    mode: draft.mode,
    amountFcfa: Number.isInteger(amountFcfa) ? amountFcfa : 0,
    local: localQuote,
    server: serverQuote,
  });
  const amountSats = quoteView.amountSats;
  const feeSats = quoteView.feeSats;
  const totalSats = quoteView.totalSats;
  const displayedRate = quoteView.rate ?? DEMO_FCFA_PER_BTC;
  const errors = useMemo(() => {
    if (raw === "") {
      return ["Saisissez un montant en FCFA."];
    }
    if (draft.mode === "backend") {
      const list: string[] = [];
      if (!Number.isInteger(amountFcfa) || amountFcfa < 100) {
        list.push("Saisissez un montant entier d'au moins 100 FCFA.");
      }
      if (amountSats > 0 && amountSats > available) {
        list.push("Solde de canal insuffisant pour le montant principal.");
      }
      return list;
    }
    return quoteErrors(amountFcfa, available);
  }, [amountFcfa, amountSats, available, draft.mode, raw]);
  const maxFcfa = maxFcfaForBalance(available);

  useEffect(() => {
    if (draft.mode !== "backend" || !draft.destinationCode || !Number.isInteger(amountFcfa) || amountFcfa < 100) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchStandaloneQuote({ amountLocal: amountFcfa, destinationCountry: draft.destinationCode as string })
        .then((quote) => {
          if (cancelled) {
            return;
          }
          setServerQuote({
            amountFcfa: quote.amount_local,
            amountSats: quote.amount_sats,
            feeSats: quote.fee_sats,
            totalSats: quote.total_sats,
            expiresAt: quote.expires_at,
            rate: quote.demo_rate_fcfa_per_btc,
          });
        })
        .catch(() => {
          if (!cancelled) {
            setServerQuote(null);
          }
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [amountFcfa, draft.destinationCode, draft.mode]);

  async function onContinue() {
    if (errors.length) {
      return;
    }
    if (draft.mode === "backend") {
      if (!draft.transferId) {
        setLoadError("Enregistrez d'abord le destinataire.");
        return;
      }
      setQuoting(true);
      setLoadError(null);
      try {
        const quoted = await quoteTransfer(draft.transferId, amountFcfa);
        attachServer(quoted);
        if (!quoted.quote_current) {
          setLoadError("Devis invalide. Recalculez avant de continuer.");
          setQuoting(false);
          return;
        }
        setAmount(quoted.amount_local, available);
      } catch (err) {
        setLoadError(userFacingRequestError(err, "Devis serveur indisponible."));
        setQuoting(false);
        return;
      }
      setQuoting(false);
    } else {
      setAmount(amountFcfa, available);
    }
    navigation.navigate("TransferReview");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TransferHeader onBack={() => navigation.goBack()} />
          <TransferStepper step={3} />
          <DemoBanner
            badge={draft.mode === "backend" ? "Devis de démonstration · taux fictif" : "Mode démonstration locale"}
            message={DEMO_RATE_DISCLAIMER}
          />

          <View style={styles.amountCard}>
            <Text style={styles.label}>
              Vous envoyez ({sourceCurrency}
              {sourceCorridor && corridor
                ? ` · ${sourceCorridor.name} → ${corridor.name} (${destCurrency})`
                : ""}
              )
            </Text>
            <View style={styles.amountRow}>
              <TextInput
                keyboardType="number-pad"
                value={raw}
                onChangeText={(value) => setRaw(value.replace(/[^\d]/g, ""))}
                style={styles.amountInput}
                placeholder="0"
              />
              <Text style={styles.unit}>{sourceCurrency}</Text>
            </View>
            <Text style={styles.satsEq}>{formatSats(amountSats)} sats</Text>
            <Badge label={quoteView.badge} tone={quoteView.source === "django" ? "green" : "muted"} />
            <View style={styles.chips}>
              {CHIPS.map((chip) => (
                <Pressable key={chip} onPress={() => setRaw(String(chip))} style={styles.chip}>
                  <Text style={styles.chipText}>+{formatSats(chip)}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setRaw(String(maxFcfa))} style={styles.chip}>
                <Text style={styles.chipText}>Max ({formatSats(maxFcfa)})</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.rate}>
            <Ionicons name="swap-horizontal" size={16} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rateTitle}>1 sat ≈ {(displayedRate / 100_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} FCFA</Text>
              <Text style={styles.rateSub}>1 BTC ≈ {formatSats(displayedRate)} FCFA · fictif</Text>
            </View>
            <Text style={styles.rateBadge}>Taux indicatif</Text>
          </View>

          <View style={styles.card}>
            <Row label="Frais de démonstration" value={`${feeSats} sat`} hint="pas des frais réseau réels" />
            <Row label="Passerelle Mobile Money" value={`0 ${destCurrency}`} hint="simulation, 0 % affiché" />
            <Row
              label="Destinataire reçoit"
              value={`${formatSats(Number.isInteger(amountFcfa) ? amountFcfa : 0)} ${destCurrency}`}
              hint={`${displayPhone(draft)}`}
            />
            {quoteView.showExpiry && quoteView.expiresAt ? (
              <Row
                label="Expiration du devis"
                value={quoteIsCurrent(quoteView.expiresAt) ? "Valide" : "Expiré"}
                hint={new Date(quoteView.expiresAt).toLocaleTimeString("fr-FR")}
              />
            ) : null}
          </View>

          {loading ? <LoadingBlock label="Chargement du solde…" /> : null}
          {loadError ? <ErrorBanner message={loadError} /> : null}
          <View style={styles.card}>
            <Text style={styles.muted}>{walletLabel}</Text>
            <Text style={styles.balance}>{formatSats(available)} sats</Text>
            <Text style={styles.muted}>
              {errors.some((item) => /insuffisant/.test(item)) ? "Insuffisant" : "Disponible pour cette démo"}
            </Text>
          </View>

          {errors.length ? <ErrorBanner message={errors[0]} /> : null}
          <PrimaryButton
            label="Vérifier le transfert"
            icon="arrow-forward"
            loading={quoting}
            disabled={errors.length > 0 || loading || quoting}
            onPress={() => void onContinue()}
          />
          <TransferFooterNote>
            {draft.mode === "backend"
              ? `Total indicatif ${formatSats(totalSats)} sats (principal + 1 sat de démo). Les frais réseau restent indicatifs.`
              : "Aucun débit Lightning n'est effectué ici. Le total sera recalculé à l'étape suivante avec le même modèle."}
          </TransferFooterNote>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.kv}>
      <View style={{ flex: 1 }}>
        <Text style={styles.muted}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  amountCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 8, ...shadow.card },
  label: { color: colors.muted, fontWeight: "700" },
  amountRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "800", color: colors.navy, minHeight: 48 },
  unit: { color: colors.muted, fontWeight: "700", marginBottom: 8 },
  satsEq: { color: colors.orange, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.stitchPeach,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  chipText: { color: "#6B3B00", fontWeight: "800", fontSize: 12 },
  rate: {
    backgroundColor: colors.stitchBlueLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  rateTitle: { color: colors.navy, fontWeight: "700" },
  rateSub: { color: colors.muted, fontSize: 11 },
  rateBadge: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: colors.stitchBlueHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 8, ...shadow.card },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  muted: { color: colors.muted, fontSize: 12 },
  hint: { color: colors.muted, fontSize: 11, marginTop: 2 },
  value: { color: colors.navy, fontWeight: "800" },
  balance: { color: colors.navy, fontWeight: "800", fontSize: 18 },
});
