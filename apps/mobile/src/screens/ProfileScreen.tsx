import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, BrandMark, ErrorBanner, PrimaryButton } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import {
  PROFILE_DEFERRED_NOTE,
  PROFILE_LOGOUT_LABEL,
  PROFILE_MERCHANT_CTA,
  PROFILE_MERCHANT_HINT,
  PROFILE_REGTEST_BADGE,
  PROFILE_SANDBOX_FOOTER,
  profileDisplayName,
  profileInfoRows,
  profileInitials,
  profileRoleLabel,
} from "../lib/profileDisplay";
import { openMerchantDemo } from "../lib/merchantNavigation";
import type { AppStackParamList, TabParamList } from "../navigation/types";
import { api } from "../services/api";
import { colors, radius, shadow, spacing } from "../theme";

export function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const tabs = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [apiUrl, setApiUrl] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.getBaseUrl().then(setApiUrl);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshUser().catch(() => {
        /* Le profil déjà chargé reste affiché si /me/ est temporairement injoignable. */
      });
    }, [refreshUser]),
  );

  function openMerchantSpace() {
    const parent = tabs.getParent<NativeStackNavigationProp<AppStackParamList>>();
    if (parent) {
      openMerchantDemo(parent);
    }
  }

  function confirmLogout() {
    Alert.alert("Déconnexion", "La session JWT locale sera effacée. Le compte n'est pas modifié côté serveur.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => void logout() },
    ]);
  }

  async function saveUrl() {
    setError(null);
    try {
      if (!/^https?:\/\//i.test(apiUrl.trim())) {
        throw new Error("L'URL API doit commencer par http:// ou https://.");
      }
      await api.setApiBaseUrl(apiUrl);
      setSaved("Adresse API enregistrée (SecureStore). Relancez un écran pour l'utiliser.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "URL invalide.");
    }
  }

  const rows = user ? profileInfoRows(user) : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <BrandMark compact />
            <View style={styles.headerAvatar}>
              <Ionicons name="person" size={16} color={colors.navy} />
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Badge label={PROFILE_REGTEST_BADGE} tone="orange" />
          </View>

          <View style={styles.card}>
            <View style={styles.identityRow}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{user ? profileInitials(user) : "SP"}</Text>
              </View>
              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={2}>
                  {user ? profileDisplayName(user) : "Compte"}
                </Text>
                {user ? (
                  <View style={styles.metaPills}>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{profileRoleLabel(user.role)}</Text>
                    </View>
                    <View style={styles.pill}>
                      <Text style={styles.pillText} numberOfLines={1}>
                        {rows.find((row) => row.key === "country")?.value}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <Text style={styles.email} numberOfLines={1}>
                  {user?.email ?? ""}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={PROFILE_MERCHANT_CTA}
            onPress={openMerchantSpace}
            style={({ pressed }) => [styles.merchantCta, pressed && styles.pressed]}
          >
            <View style={styles.merchantIcon}>
              <Ionicons name="storefront-outline" size={20} color={colors.orange} />
            </View>
            <View style={styles.merchantCopy}>
              <Text style={styles.merchantTitle}>{PROFILE_MERCHANT_CTA}</Text>
              <Text style={styles.merchantHint}>{PROFILE_MERCHANT_HINT}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Informations du compte</Text>
            {rows.map((row) => (
              <View key={row.key} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.deferred}>{PROFILE_DEFERRED_NOTE}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={PROFILE_LOGOUT_LABEL}
            onPress={confirmLogout}
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          >
            <Ionicons name="log-out-outline" size={18} color="#D92D20" />
            <Text style={styles.logoutText}>{PROFILE_LOGOUT_LABEL}</Text>
          </Pressable>
          <Text style={styles.footer}>{PROFILE_SANDBOX_FOOTER}</Text>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Connexion technique à l'API</Text>
            <Text style={styles.techHint}>
              Émulateur Android : http://10.0.2.2:8000 · Simulateur iOS : http://127.0.0.1:8000 · Téléphone : IP LAN du
              PC. TLS n'est pas désactivé.
            </Text>
            <TextInput
              value={apiUrl}
              onChangeText={setApiUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.input}
            />
            <PrimaryButton label="Enregistrer l'URL" onPress={() => void saveUrl()} />
            {saved ? <Text style={styles.ok}>{saved}</Text> : null}
            {error ? <ErrorBanner message={error} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  flex: { flex: 1 },
  content: {
    padding: spacing.md,
    paddingBottom: 36,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.stitchBlueHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: { alignItems: "flex-start" },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 10,
    ...shadow.card,
  },
  identityRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.stitchNavy,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: colors.white, fontWeight: "800", fontSize: 20 },
  identityText: { flex: 1, gap: 4 },
  name: { color: colors.navy, fontSize: 18, fontWeight: "800" },
  metaPills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    backgroundColor: colors.stitchBlue,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: { color: colors.stitchOnVariant, fontSize: 11, fontWeight: "600" },
  email: { color: colors.muted, fontSize: 13 },
  merchantCta: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.card,
  },
  merchantIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  merchantCopy: { flex: 1, gap: 2 },
  merchantTitle: { color: colors.navy, fontWeight: "700", fontSize: 15 },
  merchantHint: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  sectionLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  infoRow: { gap: 2 },
  infoLabel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  infoValue: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  deferred: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
  logout: {
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: "#FEE4E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { color: "#D92D20", fontWeight: "700", fontSize: 15 },
  footer: { color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16 },
  techHint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: 12,
    color: colors.navy,
  },
  ok: { color: colors.green, fontSize: 12 },
  pressed: { opacity: 0.85 },
});
