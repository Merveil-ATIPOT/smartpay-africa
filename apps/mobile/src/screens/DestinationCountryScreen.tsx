import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DemoBanner, TransferFooterNote, TransferHeader, TransferStepper } from "../components/TransferChrome";
import { ErrorBanner, LoadingBlock, PrimaryButton } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { useTransferDraft } from "../hooks/useTransferDraft";
import {
  CORRIDORS,
  corridorsFromCatalog,
  filterCorridors,
  type CorridorCountry,
  type TransferRegion,
} from "../lib/transferCorridors";
import { isSettledOrBusy } from "../lib/transferStatus";
import type { AppStackParamList } from "../navigation/types";
import { userFacingRequestError } from "../services/errors";
import { fetchDestinations, listTransfers } from "../services/transfers";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "TransferDestination">;

const FILTERS: { id: TransferRegion; label: string }[] = [
  { id: "all", label: "Tous les pays" },
  { id: "uemoa", label: "Zone UEMOA (XOF)" },
  { id: "cemac", label: "Zone CEMAC (XAF)" },
  { id: "intl", label: "International" },
];

export function DestinationCountryScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { draft, setCountry, setSourceCountry, setMode, beginNewFlow } = useTransferDraft();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<TransferRegion>("all");
  const [catalog, setCatalog] = useState<CorridorCountry[]>(CORRIDORS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consultError, setConsultError] = useState<string | null>(null);

  useEffect(() => {
    beginNewFlow();
  }, [beginNewFlow]);

  useEffect(() => {
    if (user?.country) {
      setSourceCountry(user.country);
    }
  }, [setSourceCountry, user?.country]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchDestinations();
      setCatalog(corridorsFromCatalog(payload.results));
      setMode("backend");
    } catch (err) {
      setCatalog(CORRIDORS);
      setMode("demo");
      setError(
        `${userFacingRequestError(err, "Catalogue indisponible.")} Mode démonstration locale activé.`,
      );
    } finally {
      setLoading(false);
    }
  }, [setMode]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const list = useMemo(() => filterCorridors(query, region, catalog), [catalog, query, region]);
  const recommendedList = list.filter((item) => item.recommended);
  const othersList = list.filter((item) => !item.recommended);
  const selected = draft.destinationCode;
  const canContinue = Boolean(selected && catalog.find((item) => item.code === selected)?.available);
  const backend = draft.mode === "backend";

  function onSelect(item: CorridorCountry) {
    if (!item.available) {
      return;
    }
    if (isSettledOrBusy(draft.serverStatus)) {
      beginNewFlow();
    }
    setCountry(item.code);
  }

  async function onConsultLatest() {
    setConsultError(null);
    try {
      const transfers = await listTransfers();
      const latest = transfers[0];
      if (!latest) {
        setConsultError("Aucun transfert serveur à consulter.");
        return;
      }
      navigation.navigate("TransferResult", { transferId: latest.id });
    } catch (err) {
      setConsultError(userFacingRequestError(err, "Consultation impossible."));
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TransferHeader onBack={() => navigation.goBack()} title={backend ? "Transfert" : "Transfert démo"} />
        <DemoBanner
          badge={backend ? "Simulation · aucun paiement réel" : "Mode démonstration locale"}
          message={
            backend
              ? "Les passerelles Mobile Money restent simulées. Aucun paiement Lightning n'est lancé ici."
              : "Les passerelles Mobile Money sont simulées. Aucun fonds fiduciaire réel n'est engagé. Le réseau Lightning affiché reste Bitcoin Regtest."
          }
        />
        <TransferStepper step={1} />

        <View style={styles.search}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un pays ou un opérateur (Wave, MTN...)"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((filter) => {
            const on = region === filter.id;
            return (
              <Pressable
                key={filter.id}
                onPress={() => setRegion(filter.id)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? <LoadingBlock label="Chargement des destinations…" /> : null}
        {error ? <ErrorBanner message={error} /> : null}

        {recommendedList.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flash" size={18} color={colors.orange} />
                <Text style={styles.sectionTitle}>Corridors panafricains recommandés</Text>
              </View>
              <Text style={styles.simBadge}>Simulation</Text>
            </View>
            {recommendedList.map((item) => (
              <CountryCard
                key={item.code}
                item={item}
                selected={selected === item.code}
                detailed
                onPress={() => onSelect(item)}
              />
            ))}
          </>
        ) : null}

        {othersList.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Autres destinations africaines et internationales</Text>
            {othersList.map((item) => (
              <CountryCard
                key={item.code}
                item={item}
                selected={selected === item.code}
                detailed={false}
                onPress={() => onSelect(item)}
              />
            ))}
          </>
        ) : null}

        {!loading && list.length === 0 ? (
          <Text style={styles.empty}>Aucun corridor ne correspond à cette recherche.</Text>
        ) : null}

        <PrimaryButton
          label="Continuer vers le destinataire"
          icon="arrow-forward"
          disabled={!canContinue}
          onPress={() => navigation.navigate("TransferBeneficiary")}
        />
        <Pressable onPress={() => void onConsultLatest()}>
          <Text style={styles.consult}>Consulter un transfert déjà enregistré</Text>
        </Pressable>
        {consultError ? <ErrorBanner message={consultError} /> : null}
        <TransferFooterNote>
          {backend
            ? "Aucun paiement n'est lancé ici. Un transfert déjà réglé ne peut pas être réutilisé."
            : "Simulation locale uniquement. Aucun paiement Lightning ni crédit Mobile Money n'est déclenché à cette étape."}
        </TransferFooterNote>
      </ScrollView>
    </SafeAreaView>
  );
}

function CountryCard({
  item,
  selected,
  detailed,
  onPress,
}: {
  item: CorridorCountry;
  selected: boolean;
  detailed: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!item.available}
      style={[styles.card, selected && styles.cardOn, !item.available && styles.cardOff]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.flag}>{item.flag}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={[styles.status, !item.available && styles.statusOff]}>
              {item.available ? "Disponible en simulation" : "Indisponible dans la démo"}
            </Text>
          </View>
          <Text style={styles.meta}>{item.currencyLabel}</Text>
          <View style={styles.ops}>
            {item.operators.map((op) => (
              <Text key={op.id} style={styles.op}>
                {op.shortLabel}
              </Text>
            ))}
          </View>
        </View>
        {item.available ? (
          <View style={[styles.radio, selected && styles.radioOn]}>
            {selected ? <View style={styles.radioDot} /> : null}
          </View>
        ) : (
          <Ionicons name="lock-closed" size={18} color={colors.muted} />
        )}
      </View>
      {detailed && item.available ? (
        <View style={styles.foot}>
          <Text style={styles.footText}>Délai : non mesuré (simulation)</Text>
          <Text style={styles.footText}>Frais Lightning : non estimés</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  search: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow.card,
  },
  searchInput: { flex: 1, color: colors.navy, minHeight: 44 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: {
    backgroundColor: colors.stitchBlueHigh,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.stitchNavy },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  chipTextOn: { color: colors.white },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  sectionTitle: { color: colors.navy, fontWeight: "800", fontSize: 16, flex: 1 },
  simBadge: {
    color: colors.green,
    backgroundColor: colors.mint,
    overflow: "hidden",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "700",
  },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 8, ...shadow.card },
  cardOn: { borderWidth: 2, borderColor: colors.orange },
  cardOff: { opacity: 0.7 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  flag: { fontSize: 28 },
  nameRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  name: { color: colors.navy, fontWeight: "800", fontSize: 16 },
  status: {
    color: colors.green,
    backgroundColor: "#70FDA740",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "700",
  },
  statusOff: { color: "#6B3B00", backgroundColor: colors.stitchPeach },
  meta: { color: colors.muted, fontSize: 12 },
  ops: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  op: {
    backgroundColor: colors.stitchBlue,
    color: colors.navy,
    borderRadius: 6,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "600",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.stitchBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: colors.peach },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.orange },
  foot: {
    backgroundColor: colors.stitchBlueLow,
    borderRadius: radius.md,
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  footText: { color: colors.muted, fontSize: 11, flex: 1 },
  empty: { color: colors.muted, textAlign: "center", padding: spacing.md },
  consult: { color: colors.orange, fontWeight: "800", textAlign: "center", paddingVertical: 8 },
});
