import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Payment } from "@smartpay/contracts";

import { EmptyState, ErrorBanner, LoadingBlock } from "../components/ui";
import {
  ACTIVITY_ADMIN_NOTE,
  ACTIVITY_EXPLAIN_HINT,
  ActivityExplainLock,
  activityExplainParams,
  canOpenActivityExplanation,
} from "../lib/activityExplain";
import { formatSats } from "../lib/format";
import { displayPaymentStatus } from "../lib/paymentStatus";
import { useAuth } from "../hooks/useAuth";
import type { AppStackParamList, TabParamList } from "../navigation/types";
import { listPayments } from "../services/payments";
import { colors, radius, spacing } from "../theme";

export function ActivityScreen() {
  const { user } = useAuth();
  const tabs = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const personal = canOpenActivityExplanation(user?.role);
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lock = useRef(new ActivityExplainLock());
  const skipNextFocusLoad = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await listPayments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Historique indisponible.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusLoad.current) {
        skipNextFocusLoad.current = false;
        return;
      }
      void load();
    }, [load]),
  );

  function openExplain(item: Payment) {
    if (!personal) {
      return;
    }
    const params = activityExplainParams(item);
    if (!params || !lock.current.tryAcquire()) {
      return;
    }
    skipNextFocusLoad.current = true;
    const parent = tabs.getParent<NativeStackNavigationProp<AppStackParamList>>();
    parent?.navigate("AssistantExplain", params);
    setTimeout(() => lock.current.release(), 800);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
        }
      >
        <Text style={styles.title}>Activité</Text>
        <Text style={styles.sub}>Historique des opérations de ce compte</Text>
        {!personal ? <Text style={styles.adminNote}>{ACTIVITY_ADMIN_NOTE}</Text> : null}
        {loading ? <LoadingBlock /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {!loading && items.length === 0 ? (
          <EmptyState title="Aucune activité" subtitle="Les paiements de ce compte s'afficheront ici." />
        ) : null}
        {items.map((item) => {
          const incoming = item.direction === "incoming";
          const params = personal ? activityExplainParams(item) : null;
          return (
            <Pressable
              key={item.id}
              style={styles.row}
              disabled={!params}
              onPress={() => openExplain(item)}
              accessibilityRole={params ? "button" : undefined}
              accessibilityLabel={params ? `${ACTIVITY_EXPLAIN_HINT} ${item.description || item.id}` : undefined}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.description || (incoming ? "Entrant" : "Sortant")}</Text>
                <Text style={styles.meta}>
                  {displayPaymentStatus(item)} · {item.settlement_mode === "mock" ? "MOCK" : "REGTEST"}
                </Text>
              </View>
              <Text style={[styles.amount, incoming && { color: colors.green }]}>
                {incoming ? "+" : "-"}
                {formatSats(item.amount_sats)} sats
              </Text>
              {params ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray },
  content: { padding: spacing.md, paddingBottom: 120, gap: spacing.sm },
  title: { fontSize: 28, fontWeight: "800", color: colors.navy },
  sub: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  adminNote: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  row: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  name: { color: colors.navy, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  amount: { color: colors.navy, fontWeight: "800" },
});
