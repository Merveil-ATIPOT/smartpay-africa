import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MERCHANT_DEMO_SHOP_BANNER, MERCHANT_TAB_SCREENS } from "../lib/merchantDemo";
import { goSmartPayHome } from "../lib/merchantNavigation";
import type { AppStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

const TAB_ITEMS = [
  { name: MERCHANT_TAB_SCREENS.home, label: "Caisse", icon: "storefront-outline" },
  { name: MERCHANT_TAB_SCREENS.sales, label: "Ventes", icon: "cash-outline" },
  { name: MERCHANT_TAB_SCREENS.history, label: "Historique", icon: "receipt-outline" },
  { name: MERCHANT_TAB_SCREENS.shop, label: "Boutique", icon: "business-outline" },
] as const;

export function MerchantHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return (
    <View style={styles.headerBlock}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={onBack ?? (() => navigation.goBack())}
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <View style={styles.mark}>
          <Ionicons name="flash" size={16} color={colors.orange} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.brand}>SmartPay Africa</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.regtest}>
          <View style={styles.dot} />
          <Text style={styles.regtestLabel}>Regtest</Text>
        </View>
      </View>
      <View style={styles.demoStrip} accessibilityRole="text">
        <Text style={styles.demoStripText}>{MERCHANT_DEMO_SHOP_BANNER}</Text>
      </View>
    </View>
  );
}

/** Sortie explicite vers SmartPay sur facture / QR / reçu, où le FAB est masqué. */
export function MerchantSmartPayExit() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Accueil SmartPay"
      onPress={() => goSmartPayHome(navigation)}
      style={styles.exit}
    >
      <Ionicons name="home-outline" size={18} color={colors.navy} />
      <Text style={styles.exitLabel}>Accueil SmartPay</Text>
    </Pressable>
  );
}

export function MerchantTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TAB_ITEMS.map((item) => {
        const route = state.routes.find((entry) => entry.name === item.name);
        const active = current === item.name;
        return (
          <TabItem
            key={item.name}
            label={item.label}
            icon={item.icon}
            active={active}
            onPress={() => {
              if (!route || active) {
                return;
              }
              navigation.navigate(route.name, route.params);
            }}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.tab}
    >
      <Ionicons name={icon} size={20} color={active ? colors.orange : colors.muted} />
      <Text style={[styles.tabLabel, active && styles.tabActiveText]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.stitchNavy,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, minWidth: 0 },
  brand: { color: colors.navy, fontWeight: "800", fontSize: 15 },
  title: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  regtest: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF0C7",
    borderColor: "#FEDF89",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  regtestLabel: { color: "#B54708", fontSize: 11, fontWeight: "800" },
  demoStrip: {
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  demoStripText: { color: "#7A2E0E", fontSize: 11, fontWeight: "600", lineHeight: 15 },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: { flex: 1, alignItems: "center", minHeight: 44, gap: 2 },
  tabLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  tabActiveText: { color: colors.orange },
  exit: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  exitLabel: { color: colors.navy, fontWeight: "700" },
});
