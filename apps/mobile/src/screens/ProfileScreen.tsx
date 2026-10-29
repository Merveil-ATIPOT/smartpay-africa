import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorBanner, GhostButton, PrimaryButton } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { colors, radius, spacing } from "../theme";

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const [apiUrl, setApiUrl] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.getBaseUrl().then(setApiUrl);
  }, []);

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Profil</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Compte</Text>
        <Text style={styles.value}>{user?.email}</Text>
        <Text style={styles.meta}>
          {user?.first_name} {user?.last_name} · {user?.country} · {user?.role}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Adresse API</Text>
        <Text style={styles.meta}>
          Émulateur Android : http://10.0.2.2:8000 · Simulateur iOS : http://127.0.0.1:8000 · Téléphone : IP LAN du PC.
          TLS n'est pas désactivé.
        </Text>
        <TextInput value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" style={styles.input} />
        <PrimaryButton label="Enregistrer l'URL" onPress={() => void saveUrl()} />
        {saved ? <Text style={styles.ok}>{saved}</Text> : null}
        {error ? <ErrorBanner message={error} /> : null}
      </View>
      <GhostButton label="Déconnexion" onPress={() => void logout()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray, padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 28, fontWeight: "800", color: colors.navy },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 8 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  value: { color: colors.navy, fontWeight: "800", fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 44,
    paddingHorizontal: 12,
    color: colors.navy,
  },
  ok: { color: colors.green, fontSize: 12 },
});
