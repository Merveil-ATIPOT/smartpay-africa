import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MerchantHeader } from "../components/MerchantChrome";
import { formatSats } from "../lib/format";
import {
  DEMO_SALES,
  FICTIVE_OPS_TOTAL_LABEL,
  MERCHANT_DEMO_DISCLAIMER,
  filterSales,
  merchantSatsFromFcfa,
  saleStatusLabel,
  type MerchantSaleFilter,
} from "../lib/merchantDemo";
import { MERCHANT_FAB_CLEARANCE, goSmartPayHome } from "../lib/merchantNavigation";
import type { MerchantStackParamList, MerchantTabParamList } from "../navigation/types";
import { colors, radius, shadow, spacing } from "../theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "MerchantSalesHistory">,
  NativeStackScreenProps<MerchantStackParamList>
>;

const FILTERS: { id: MerchantSaleFilter; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "today", label: "Aujourd'hui" },
  { id: "pending", label: "En attente" },
  { id: "refunds", label: "Annulées" },
];

export function MerchantSalesHistoryScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MerchantSaleFilter>("all");
  const rows = useMemo(() => filterSales(DEMO_SALES, query, filter), [query, filter]);
  const totalFcfa = rows.reduce((sum, sale) => sum + sale.amountFcfa, 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <MerchantHeader title="Historique des ventes" onBack={() => goSmartPayHome(navigation)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.navy}>
          <Text style={styles.kicker}>{FICTIVE_OPS_TOTAL_LABEL}</Text>
          <Text style={styles.amount}>{formatSats(totalFcfa)} FCFA</Text>
          <Text style={styles.sub}>
            ≈ {formatSats(merchantSatsFromFcfa(totalFcfa))} sats · {rows.length} ligne(s) affichée(s)
          </Text>
        </View>
        <Text style={styles.disclaimer}>{MERCHANT_DEMO_DISCLAIMER}</Text>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Référence, client, note…"
            style={styles.search}
          />
          <Pressable
            style={styles.export}
            onPress={() => Alert.alert("Export prévu", "L'export du relevé n'est pas implémenté.")}
          >
            <Ionicons name="download-outline" size={18} color={colors.navy} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={[styles.chip, filter === item.id && styles.chipOn]}
            >
              <Text style={[styles.chipText, filter === item.id && styles.chipTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {rows.map((sale) => (
          <Pressable
            key={sale.id}
            accessibilityRole="button"
            style={styles.row}
            onPress={() => navigation.navigate("MerchantReceipt", { saleId: sale.id })}
          >
            <View style={styles.icon}>
              <Ionicons name={sale.status === "void" ? "close" : "flash"} size={16} color={colors.navy} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.title}>{sale.label}</Text>
              <Text style={styles.meta}>
                #{sale.id} · {sale.timeLabel} · {saleStatusLabel(sale.status)}
              </Text>
              <Text style={styles.note}>{sale.note}</Text>
            </View>
            <Text style={styles.amountSmall}>{formatSats(sale.amountFcfa)} FCFA</Text>
          </Pressable>
        ))}
        {rows.length === 0 ? <Text style={styles.empty}>Aucune vente fictive ne correspond.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: MERCHANT_FAB_CLEARANCE, gap: 10, width: "100%" },
  navy: {
    width: "100%",
    backgroundColor: colors.stitchNavy,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  kicker: { color: "#BFC6DC", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  amount: { color: colors.white, fontSize: 28, fontWeight: "800" },
  sub: { color: "#FFB874", fontSize: 13 },
  disclaimer: { color: "#7A2E0E", fontSize: 12, lineHeight: 18 },
  searchRow: { flexDirection: "row", gap: 8, width: "100%" },
  search: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.navy,
  },
  export: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
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
  row: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    alignItems: "flex-start",
    ...shadow.card,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.stitchBlueLow,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, minWidth: 0 },
  title: { color: colors.navy, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  note: { color: colors.muted, fontSize: 11, marginTop: 2 },
  amountSmall: { color: colors.navy, fontWeight: "800", fontSize: 13 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 12 },
});
