import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MerchantHeader, MerchantSmartPayExit } from "../components/MerchantChrome";
import { formatSats } from "../lib/format";
import {
  DEMO_RATE_LINE,
  DEMO_SHOP,
  MERCHANT_DEMO_DISCLAIMER,
  applyKeypadBackspace,
  applyKeypadDigit,
  buildDemoQrPayload,
  createDemoReference,
  looksLikeBolt11,
  merchantFcfaFromSats,
  merchantSatsFromFcfa,
  type MerchantUnit,
} from "../lib/merchantDemo";
import type { MerchantStackParamList } from "../navigation/types";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<MerchantStackParamList, "MerchantCreateInvoice">;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"] as const;

export function MerchantCreateInvoiceScreen({ navigation, route }: Props) {
  const preset = route.params?.presetFcfa ?? 25_000;
  const [unit, setUnit] = useState<MerchantUnit>("FCFA");
  const [amount, setAmount] = useState(preset);
  const [note, setNote] = useState("Commande #SN-8924 — Articles divers");
  const [expiry, setExpiry] = useState<15 | 60>(15);
  const [tip, setTip] = useState(false);

  const amountFcfa = unit === "FCFA" ? amount : merchantFcfaFromSats(amount);
  const amountSats = unit === "SATS" ? amount : merchantSatsFromFcfa(amount);
  const display = formatSats(amount);
  const equiv =
    unit === "FCFA"
      ? `Équiv. indicatif · ~${formatSats(amountSats)} sats`
      : `Équiv. indicatif · ~${formatSats(amountFcfa)} FCFA`;

  const keypad = useMemo(() => KEYS, []);

  function onDigit(digit: string) {
    setAmount((current) => applyKeypadDigit(current, digit));
  }

  function generate() {
    if (amountFcfa < 100) {
      Alert.alert("Montant trop faible", "Saisissez au moins 100 FCFA de démonstration.");
      return;
    }
    const reference = createDemoReference();
    const payload = buildDemoQrPayload(reference, amountFcfa);
    if (looksLikeBolt11(payload)) {
      Alert.alert("QR refusé", "Un QR de démonstration ne peut pas ressembler à une facture BOLT11.");
      return;
    }
    navigation.navigate("MerchantQr", {
      amountFcfa,
      amountSats,
      note,
      expiryMinutes: expiry,
      till: DEMO_SHOP.till,
      reference,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <MerchantHeader title="Créer une facture" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{MERCHANT_DEMO_DISCLAIMER}</Text>
        </View>

        <View style={styles.navy}>
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleBtn, unit === "FCFA" && styles.toggleOn]}
              onPress={() => {
                if (unit !== "FCFA") {
                  setAmount(merchantFcfaFromSats(amount));
                  setUnit("FCFA");
                }
              }}
            >
              <Text style={[styles.toggleText, unit === "FCFA" && styles.toggleTextOn]}>FCFA</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, unit === "SATS" && styles.toggleOn]}
              onPress={() => {
                if (unit !== "SATS") {
                  setAmount(merchantSatsFromFcfa(amount));
                  setUnit("SATS");
                }
              }}
            >
              <Text style={[styles.toggleText, unit === "SATS" && styles.toggleTextOn]}>SATS</Text>
            </Pressable>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{display}</Text>
            <Text style={styles.unit}>{unit}</Text>
          </View>
          <Text style={styles.equiv}>{equiv}</Text>
          <Text style={styles.rate}>{DEMO_RATE_LINE}</Text>
        </View>

        <View style={styles.quickRow}>
          {[1000, 5000, 10000].map((value) => (
            <Pressable
              key={value}
              style={styles.quick}
              onPress={() => setAmount((current) => current + (unit === "FCFA" ? value : merchantSatsFromFcfa(value)))}
            >
              <Text style={styles.quickText}>+{formatSats(value)}</Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.quick}
            onPress={() => {
              const step = unit === "FCFA" ? 1000 : 100;
              setAmount((current) => Math.max(step, Math.ceil(current / step) * step));
            }}
          >
            <Text style={styles.quickText}>Arrondir</Text>
          </Pressable>
        </View>

        <View style={styles.keypad}>
          {chunk(keypad, 3).map((row) => (
            <View key={row.join("-")} style={styles.keyRow}>
              {row.map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={key === "back" ? "Effacer" : key}
                  style={styles.key}
                  onPress={() => (key === "back" ? setAmount((current) => applyKeypadBackspace(current)) : onDigit(key))}
                >
                  {key === "back" ? (
                    <Ionicons name="backspace-outline" size={22} color={colors.navy} />
                  ) : (
                    <Text style={styles.keyText}>{key}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.label}>Note facultative</Text>
        <TextInput value={note} onChangeText={setNote} style={styles.input} placeholder="Note de caisse" />

        <View style={styles.card}>
          <Text style={styles.label}>Poste de caisse</Text>
          <Text style={styles.value}>{DEMO_SHOP.till}</Text>
        </View>

        <Text style={styles.label}>Expiration (démo)</Text>
        <View style={styles.quickRow}>
          <Pressable style={[styles.expiry, expiry === 15 && styles.expiryOn]} onPress={() => setExpiry(15)}>
            <Text style={[styles.quickText, expiry === 15 && styles.expiryTextOn]}>15 minutes</Text>
          </Pressable>
          <Pressable style={[styles.expiry, expiry === 60 && styles.expiryOn]} onPress={() => setExpiry(60)}>
            <Text style={[styles.quickText, expiry === 60 && styles.expiryTextOn]}>1 heure</Text>
          </Pressable>
        </View>

        <View style={styles.tipRow}>
          <View style={styles.flex}>
            <Text style={styles.value}>Pourboire</Text>
            <Text style={styles.meta}>Option locale · non envoyée au réseau</Text>
          </View>
          <Switch value={tip} onValueChange={setTip} trackColor={{ true: colors.stitchOrange }} />
        </View>

        <Pressable accessibilityRole="button" style={styles.cta} onPress={generate}>
          <Ionicons name="qr-code-outline" size={20} color={colors.navy} />
          <Text style={styles.ctaText}>Générer le QR Code · {formatSats(amountFcfa)} FCFA</Text>
        </Pressable>
        <Pressable style={styles.reset} onPress={() => setAmount(0)}>
          <Text style={styles.meta}>Réinitialiser</Text>
        </Pressable>
        <MerchantSmartPayExit />
      </ScrollView>
    </SafeAreaView>
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size) as T[]);
  }
  return rows;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 32, gap: 10, width: "100%" },
  banner: {
    width: "100%",
    backgroundColor: "#FEF0C7",
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FEDF89",
  },
  bannerText: { color: "#7A2E0E", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  navy: {
    width: "100%",
    backgroundColor: colors.stitchNavy,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: 8,
  },
  toggle: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 240,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.pill,
    padding: 4,
  },
  toggleBtn: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  toggleOn: { backgroundColor: colors.stitchOrange },
  toggleText: { color: colors.white, fontWeight: "700", fontSize: 12 },
  toggleTextOn: { color: colors.navy },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  amount: { color: colors.white, fontSize: 34, fontWeight: "800" },
  unit: { color: colors.stitchOrange, fontSize: 18, fontWeight: "800" },
  equiv: { color: "#BFC6DC", fontSize: 13 },
  rate: { color: "#7C8498", fontSize: 11, textAlign: "center" },
  quickRow: { flexDirection: "row", gap: 8, width: "100%" },
  quick: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  quickText: { color: colors.navy, fontWeight: "700", fontSize: 11, textAlign: "center" },
  keypad: { width: "100%", backgroundColor: colors.white, borderRadius: radius.md, padding: 8, gap: 8, ...shadow.card },
  keyRow: { flexDirection: "row", gap: 8, width: "100%" },
  key: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: colors.stitchBlueLow,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { color: colors.navy, fontSize: 22, fontWeight: "800" },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  input: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    color: colors.navy,
  },
  card: { width: "100%", backgroundColor: colors.white, borderRadius: radius.md, padding: 12, ...shadow.card },
  value: { color: colors.navy, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 12 },
  expiry: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  expiryOn: { backgroundColor: colors.stitchPeach },
  expiryTextOn: { color: "#6B3B00" },
  tipRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    ...shadow.card,
  },
  flex: { flex: 1, minWidth: 0 },
  cta: {
    width: "100%",
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.stitchOrange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { color: colors.navy, fontWeight: "800", textAlign: "center", flexShrink: 1 },
  reset: { alignItems: "center", minHeight: 40, justifyContent: "center" },
});
