import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MerchantHeader } from "../components/MerchantChrome";
import {
  DEMO_RATE_LINE,
  DEMO_SHOP,
  DEMO_TILLS,
  getShopSettings,
  setShopSettings,
  type MerchantShopSettings,
} from "../lib/merchantDemo";
import { MERCHANT_FAB_CLEARANCE, goMerchantCaisse, goSmartPayHome } from "../lib/merchantNavigation";
import type { MerchantStackParamList, MerchantTabParamList } from "../navigation/types";
import { colors, radius, shadow, spacing } from "../theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MerchantTabParamList, "MerchantShop">,
  NativeStackScreenProps<MerchantStackParamList>
>;

export function MerchantShopScreen({ navigation }: Props) {
  const [settings, setLocal] = useState<MerchantShopSettings>(getShopSettings);

  function update(next: Partial<MerchantShopSettings>) {
    setLocal(setShopSettings(next));
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <MerchantHeader title="Gestion de la boutique" onBack={() => goSmartPayHome(navigation)} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="storefront-outline" size={18} color="#B54708" />
          <Text style={styles.bannerText}>Boutique de démonstration</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Fiche boutique fictive</Text>
          <Text style={styles.shop}>{DEMO_SHOP.name}</Text>
          <Text style={styles.meta}>{DEMO_SHOP.id}</Text>
          <Text style={styles.meta}>{DEMO_SHOP.city}</Text>
          <Text style={styles.meta}>
            {DEMO_SHOP.tillName} · {DEMO_SHOP.tillPost}
          </Text>
        </View>

        <Text style={styles.section}>Caisses fictives</Text>
        {DEMO_TILLS.map((till) => (
          <View key={till.id} style={styles.card}>
            <View style={styles.tillRow}>
              <Text style={styles.tillName}>{till.name}</Text>
              {till.active ? <Text style={styles.active}>Poste actif</Text> : null}
            </View>
            <Text style={styles.meta}>{till.post}</Text>
            <Text style={styles.meta}>{till.status}</Text>
            <Text style={styles.meta}>{till.terminal}</Text>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.section}>Paramètres de facturation</Text>
          <Text style={styles.warn}>Mémoire locale de session · aucune sauvegarde permanente</Text>
          <Row label="Devise principale" value="FCFA" />
          <Row label="Affichage secondaire" value={settings.showSats ? "sats" : "masqué"} />
          <Row label="Taux indicatif" value={DEMO_RATE_LINE} />
          <Text style={styles.label}>Expiration par défaut</Text>
          <View style={styles.rowBtns}>
            <Pressable
              style={[styles.half, settings.defaultExpiryMinutes === 15 && styles.halfOn]}
              onPress={() => update({ defaultExpiryMinutes: 15 })}
            >
              <Text style={styles.halfText}>15 minutes</Text>
            </Pressable>
            <Pressable
              style={[styles.half, settings.defaultExpiryMinutes === 60 && styles.halfOn]}
              onPress={() => update({ defaultExpiryMinutes: 60 })}
            >
              <Text style={styles.halfText}>1 heure</Text>
            </Pressable>
          </View>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.tillName}>Afficher les sats</Text>
              <Text style={styles.meta}>Option locale · non envoyée au réseau</Text>
            </View>
            <Switch
              value={settings.showSats}
              onValueChange={(showSats) => update({ showSats })}
              trackColor={{ true: colors.stitchOrange }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={styles.tillName}>Pourboire</Text>
              <Text style={styles.meta}>Option de démonstration</Text>
            </View>
            <Switch
              value={settings.tipEnabled}
              onValueChange={(tipEnabled) => update({ tipEnabled })}
              trackColor={{ true: colors.stitchOrange }}
            />
          </View>
        </View>

        <View style={styles.navy}>
          <Text style={styles.navyKicker}>Informations du réseau</Text>
          <RowLight label="Environnement" value="Regtest" />
          <RowLight label="Mode" value="Démonstration locale" />
          <RowLight label="Factures Lightning réelles" value="Désactivées" />
          <RowLight label="Paiements" value="Désactivés" />
          <RowLight label="Backend marchand" value="Non connecté" />
        </View>

        <Pressable style={styles.cta} onPress={() => goMerchantCaisse(navigation)}>
          <Text style={styles.ctaText}>Retour à la caisse</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => navigation.navigate("MerchantCreateInvoice")}>
          <Text style={styles.halfText}>Créer une facture</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function RowLight({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.navyLabel}>{label}</Text>
      <Text style={styles.navyValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: MERCHANT_FAB_CLEARANCE, gap: 12, width: "100%" },
  banner: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FEF0C7",
    borderColor: "#FEDF89",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    alignItems: "center",
  },
  bannerText: { flex: 1, color: "#7A2E0E", fontSize: 13, fontWeight: "800" },
  card: { width: "100%", backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, gap: 6, ...shadow.card },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  shop: { color: colors.navy, fontSize: 18, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12 },
  section: { color: colors.navy, fontWeight: "800" },
  tillRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  tillName: { color: colors.navy, fontWeight: "800" },
  active: { color: colors.orange, fontSize: 11, fontWeight: "800" },
  warn: { color: "#B54708", fontSize: 12, fontWeight: "700" },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  value: { color: colors.navy, fontWeight: "700" },
  kv: { gap: 2, marginTop: 4 },
  rowBtns: { flexDirection: "row", gap: 8, width: "100%", marginTop: 4 },
  half: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.stitchBlueLow,
    alignItems: "center",
    justifyContent: "center",
  },
  halfOn: { backgroundColor: colors.stitchPeach },
  halfText: { color: colors.navy, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  flex: { flex: 1, minWidth: 0 },
  navy: { width: "100%", backgroundColor: colors.stitchNavy, borderRadius: radius.md, padding: spacing.md, gap: 8 },
  navyKicker: { color: colors.stitchOrange, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  navyLabel: { color: "#BFC6DC", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  navyValue: { color: colors.white, fontWeight: "700" },
  cta: {
    width: "100%",
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.stitchOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: colors.navy, fontWeight: "800" },
  secondary: {
    width: "100%",
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
