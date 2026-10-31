import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useRef, useState } from "react";
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
  DemoRegtestBadge,
} from "../components/AuthChrome";
import { ErrorBanner } from "../components/ui";
import { REGTEST_FOOTER } from "../lib/authEntry";
import { ConfirmLock } from "../lib/confirmLock";
import {
  DEFAULT_REGISTER_COUNTRY,
  REGISTER_COUNTRIES,
  REGISTER_PHONE_HELPER,
  REGISTER_PHONE_LABEL,
  REGISTER_SUBTITLE,
  REGISTER_TERMS_LABEL,
  REGISTER_TITLE,
  getRegisterCountry,
  loginRouteAfterRegister,
  passwordStrength,
  registerFieldErrors,
  registerUserFacingError,
  type RegisterCountry,
  type RegisterFormValues,
} from "../lib/registerForm";
import type { AppStackParamList } from "../navigation/types";
import { registerAccount } from "../services/auth";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState<RegisterCountry>(DEFAULT_REGISTER_COUNTRY);
  const [countryOpen, setCountryOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(new ConfirmLock());

  const values: RegisterFormValues = {
    firstName,
    lastName,
    country,
    phone,
    email,
    password,
    acceptedTerms,
  };
  const selected = getRegisterCountry(country);
  const strength = useMemo(() => passwordStrength(password), [password]);

  async function onSubmit() {
    const local = registerFieldErrors(values);
    const firstLocal = Object.values(local)[0] ?? null;
    setFieldError(firstLocal);
    setError(null);
    if (firstLocal) {
      return;
    }
    if (!submitLock.current.tryAcquire()) {
      return;
    }
    setLoading(true);
    try {
      const created = await registerAccount(values);
      const next = loginRouteAfterRegister(created.email);
      navigation.reset({
        index: 1,
        routes: [{ name: "Welcome" }, { name: "Login", params: next.params }],
      });
    } catch (err) {
      setError(registerUserFacingError(err));
    } finally {
      submitLock.current.release();
      setLoading(false);
    }
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
          <DemoRegtestBadge label={REGTEST_FOOTER} />
          <View style={styles.hero}>
            <Text style={styles.title}>{REGISTER_TITLE}</Text>
            <Text style={styles.subtitle}>{REGISTER_SUBTITLE}</Text>
          </View>

          {error ? <ErrorBanner message={error} /> : null}
          {fieldError && !error ? <ErrorBanner message={fieldError} /> : null}

          <View style={styles.form}>
            <Text style={styles.label}>Prénom</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={colors.muted} />
              <TextInput
                autoComplete="given-name"
                textContentType="givenName"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Awa"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>Nom</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={colors.muted} />
              <TextInput
                autoComplete="family-name"
                textContentType="familyName"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Diallo"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>{REGISTER_PHONE_LABEL}</Text>
            <View style={styles.phoneRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Pays ${selected.name}, indicatif ${selected.dialCode}`}
                onPress={() => setCountryOpen((current) => !current)}
                style={styles.countryChip}
              >
                <Text style={styles.countryChipText}>
                  {selected.flag} {selected.code} {selected.dialCode}
                </Text>
                <Ionicons
                  name={countryOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.navy}
                />
              </Pressable>
              <View style={[styles.inputWrap, styles.phoneInput]}>
                <Ionicons name="call-outline" size={18} color={colors.muted} />
                <TextInput
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={selected.placeholder}
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>
            </View>
            {countryOpen
              ? REGISTER_COUNTRIES.map((item) => (
                  <Pressable
                    key={item.code}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name} ${item.dialCode}`}
                    onPress={() => {
                      setCountry(item.code);
                      setCountryOpen(false);
                    }}
                    style={[styles.countryOption, item.code === country && styles.countryOptionOn]}
                  >
                    <Text style={styles.countryOptionText}>
                      {item.flag}  {item.name}  {item.dialCode}
                    </Text>
                  </Pressable>
                ))
              : null}
            <Text style={styles.helper}>{REGISTER_PHONE_HELPER}</Text>

            <Text style={styles.label}>Adresse e-mail</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.muted} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                placeholder="awa@example.sn"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
              <TextInput
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                placeholder="Au moins 8 caractères"
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
            <View style={styles.strength}>
              <View style={styles.strengthLabels}>
                <Text style={styles.strengthMuted}>Force du mot de passe</Text>
                <Text style={styles.strengthLabel}>{strength.label}</Text>
              </View>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((bar) => (
                  <View
                    key={bar}
                    style={[
                      styles.strengthBar,
                      bar <= strength.score && (strength.score >= 3 ? styles.barGood : styles.barWarn),
                    ]}
                  />
                ))}
              </View>
            </View>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              onPress={() => setAcceptedTerms((current) => !current)}
              style={styles.termsRow}
            >
              <View style={[styles.check, acceptedTerms && styles.checkOn]}>
                {acceptedTerms ? <Ionicons name="checkmark" size={14} color="#2D1600" /> : null}
              </View>
              <Text style={styles.termsText}>{REGISTER_TERMS_LABEL}</Text>
            </Pressable>

            <AuthPrimaryButton
              label="Créer mon compte"
              loadingLabel="Création…"
              onPress={() => void onSubmit()}
              loading={loading}
              disabled={loading}
            />
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginMuted}>Vous avez déjà un compte ?</Text>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Login")}>
              <Text style={styles.linkBold}>Se connecter</Text>
            </Pressable>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  hero: { gap: 6 },
  title: { color: colors.navy, fontSize: 28, fontWeight: "700", lineHeight: 36 },
  subtitle: { color: colors.stitchOnVariant, fontSize: 14, lineHeight: 20 },
  form: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    gap: 10,
  },
  label: { color: colors.stitchOnVariant, fontSize: 12, fontWeight: "600" },
  helper: { color: colors.stitchOnVariant, fontSize: 11, lineHeight: 16 },
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
  phoneRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  countryChip: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.stitchBlueLow,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countryChipText: { color: colors.navy, fontSize: 13, fontWeight: "700" },
  phoneInput: { flex: 1 },
  countryOption: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.stitchBlueLow,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  countryOptionOn: { backgroundColor: colors.stitchPeach },
  countryOptionText: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  strength: { gap: 6 },
  strengthLabels: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  strengthMuted: { color: colors.stitchOnVariant, fontSize: 11, fontWeight: "600" },
  strengthLabel: { color: colors.navy, fontSize: 11, fontWeight: "700" },
  strengthBars: { flexDirection: "row", gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 99, backgroundColor: colors.stitchBlue },
  barWarn: { backgroundColor: colors.stitchOrange },
  barGood: { backgroundColor: colors.stitchGreen },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.stitchBlue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkOn: { backgroundColor: colors.stitchOrange },
  termsText: { flex: 1, color: colors.stitchOnVariant, fontSize: 12, lineHeight: 18 },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  loginMuted: { color: colors.stitchOnVariant, fontSize: 14 },
  linkBold: { color: colors.stitchOrange, fontSize: 14, fontWeight: "800" },
});
