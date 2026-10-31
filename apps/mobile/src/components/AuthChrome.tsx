import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radius, shadow, spacing } from "../theme";
import { SmartPayLogo } from "./SmartPayLogo";

export function AuthHeader({
  onBack,
  showBack = false,
}: {
  onBack?: () => void;
  showBack?: boolean;
}) {
  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={onBack}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </Pressable>
      ) : (
        <View style={styles.iconBtn} />
      )}
      <View style={styles.brand}>
        <SmartPayLogo size={32} />
        <Text style={styles.brandTitle}>SmartPay Africa</Text>
      </View>
      <View style={styles.iconBtn} />
    </View>
  );
}

export function DemoRegtestBadge({ label = "Mode démonstration — Regtest" }: { label?: string }) {
  return (
    <View style={styles.badge}>
      <View style={styles.badgeDot} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function AuthPrimaryButton({
  label,
  onPress,
  icon = "arrow-forward",
  loading,
  loadingLabel = "Connexion…",
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && styles.btnOff,
        pressed && !disabled && { opacity: 0.92 },
      ]}
    >
      <Text style={styles.primaryBtnText}>{loading ? loadingLabel : label}</Text>
      {!loading ? <Ionicons name={icon} size={18} color="#2D1600" /> : null}
    </Pressable>
  );
}

export function AuthNavyButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.navyBtn, pressed && { opacity: 0.92 }]}
    >
      <Text style={styles.navyBtnText}>{label}</Text>
    </Pressable>
  );
}

export function PendingNotice({ message }: { message: string }) {
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Ionicons name="information-circle" size={18} color={colors.orange} />
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

export function AuthFooterNote({ children }: { children: ReactNode }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{children}</Text>
    </View>
  );
}

/** Conservé pour une réutilisation future dans M03. Non affiché sur M02. */
export function FeatureRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.feature}>
      <View style={[styles.featureIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/** Conservé pour une réutilisation future dans M03. Non affiché sur M02. */
export function CorridorMapPreview() {
  return (
    <View style={styles.hero}>
      <LinearGradient colors={["#141B2C", "#1D2939"]} style={styles.map}>
        <View style={styles.mapBand}>
          <Text style={styles.mapCities}>Dakar ⇄ Abidjan ⇄ Congo</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" },
  brandTitle: { color: colors.navy, fontSize: 16, fontWeight: "700" },
  badge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.stitchPeach,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.stitchOrange },
  badgeText: {
    color: "#663800",
    fontSize: 12,
    fontWeight: "600",
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.stitchOrange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryBtnText: { color: "#2D1600", fontSize: 16, fontWeight: "700" },
  navyBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.stitchNavy,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  navyBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  btnOff: { opacity: 0.55 },
  notice: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.amberBg,
    borderRadius: 12,
    padding: 12,
    alignItems: "flex-start",
  },
  noticeText: { color: colors.navy, flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  footer: {
    alignItems: "center",
    paddingVertical: 4,
  },
  footerText: { color: colors.stitchOnVariant, fontSize: 12, textAlign: "center" },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    ...shadow.card,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCopy: { flex: 1, gap: 2 },
  featureTitle: { color: colors.navy, fontSize: 16, fontWeight: "600" },
  featureSub: { color: colors.stitchOnVariant, fontSize: 12, lineHeight: 18 },
  hero: {
    backgroundColor: colors.stitchBlue,
    borderRadius: 20,
    padding: spacing.md,
    overflow: "hidden",
  },
  map: {
    height: 120,
    borderRadius: 12,
    padding: 10,
    justifyContent: "flex-end",
  },
  mapBand: {
    backgroundColor: "rgba(20,27,44,0.88)",
    borderRadius: 10,
    padding: 10,
  },
  mapCities: { color: colors.white, fontSize: 12, fontWeight: "600", textAlign: "center" },
});
