import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark, ErrorBanner, PrimaryButton } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../services/errors";
import { colors, radius, spacing } from "../theme";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("user@smartpay.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Connexion impossible. Vérifiez l'API et vos identifiants.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.inner}>
          <BrandMark />
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>
            JWT stocké dans Expo SecureStore. Aucun macaroon LND n'est embarqué dans l'application.
          </Text>
          {error ? <ErrorBanner message={error} /> : null}
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="user@smartpay.local"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Mot de passe local"
            placeholderTextColor={colors.muted}
          />
          <PrimaryButton label="Entrer" onPress={onSubmit} loading={loading} disabled={!email || !password} />
          <Text style={styles.hint}>Compte seed P01 : user@smartpay.local (voir .env local, jamais en production).</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray },
  flex: { flex: 1 },
  inner: { flex: 1, padding: spacing.lg, gap: spacing.sm, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: colors.navy, marginTop: spacing.md },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  label: { color: colors.navy, fontWeight: "600", marginTop: 8 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 48,
    color: colors.navy,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
