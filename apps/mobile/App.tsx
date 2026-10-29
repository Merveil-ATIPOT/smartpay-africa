import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@smartpay/design-tokens";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>SMARTPAY AFRICA</Text>
      <Text style={styles.title}>Phase P01</Text>
      <Text style={styles.body}>
        Application mobile Expo. Les écrans Stitch et les paiements Lightning réels
        ne sont pas inclus dans cette phase. Fournisseur Mock, réseau Regtest.
      </Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  kicker: {
    color: colors.accent,
    letterSpacing: 3,
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "600",
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
});
