import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ACADEMY_REGTEST_BADGE } from "../lib/academy";
import { colors, spacing } from "../theme";
import { SmartPayLogo } from "./SmartPayLogo";
import { Badge } from "./ui";

export function AcademyHeader({
  title,
  onBack,
  accessibilityLabel = "Retour",
}: {
  title: string;
  onBack: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.iconBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.navy} />
      </Pressable>
      <SmartPayLogo size={28} />
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <Badge label={ACADEMY_REGTEST_BADGE} tone="orange" />
      </View>
    </View>
  );
}

export function AcademySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray,
  },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  headerTitle: { color: colors.navy, fontWeight: "700", fontSize: 15 },
  section: { gap: 8 },
  sectionTitle: { color: colors.navy, fontWeight: "700", fontSize: 16 },
});
