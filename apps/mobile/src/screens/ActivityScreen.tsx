import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Payment } from "@smartpay/contracts";

import { EmptyState, ErrorBanner, LoadingBlock } from "../components/ui";
import { formatSats } from "../lib/format";
import { statusLabel, uiPaymentState } from "../lib/paymentStatus";
import { listPayments } from "../services/payments";
import { colors, radius, spacing } from "../theme";

export function ActivityScreen() {
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
        }
      >
        <Text style={styles.title}>Activité</Text>
        <Text style={styles.sub}>Historique réel GET /payments/. Aucune transaction Stitch fictive.</Text>
        {loading ? <LoadingBlock /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {!loading && items.length === 0 ? (
          <EmptyState title="Aucune activité" subtitle="Les paiements de ce compte s'afficheront ici." />
        ) : null}
        {items.map((item) => {
          const state = uiPaymentState(item);
          const incoming = item.direction === "incoming";
          return (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.description || (incoming ? "Entrant" : "Sortant")}</Text>
                <Text style={styles.meta}>
                  {statusLabel(state)} · {item.settlement_mode === "mock" ? "MOCK" : "REGTEST"}
                </Text>
              </View>
              <Text style={[styles.amount, incoming && { color: colors.green }]}>
                {incoming ? "+" : "-"}
                {formatSats(item.amount_sats)}
              </Text>
            </View>
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
