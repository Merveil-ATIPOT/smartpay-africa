import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "../components/ui";
import { colors, radius, spacing } from "../theme";

const ITEMS = [
  { title: "Transfert Direct", subtitle: "Wave / Orange Money / MTN — hors P03", badge: "P04" },
  { title: "Assistant IA", subtitle: "Hors périmètre P03", badge: "P04" },
  { title: "Payer Boutique", subtitle: "Terminal marchand — hors P03", badge: "P04" },
  { title: "Robinet Faucet", subtitle: "Crédit démo Stitch non branché à LND", badge: "Maquette" },
];

export function ServicesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Services</Text>
      <Text style={styles.sub}>
        Grille reprise de M08 pour la navigation Stitch. Aucun service FCFA, Wave, Orange Money ou MTN n'est actif.
      </Text>
      <View style={styles.grid}>
        {ITEMS.map((item) => (
          <View key={item.title} style={styles.card}>
            <Badge label={item.badge} tone="muted" />
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>{item.subtitle}</Text>
          </View>
        ))}
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
    opacity: 0.85,
  },
  name: { color: colors.navy, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 11 },
});
