import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MerchantHeader } from "../components/MerchantChrome";
import { formatSats } from "../lib/format";
import {
  ANALYTICS_DISCLAIMER,
  DEMO_SALES,
  FICTIVE_OPS_TOTAL_LABEL,
  MERCHANT_DEMO_DISCLAIMER,
  computeMerchantStats,
  dailyActivityBars,
  salesInRange,
  saleStatusLabel,
  statusBreakdown,
  type MerchantAnalyticsRange,
} from "../lib/merchantDemo";
import { MERCHANT_FAB_CLEARANCE, goSmartPayHome } from "../lib/merchantNavigation";
import type { MerchantStackParamList, MerchantTabParamList } from "../navigation/types";
import { colors, radius, shadow, spacing } from "../theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "MerchantSalesAnalytics">,
  NativeStackScreenProps<MerchantStackParamList>
>;

const RANGES: { id: MerchantAnalyticsRange; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "all", label: "Toutes" },
];

export function MerchantSalesAnalyticsScreen({ navigation }: Props) {
  const [range, setRange] = useState<MerchantAnalyticsRange>("all");
  const rows = useMemo(() => salesInRange(DEMO_SALES, range), [range]);
  const stats = useMemo(() => computeMerchantStats(rows), [rows]);
  const bars = useMemo(() => dailyActivityBars(rows), [rows]);
  const breakdown = useMemo(() => statusBreakdown(rows), [rows]);
  const maxBar = Math.max(1, ...bars.map((item) => item.amountFcfa));
  const maxStatus = Math.max(1, ...breakdown.map((item) => item.amountFcfa));
  const recent = rows.slice(0, 4);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <MerchantHeader title="Statistiques des ventes" onBack={() => goSmartPayHome(navigation)} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="flask-outline" size={18} color="#B54708" />
          <Text style={styles.bannerText}>{ANALYTICS_DISCLAIMER}</Text>
        </View>
        <Text style={styles.hint}>{MERCHANT_DEMO_DISCLAIMER}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {RANGES.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setRange(item.id)}
              style={[styles.chip, range === item.id && styles.chipOn]}
            >
              <Text style={[styles.chipText, range === item.id && styles.chipTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          <StatCard
            label="Ventes fictivement réglées"
            value={`${formatSats(stats.settledFcfa)} FCFA`}
            meta={`${stats.settledCount} opération(s)`}
          />
          <StatCard
            label="Opérations en attente"
            value={`${formatSats(stats.pendingFcfa)} FCFA`}
            meta={`${stats.pendingCount} opération(s)`}
          />
          <StatCard label="Opérations annulées" value={`${stats.voidCount}`} meta={`${formatSats(stats.voidFcfa)} FCFA`} />
          <StatCard
            label={FICTIVE_OPS_TOTAL_LABEL}
            value={`${formatSats(stats.totalOpsFcfa)} FCFA`}
            meta={`${stats.totalCount} ligne(s) · dont ${formatSats(stats.unpaidFcfa)} non réglé`}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Activité par jour (fictive)</Text>
          <View style={styles.chart}>
            {bars.map((item) => (
              <View key={item.label} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: Math.max(6, (item.amountFcfa / maxBar) * 88) }]} />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Répartition par statut</Text>
          {breakdown.length === 0 ? <Text style={styles.meta}>Aucune opération sur cette période.</Text> : null}
          {breakdown.map((item) => (
            <View key={item.status} style={styles.statusRow}>
              <Text style={styles.statusLabel}>{item.label}</Text>
              <View style={styles.statusTrack}>
                <View style={[styles.statusFill, { width: `${Math.max(8, (item.amountFcfa / maxStatus) * 100)}%` }]} />
              </View>
              <Text style={styles.meta}>
                {item.count} · {formatSats(item.amountFcfa)} FCFA
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Évolution des montants fictifs</Text>
          {bars.map((item) => (
            <View key={`evo-${item.label}`} style={styles.evoRow}>
              <Text style={styles.statusLabel}>{item.label}</Text>
              <Text style={styles.meta}>
                {formatSats(item.amountFcfa)} FCFA · {item.count} op.
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Opérations récentes</Text>
        {recent.map((sale) => (
          <Pressable
            key={sale.id}
            accessibilityRole="button"
            style={styles.sale}
            onPress={() =>
              sale.specimen
                ? navigation.navigate("MerchantReceipt", { saleId: sale.id })
                : navigation.navigate("MerchantSalesHistory")
            }
          >
            <View style={styles.flex}>
              <Text style={styles.saleTitle}>{sale.label}</Text>
              <Text style={styles.meta}>
                {sale.timeLabel} · {saleStatusLabel(sale.status)}
              </Text>
            </View>
            <Text style={styles.saleAmount}>{formatSats(sale.amountFcfa)} FCFA</Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          style={styles.secondary}
          onPress={() => navigation.navigate("MerchantSalesHistory")}
        >
          <Text style={styles.secondaryText}>Voir l'historique</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.meta}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: MERCHANT_FAB_CLEARANCE, gap: 12, width: "100%" },
  banner: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FEF0C7",
    borderColor: "#FEDF89",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  bannerText: { flex: 1, color: "#7A2E0E", fontSize: 13, fontWeight: "800" },
  hint: { color: "#7A2E0E", fontSize: 12, lineHeight: 18 },
  filters: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.stitchBlueHigh,
  },
  chipOn: { backgroundColor: colors.navy },
  chipText: { color: colors.navy, fontWeight: "700", fontSize: 12 },
  chipTextOn: { color: colors.white },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
    ...shadow.card,
  },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  statValue: { color: colors.navy, fontWeight: "800", fontSize: 16 },
  card: { width: "100%", backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, gap: 10, ...shadow.card },
  section: { color: colors.navy, fontWeight: "800" },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 110, gap: 6 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: {
    width: "100%",
    height: 88,
    backgroundColor: colors.stitchBlueLow,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", backgroundColor: colors.stitchOrange, borderRadius: 6 },
  barLabel: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  statusRow: { gap: 4 },
  statusLabel: { color: colors.navy, fontWeight: "700", fontSize: 13 },
  statusTrack: { height: 8, backgroundColor: colors.stitchBlueLow, borderRadius: 4, overflow: "hidden" },
  statusFill: { height: 8, backgroundColor: colors.navy, borderRadius: 4 },
  evoRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  meta: { color: colors.muted, fontSize: 12 },
  sale: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadow.card,
  },
  flex: { flex: 1, minWidth: 0 },
  saleTitle: { color: colors.navy, fontWeight: "700" },
  saleAmount: { color: colors.navy, fontWeight: "800", fontSize: 13 },
  secondary: {
    width: "100%",
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  secondaryText: { color: colors.navy, fontWeight: "700" },
});
