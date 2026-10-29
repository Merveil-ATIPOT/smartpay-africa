import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../theme";
import { Badge, BrandMark } from "./ui";

const STEPS = ["1. Pays", "2. Destinataire", "3. Montant", "4. Validation"] as const;

export function TransferHeader({
  onBack,
  title = "Transfert démo",
}: {
  onBack: () => void;
  title?: string;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" style={styles.iconBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.navy} />
      </Pressable>
      <BrandMark compact />
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <Badge label="Regtest" tone="orange" />
      <View style={styles.avatar}>
        <Ionicons name="person" size={16} color={colors.white} />
      </View>
    </View>
  );
}

export function DemoBanner({
  message,
  badge = "Simulation · prototype démo",
}: {
  message: string;
  badge?: string;
}) {
  return (
    <View style={styles.banner}>
      <Ionicons name="flask" size={18} color={colors.orange} />
      <View style={{ flex: 1, gap: 4 }}>
        <Badge label={badge} tone="orange" />
        <Text style={styles.bannerText}>{message}</Text>
      </View>
    </View>
  );
}

export function TransferStepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const labels = ["Pays de destination", "Informations du destinataire", "Montant et conversion", "Vérification"];
  return (
    <View style={styles.stepper}>
      <View style={styles.stepRow}>
        <Text style={styles.stepKicker}>Étape {step} sur 4</Text>
        <Text style={styles.stepName}>{labels[step - 1]}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${step * 25}%` }]} />
      </View>
      <View style={styles.stepLabels}>
        {STEPS.map((label, index) => (
          <Text key={label} style={[styles.stepLabel, index + 1 === step && styles.stepLabelOn]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function TransferFooterNote({ children }: { children: ReactNode }) {
  return (
    <View style={styles.noteRow}>
      <Ionicons name="shield-checkmark" size={16} color={colors.green} />
      <Text style={styles.note}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, color: colors.navy, fontWeight: "800", fontSize: 14 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    backgroundColor: "#FFDCBF80",
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bannerText: { color: "#663800", fontSize: 12, lineHeight: 18 },
  stepper: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
  },
  stepRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepKicker: { color: colors.orange, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  stepName: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  track: { height: 8, backgroundColor: colors.stitchBlue, borderRadius: 8, overflow: "hidden" },
  fill: { height: 8, backgroundColor: colors.orange, borderRadius: 8 },
  stepLabels: { flexDirection: "row", justifyContent: "space-between" },
  stepLabel: { color: colors.muted, fontSize: 9, fontWeight: "600", flex: 1 },
  stepLabelOn: { color: colors.orange },
  noteRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", paddingVertical: 8 },
  note: { color: colors.muted, fontSize: 12, flex: 1, lineHeight: 18 },
});
