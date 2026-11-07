import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
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

import {
  AuthHeader,
  AuthPrimaryButton,
  PendingNotice,
} from "../components/AuthChrome";
import { SmartPayLogo } from "../components/SmartPayLogo";
import { ErrorBanner } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import {
  DEMO_USER_LOCATION,
  FORGOT_PASSWORD_PENDING_MESSAGE,
  LOGIN_PASSWORD_PLACEHOLDER,
  LOGIN_TITLE,
  demoEmailPrefill,
  loginFieldErrors,
  loginUserFacingError,
  showDevAuthTools,
} from "../lib/authEntry";
import { canSubmitLogin, loginFieldsAfterRegister, loginPasswordAutoFill } from "../lib/registerForm";
import type { AppStackParamList } from "../navigation/types";
import { api } from "../services/api";
import { ApiError } from "../services/errors";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Login">;

export function LoginScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const devTools = showDevAuthTools();
  const fromRegister = Boolean(route.params?.fromRegister || route.params?.registeredEmail);
  const postRegister = fromRegister
    ? loginFieldsAfterRegister(route.params?.registeredEmail ?? "")
    : null;
  const [email, setEmail] = useState(() => postRegister?.email || demoEmailPrefill());
  const [password, setPassword] = useState<string>(() => postRegister?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [loadedApiUrl, setLoadedApiUrl] = useState("");
  const [showDev, setShowDev] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() => postRegister?.notice ?? null);
  const [loading, setLoading] = useState(false);
  const allowPasswordAutofill = loginPasswordAutoFill(fromRegister);

  useEffect(() => {
    if (!fromRegister) {
      return;
    }
    const fields = loginFieldsAfterRegister(route.params?.registeredEmail ?? "");
    setEmail(fields.email);
    setPassword(fields.password);
    setNotice(fields.notice);
  }, [fromRegister, route.params?.registeredEmail]);

  useEffect(() => {
    if (!devTools) {
      return;
    }
    void api.getBaseUrl().then((url) => {
      setApiUrl(url);
      setLoadedApiUrl(url);
    });
  }, [devTools]);

  async function onSubmit() {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setNotice(null);
    setLoading(true);
    try {
      const nextUrl = apiUrl.trim().replace(/\/$/, "");
      const previousUrl = loadedApiUrl.trim().replace(/\/$/, "");
      if (devTools && nextUrl && nextUrl !== previousUrl) {
        await api.setApiBaseUrl(nextUrl);
        setLoadedApiUrl(nextUrl);
      }
      await login(email, password);
    } catch (err) {
      const fields = err instanceof ApiError ? loginFieldErrors(err.body) : {};
      if (fields.email || fields.password) {
        setEmailError(fields.email ?? null);
        setPasswordError(fields.password ?? null);
      } else {
        setError(loginUserFacingError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  async function resetApiUrl() {
    await api.setApiBaseUrl("");
    const url = await api.getBaseUrl();
    setApiUrl(url);
    setLoadedApiUrl(url);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AuthHeader
        showBack
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Welcome"))}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <SmartPayLogo size={72} />
            <Text style={styles.title}>{LOGIN_TITLE}</Text>
          </View>

          {error ? <ErrorBanner message={error} /> : null}
          {notice ? <PendingNotice message={notice} /> : null}

          <View style={styles.form}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="at" size={18} color={colors.muted} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                value={email}
                onChangeText={setEmail}
                placeholder="e-mail"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
              <TextInput
                key={fromRegister ? "login-password-after-register" : "login-password"}
                secureTextEntry={!showPassword}
                autoComplete={allowPasswordAutofill ? "password" : "off"}
                textContentType={allowPasswordAutofill ? "password" : "none"}
                importantForAutofill={allowPasswordAutofill ? "yes" : "no"}
                value={password}
                onChangeText={setPassword}
                placeholder={LOGIN_PASSWORD_PLACEHOLDER}
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onPress={() => setShowPassword((current) => !current)}
                hitSlop={8}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
              </Pressable>
            </View>
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

            <Text style={styles.forgot}>
              Mot de passe oublié ? {FORGOT_PASSWORD_PENDING_MESSAGE}
            </Text>

            <AuthPrimaryButton
              label="Se connecter"
              onPress={() => void onSubmit()}
              loading={loading}
              disabled={!canSubmitLogin(email, password) || loading}
            />
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupMuted}>Pas encore de compte ?</Text>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Register")}>
              <Text style={styles.linkBold}>Créer un compte</Text>
            </Pressable>
          </View>

          {devTools ? (
            <View style={styles.devBox}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowDev((current) => !current)}
                style={styles.devToggle}
              >
                <Ionicons name="settings-outline" size={16} color={colors.stitchOnVariant} />
                <Text style={styles.devToggleText}>Options de développement</Text>
                <Ionicons
                  name={showDev ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.stitchOnVariant}
                />
              </Pressable>
              {showDev ? (
                <View style={styles.devBody}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setEmail(demoEmailPrefill(true))}
                    style={styles.devAction}
                  >
                    <Text style={styles.devActionTitle}>Compte de démonstration</Text>
                    <Text style={styles.devActionMeta}>
                      {demoEmailPrefill(true)} · {DEMO_USER_LOCATION}
                    </Text>
                  </Pressable>
                  <Text style={styles.label}>Adresse API</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="globe-outline" size={18} color={colors.muted} />
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      value={apiUrl}
                      onChangeText={setApiUrl}
                      placeholder="http://IP_LAN:PORT"
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                    />
                  </View>
                  <Text style={styles.devHint}>
                    Une adresse enregistrée ici reste active après redémarrage. Sinon
                    l'application utilise EXPO_PUBLIC_API_URL. Le port Metro (8084) n'est pas
                    l'API.
                  </Text>
                  <Pressable accessibilityRole="button" onPress={() => void resetApiUrl()}>
                    <Text style={styles.devActionTitle}>Réinitialiser l'adresse API</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  hero: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm },
  title: { color: colors.navy, fontSize: 28, fontWeight: "700", lineHeight: 36 },
  form: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    gap: 10,
  },
  label: { color: colors.stitchOnVariant, fontSize: 12, fontWeight: "600" },
  inputWrap: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.stitchBlueLow,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: { flex: 1, color: colors.navy, fontSize: 14, minHeight: 48 },
  forgot: { color: colors.stitchOnVariant, fontSize: 12, lineHeight: 18 },
  fieldError: { color: colors.stitchOrange, fontSize: 12, lineHeight: 16 },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  signupMuted: { color: colors.stitchOnVariant, fontSize: 14 },
  linkBold: { color: colors.stitchOrange, fontSize: 14, fontWeight: "800" },
  devBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 8,
  },
  devToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  devToggleText: { flex: 1, color: colors.stitchOnVariant, fontSize: 13, fontWeight: "600" },
  devBody: { gap: 8 },
  devAction: {
    backgroundColor: colors.stitchBlueLow,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  devActionTitle: { color: colors.navy, fontSize: 14, fontWeight: "700" },
  devActionMeta: { color: colors.stitchOnVariant, fontSize: 12 },
  devHint: { color: colors.stitchOnVariant, fontSize: 11, lineHeight: 16 },
});
