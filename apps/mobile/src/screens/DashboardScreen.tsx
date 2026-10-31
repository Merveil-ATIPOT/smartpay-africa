import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { HealthResponse, Payment, WalletConnection } from "@smartpay/contracts";

import { Badge, BrandMark, EmptyState, ErrorBanner, LoadingBlock, ModeBanner } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { countryLine, FCFA_DISCLAIMER, formatSats, greetingName, walletBalanceLabel } from "../lib/format";
import { statusLabel, uiPaymentState } from "../lib/paymentStatus";
import type { AppStackParamList, TabParamList } from "../navigation/types";
import { listPayments } from "../services/payments";
import { fetchHealth, fetchWallet } from "../services/wallet";
import { colors, radius, shadow, spacing } from "../theme";

export function DashboardScreen() {
  const { user } = useAuth();
  const tabs = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextWallet, nextHealth, nextPayments] = await Promise.all([
        fetchWallet(),
        fetchHealth(),
        listPayments(),
      ]);
      setWallet(nextWallet);
      setHealth(nextHealth);
      setPayments(nextPayments.slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le portefeuille.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function openReceive() {
    const parent = tabs.getParent<NativeStackNavigationProp<AppStackParamList>>();
    parent?.navigate("Receive");
  }

  const provider = wallet?.provider ?? health?.payment_provider ?? "mock";
  const isLnd = provider === "lnd_regtest";
  const balance = isLnd ? (wallet?.channel_balance_sats ?? 0) : (wallet?.mock_balance_sats ?? 0);
  const balanceSource = walletBalanceLabel(provider);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
        }
      >
        <View style={styles.header}>
          <BrandMark />
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color={colors.navy} />
          </View>
        </View>
        <Text style={styles.hello}>Bonjour, {greetingName(user?.first_name ?? "", user?.email ?? "")}</Text>
        <Text style={styles.city}>{countryLine(user?.country ?? "SN")}</Text>
        <ModeBanner provider={provider} lightningConnected={wallet?.is_lightning_connected} />

        {loading ? <LoadingBlock label="Chargement du portefeuille…" /> : null}
        {error ? <ErrorBanner message={error} /> : null}

        {wallet ? (
          <LinearGradient colors={["#101828", "#1D2939"]} style={styles.wallet}>
            <View style={styles.walletTop}>
              <Text style={styles.walletKicker}>Portefeuille Lightning Bitcoin</Text>
              <Badge
                label={wallet.is_lightning_connected ? "Connecté" : isLnd ? "Hors ligne" : "Mock"}
                tone={wallet.is_lightning_connected ? "green" : "muted"}
              />
            </View>
            <Text style={styles.balance}>{formatSats(balance)} sats</Text>
            <Text style={styles.balanceSource}>{balanceSource}</Text>
            <Text style={styles.fcfa}>{FCFA_DISCLAIMER}</Text>
            <Pressable
              style={styles.copyRow}
              onPress={() =>
                void Share.share({
                  message: wallet.public_identifier || user?.email || "",
                })
              }
            >
              <Ionicons name="flash" size={14} color={colors.orange} />
              <Text style={styles.copyText} numberOfLines={1}>
                {wallet.alias || wallet.public_identifier || "identifiant local"}
              </Text>
            </Pressable>
            {(wallet.warnings ?? []).map((warning) => (
              <Text key={warning} style={styles.warn}>
                {warning}
              </Text>
            ))}
          </LinearGradient>
        ) : !loading ? (
          <EmptyState title="Portefeuille indisponible" subtitle="Réessayez ou vérifiez l'API Django." />
        ) : null}

        <View style={styles.actions}>
          <Pressable style={[styles.action, styles.actionOrange]} onPress={() => tabs.navigate("Scanner")}>
            <Ionicons name="qr-code" size={22} color={colors.white} />
            <Text style={styles.actionTitleLight}>Scanner</Text>
            <Text style={styles.actionSubLight}>Facture QR</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => tabs.navigate("Scanner")}>
            <Ionicons name="arrow-up" size={22} color={colors.navy} />
            <Text style={styles.actionTitle}>Envoyer</Text>
            <Text style={styles.actionSub}>Via facture</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={openReceive}>
            <Ionicons name="arrow-down" size={22} color={colors.navy} />
            <Text style={styles.actionTitle}>Recevoir</Text>
            <Text style={styles.actionSub}>Facture LN</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Corridors panafricains</Text>
          <Pressable onPress={() => tabs.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate("TransferDestination")}>
            <Text style={styles.link}>Simuler</Text>
          </Pressable>
        </View>
        <Text style={styles.corridor}>
          Sénégal SN · Côte d'Ivoire CI · Congo-Brazzaville CG. Le parcours M22–M26 parle à Django. Le paiement
          Lightning international n'est pas relancé depuis ces écrans.
        </Text>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Transactions récentes</Text>
          <Pressable onPress={() => tabs.navigate("Activity")}>
            <Text style={styles.link}>Voir tout</Text>
          </Pressable>
        </View>
        {payments.length === 0 && !loading ? (
          <EmptyState title="Aucune transaction" subtitle="Les paiements réels de ce compte apparaîtront ici." />
        ) : (
          payments.map((item) => {
            const state = uiPaymentState(item);
            const incoming = item.direction === "incoming";
            return (
              <View key={item.id} style={styles.tx}>
                <View style={[styles.txIcon, incoming ? styles.txIn : styles.txOut]}>
                  <Ionicons name={incoming ? "flash" : "arrow-up"} size={18} color={incoming ? colors.green : colors.navy} />
                </View>
                <View style={styles.txBody}>
                  <Text style={styles.txTitle} numberOfLines={1}>
                    {item.description || (incoming ? "Facture reçue" : "Paiement sortant")}
                  </Text>
                  <Text style={styles.txMeta}>{statusLabel(state)}</Text>
                </View>
                <Text style={[styles.txAmount, incoming && { color: colors.green }]}>
                  {incoming ? "+" : "-"}
                  {formatSats(item.amount_sats)} sats
                </Text>
              </View>
            );
          })
        )}

        <View style={styles.edu}>
          <Ionicons name="git-network-outline" size={22} color={colors.orange} />
          <View style={{ flex: 1 }}>
            <Text style={styles.eduTitle}>Paiements transfrontaliers en temps réel</Text>
            <Text style={styles.eduBody}>
              Le protocole Lightning vise des règlements rapides. Ici, seul le laboratoire Regtest ou Mock est actif.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray },
  content: { padding: spacing.md, paddingBottom: 120, gap: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  hello: { fontSize: 22, fontWeight: "800", color: colors.navy },
  city: { color: colors.muted, marginBottom: 4 },
  wallet: { borderRadius: radius.lg, padding: spacing.md, gap: 6 },
  walletTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  walletKicker: { color: "#D0D5DD", fontSize: 12 },
  balance: { color: colors.white, fontSize: 32, fontWeight: "800" },
  balanceSource: { color: colors.orange, fontSize: 12, fontWeight: "600" },
  fcfa: { color: "#98A2B3", fontSize: 11, lineHeight: 16 },
  copyRow: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 8 },
  copyText: { color: colors.white, flex: 1, fontSize: 12 },
  warn: { color: "#FEC84B", fontSize: 11 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  action: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 12,
    minHeight: 96,
    ...shadow.card,
  },
  actionOrange: { backgroundColor: colors.orange },
  actionTitle: { color: colors.navy, fontWeight: "700", marginTop: 8 },
  actionSub: { color: colors.muted, fontSize: 11 },
  actionTitleLight: { color: colors.white, fontWeight: "700", marginTop: 8 },
  actionSubLight: { color: colors.white, fontSize: 11, opacity: 0.9 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  sectionTitle: { color: colors.navy, fontWeight: "700", fontSize: 16 },
  corridor: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  link: { color: colors.orange, fontWeight: "700" },
  tx: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  txIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  txIn: { backgroundColor: colors.mint },
  txOut: { backgroundColor: colors.gray },
  txBody: { flex: 1 },
  txTitle: { color: colors.navy, fontWeight: "700" },
  txMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  txAmount: { color: colors.navy, fontWeight: "800", fontSize: 13 },
  edu: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "flex-start",
  },
  eduTitle: { color: colors.navy, fontWeight: "700", fontSize: 13 },
  eduBody: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
