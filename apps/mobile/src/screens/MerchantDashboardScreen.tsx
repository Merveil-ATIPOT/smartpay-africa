import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MerchantHeader } from "../components/MerchantChrome";
import { formatSats } from "../lib/format";
import {
  DEMO_HOURLY_BARS,
  DEMO_SALES,
  DEMO_SHOP,
  MERCHANT_DEMO_DISCLAIMER,
  TODAY_DEMO_VOLUME_LABEL,
  TODAY_SALES_FCFA,
  merchantSatsFromFcfa,
  saleStatusLabel,
  saleStatusTone,
} from "../lib/merchantDemo";
import { MERCHANT_FAB_CLEARANCE, goSmartPayHome } from "../lib/merchantNavigation";
import type { MerchantStackParamList, MerchantTabParamList } from "../navigation/types";
import { colors, radius, shadow, spacing } from "../theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "MerchantHome">,
  NativeStackScreenProps<MerchantStackParamList>
>;

export function MerchantDashboardScreen({ navigation }: Props) {
  const sats = merchantSatsFromFcfa(TODAY_SALES_FCFA);
  const recent = DEMO_SALES.filter((sale) => sale.timeLabel !== "Hier").slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <MerchantHeader title="Terminal caisse" onBack={() => goSmartPayHome(navigation)} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="flask-outline" size={18} color="#B54708" />
          <Text style={styles.bannerText}>{MERCHANT_DEMO_DISCLAIMER}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.shopRow}>
            <View style={styles.shopIcon}>
              <Ionicons name="storefront" size={22} color={colors.white} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.shopName}>{DEMO_SHOP.name}</Text>
              <Text style={styles.meta}>
                {DEMO_SHOP.id} · {DEMO_SHOP.city}
              </Text>
              <Text style={styles.meta}>{DEMO_SHOP.till}</Text>
            </View>
          </View>
        </View>

        <View style={styles.navyCard}>
          <Text style={styles.navyKicker}>{TODAY_DEMO_VOLUME_LABEL}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.navyAmount}>{formatSats(TODAY_SALES_FCFA)}</Text>
            <Text style={styles.navyUnit}>FCFA</Text>
          </View>
          <Text style={styles.navySub}>
            ≈ {formatSats(sats)} sats · donnée de démonstration, pas un encaissement Lightning
          </Text>
          <View style={styles.bars}>
            {DEMO_HOURLY_BARS.map((value, index) => (
              <View key={index} style={styles.barTrack}>
                <View style={[styles.barFill, { height: Math.max(6, (value / 100) * 56) }]} />
              </View>
            ))}
          </View>
          <Text style={styles.navyHint}>Activité indicative 08h–18h · données fictives</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.primary}
          onPress={() => navigation.navigate("MerchantCreateInvoice")}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.navy} />
          <Text style={styles.primaryText}>Nouvel encaissement</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.secondary}
          onPress={() => navigation.navigate("MerchantSalesHistory")}
        >
          <Ionicons name="receipt-outline" size={18} color={colors.navy} />
          <Text style={styles.secondaryText}>Historique des ventes</Text>
        </Pressable>

        <Text style={styles.section}>Dernières opérations fictives</Text>
        {recent.map((sale) => {
          const tone = saleStatusTone(sale.status);
          return (
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
              <View style={[styles.saleIcon, tone === "pending" && styles.iconPending, tone === "void" && styles.iconVoid]}>
                <Ionicons
                  name={tone === "void" ? "close" : tone === "pending" ? "time" : "flash"}
                  size={16}
                  color={tone === "settled" ? colors.green : colors.navy}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.saleTitle}>{sale.label}</Text>
                <Text style={styles.meta}>
                  {sale.timeLabel} · {saleStatusLabel(sale.status)}
                </Text>
              </View>
              <Text style={[styles.saleAmount, tone === "settled" ? styles.amountSettled : styles.amountUnpaid]}>
                {formatSats(sale.amountFcfa)} FCFA
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
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
  bannerText: { flex: 1, color: "#7A2E0E", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  card: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
  shopRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  shopIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.stitchNavy,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, minWidth: 0 },
  shopName: { color: colors.navy, fontWeight: "800", fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  navyCard: {
    width: "100%",
    backgroundColor: colors.stitchNavy,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },
  navyKicker: { color: "#BFC6DC", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  navyAmount: { color: colors.white, fontSize: 32, fontWeight: "800" },
  navyUnit: { color: colors.stitchOrange, fontSize: 18, fontWeight: "800" },
  navySub: { color: "#BFC6DC", fontSize: 13 },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 56, gap: 6, marginTop: 8 },
  barTrack: {
    flex: 1,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", backgroundColor: colors.stitchOrange, borderRadius: 6 },
  navyHint: { color: "#7C8498", fontSize: 11 },
  primary: {
    width: "100%",
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.stitchOrange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: { color: colors.navy, fontWeight: "800", fontSize: 16 },
  secondary: {
    width: "100%",
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadow.card,
  },
  secondaryText: { color: colors.navy, fontWeight: "700" },
  section: { color: colors.navy, fontWeight: "800", marginTop: 4 },
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
  saleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.stitchBlueLow,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPending: { backgroundColor: colors.stitchPeach },
  iconVoid: { backgroundColor: "#FEE4E2" },
  saleTitle: { color: colors.navy, fontWeight: "700" },
  saleAmount: { fontWeight: "800", fontSize: 13 },
  amountSettled: { color: colors.green },
  amountUnpaid: { color: colors.navy },
});
