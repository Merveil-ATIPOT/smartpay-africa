import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AuthNavyButton,
  AuthPrimaryButton,
  DemoRegtestBadge,
} from "../components/AuthChrome";
import { SmartPayLogo } from "../components/SmartPayLogo";
import { REGTEST_FOOTER, WELCOME_TAGLINE } from "../lib/authEntry";
import type { AppStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.hero}>
        <SmartPayLogo size={120} />
        <Text style={styles.title}>SmartPay Africa</Text>
        <Text style={styles.tagline}>{WELCOME_TAGLINE}</Text>
      </View>
      <View style={styles.footer}>
        <AuthPrimaryButton label="Créer un compte" onPress={() => navigation.navigate("Register")} />
        <AuthNavyButton label="J'ai déjà un compte" onPress={() => navigation.navigate("Login")} />
        <DemoRegtestBadge label={REGTEST_FOOTER} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.stitchSurface,
    paddingHorizontal: spacing.lg,
    justifyContent: "space-between",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  title: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  tagline: {
    color: colors.stitchOnVariant,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 280,
  },
  footer: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
});
