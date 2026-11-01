import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "../components/ui";
import { MERCHANT_DEMO_ENTRY_LABEL } from "../lib/merchantDemo";
import { openMerchantDemo } from "../lib/merchantNavigation";
import type { AppStackParamList, TabParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

export function ServicesScreen() {
  const tabs = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const parent = tabs.getParent<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Services</Text>
      <Text style={styles.sub}>
        Transfert Direct : simulation. Aucun paiement réel. Les paiements Lightning du Scanner et de Recevoir
        restent inchangés. Aucun opérateur Wave, Orange Money ou MTN n'est contacté.
      </Text>
      <View style={styles.grid}>
        <Pressable
          style={styles.card}
          onPress={() => parent?.navigate("TransferDestination")}
          accessibilityRole="button"
        >
          <Badge label="Simulation" tone="orange" />
          <Text style={styles.name}>Transfert Direct</Text>
          <Text style={styles.meta}>Préparation enregistrée · aucun paiement Lightning</Text>
        </Pressable>
        <Pressable
          style={styles.card}
          onPress={() => parent && openMerchantDemo(parent)}
          accessibilityRole="button"
        >
          <Badge label="Démo locale" tone="orange" />
          <Text style={styles.name}>{MERCHANT_DEMO_ENTRY_LABEL}</Text>
          <Text style={styles.meta}>Démonstration · aucun paiement Lightning</Text>
        </Pressable>
        <Pressable
          style={styles.card}
          onPress={() => parent?.navigate("AssistantHome")}
          accessibilityRole="button"
        >
          <Badge label="Pédagogie" tone="orange" />
          <Text style={styles.name}>Assistant IA</Text>
          <Text style={styles.meta}>Questions · SmartPay Academy</Text>
        </Pressable>
        <View style={[styles.card, styles.cardOff]}>
          <Badge label="Hors phase" tone="muted" />
          <Text style={styles.name}>Payer Boutique</Text>
          <Text style={styles.meta}>Non disponible</Text>
        </View>
        <View style={[styles.card, styles.cardOff]}>
          <Badge label="Maquette" tone="muted" />
          <Text style={styles.name}>Robinet Faucet</Text>
          <Text style={styles.meta}>Non branché</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray, padding: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.navy },
  sub: { color: colors.muted, fontSize: 13, marginVertical: 8, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
    minHeight: 120,
  },
  cardOff: { opacity: 0.55 },
  name: { color: colors.navy, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 11 },
});
