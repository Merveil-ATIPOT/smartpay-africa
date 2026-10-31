import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radius, shadow, spacing } from "../theme";
import { SmartPayLogo } from "./SmartPayLogo";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <SmartPayLogo size={compact ? 28 : 36} />
      <Text style={[styles.brandTitle, compact && { fontSize: 15 }]}>
        SmartPay <Text style={styles.brandAccent}>Africa</Text>
      </Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({
  label,
  tone = "navy",
}: {
  label: string;
  tone?: "navy" | "orange" | "green" | "muted";
}) {
  const palette = {
    navy: { bg: colors.navy, fg: colors.white },
    orange: { bg: colors.amberBg, fg: colors.orange },
    green: { bg: colors.mint, fg: colors.green },
    muted: { bg: colors.gray, fg: colors.muted },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && { opacity: 0.9 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={colors.white} /> : null}
          <Text style={styles.primaryText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export function LoadingBlock({ label = "Chargement…" }: { label?: string }) {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.orange} />
      <Text style={styles.emptySubtitle}>{label}</Text>
    </View>
  );
}

export function ModeBanner({
  provider,
  lightningConnected,
}: {
  provider: string;
  lightningConnected?: boolean;
}) {
  const isLnd = provider === "lnd_regtest";
  return (
    <View style={styles.modeBanner}>
      <Ionicons name="warning" size={16} color={colors.orange} />
      <Text style={styles.modeText}>
        {isLnd ? "MODE DÉMONSTRATION · REGTEST" : "MODE DÉMONSTRATION · MOCK"}
      </Text>
      {isLnd ? (
        <Badge label={lightningConnected ? "Nœud actif" : "Nœud injoignable"} tone={lightningConnected ? "green" : "muted"} />
      ) : (
        <Badge label="Simulé" tone="muted" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandTitle: { color: colors.navy, fontSize: 18, fontWeight: "800" },
  brandAccent: { color: colors.orange },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  primary: {
    backgroundColor: colors.orange,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.55 },
  ghost: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.gray,
  },
  ghostText: { color: colors.navy, fontWeight: "600" },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FEF3F2",
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "flex-start",
  },
  errorText: { color: colors.danger, flex: 1, fontSize: 13 },
  empty: { padding: spacing.lg, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.navy, fontWeight: "700" },
  emptySubtitle: { color: colors.muted, textAlign: "center", fontSize: 13 },
  modeBanner: {
    backgroundColor: colors.amberBg,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modeText: { color: colors.navy, fontSize: 11, fontWeight: "700", flex: 1 },
});
