import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { SmartPayLogo } from "../components/SmartPayLogo";
import { Badge, EmptyState, ErrorBanner, GhostButton, LoadingBlock, PrimaryButton } from "../components/ui";
import {
  EXPLAIN_ASK_LABEL,
  EXPLAIN_BACK_LABEL,
  EXPLAIN_FORBIDDEN_SUBTITLE,
  EXPLAIN_FORBIDDEN_TITLE,
  EXPLAIN_GENERIC_QUESTION,
  EXPLAIN_INCOMPLETE_NOTE,
  EXPLAIN_LOADING_LABEL,
  EXPLAIN_READONLY_PILL,
  EXPLAIN_RETRY_LABEL,
  EXPLAIN_SCREEN_TITLE,
  buildExplainView,
  classifyExplainError,
  explainErrorMessage,
  type ExplainLoadKind,
} from "../lib/assistantExplain";
import { EXPLAIN_NETWORK_BADGE } from "../lib/transactionExplain";
import type { AppStackParamList } from "../navigation/types";
import { createConversation } from "../services/assistant";
import { userFacingRequestError } from "../services/errors";
import { fetchPayment } from "../services/payments";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AssistantExplain">;

export function AssistantExplainScreen({ navigation, route }: Props) {
  const paymentId = route.params.paymentId.trim();
  const [kind, setKind] = useState<ExplainLoadKind | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ReturnType<typeof buildExplainView> | null>(null);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    if (!paymentId) {
      setView(null);
      setKind("forbidden");
      setError(EXPLAIN_FORBIDDEN_SUBTITLE);
      return;
    }
    setKind("loading");
    setError(null);
    try {
      const payment = await fetchPayment(paymentId);
      setView(buildExplainView(payment));
      setKind("ready");
    } catch (err) {
      setView(null);
      const next = classifyExplainError(err);
      setKind(next);
      setError(explainErrorMessage(err));
    }
  }, [paymentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function openGenericQuestion() {
    if (opening) {
      return;
    }
    setOpening(true);
    try {
      const conversation = await createConversation();
      navigation.navigate("AssistantChat", {
        conversationId: conversation.id,
        draftQuestion: EXPLAIN_GENERIC_QUESTION,
      });
    } catch (err) {
      setError(userFacingRequestError(err, "Impossible d'ouvrir l'assistant."));
    } finally {
      setOpening(false);
    }
  }

  const ready = view?.kind === "ready" ? view : null;
  const explanation = ready?.explanation;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={EXPLAIN_BACK_LABEL}
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <SmartPayLogo size={28} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {EXPLAIN_SCREEN_TITLE}
          </Text>
          <Badge label={EXPLAIN_NETWORK_BADGE} tone="orange" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pill}>
          <View style={styles.pillDot} />
          <Text style={styles.pillText}>{EXPLAIN_READONLY_PILL}</Text>
        </View>

        {kind === "loading" ? <LoadingBlock label={EXPLAIN_LOADING_LABEL} /> : null}

        {kind === "forbidden" ? (
          <EmptyState title={EXPLAIN_FORBIDDEN_TITLE} subtitle={EXPLAIN_FORBIDDEN_SUBTITLE} />
        ) : null}

        {kind === "network" || kind === "error" ? (
          <>
            {error ? <ErrorBanner message={error} /> : null}
            <GhostButton label={EXPLAIN_RETRY_LABEL} onPress={() => void load()} />
          </>
        ) : null}

        {kind === "ready" && view?.kind === "incomplete" ? (
          <EmptyState
            title="Données incomplètes"
            subtitle="Le serveur n'a pas renvoyé assez d'informations pour expliquer cette opération."
          />
        ) : null}

        {explanation ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroKicker}>Transaction analysée</Text>
              <Text style={styles.heroTitle}>{explanation.title}</Text>
              <Text style={styles.heroAmount}>{explanation.amount_label}</Text>
              <View style={styles.heroMeta}>
                <Badge
                  label={explanation.status_label}
                  tone={explanation.settlement_mode_label === "Mock" ? "muted" : "green"}
                />
                <Badge label={explanation.settlement_mode_label} tone="orange" />
              </View>
              <Text style={styles.heroWhen}>{explanation.when}</Text>
              <Text style={styles.heroCaption}>{explanation.settlement_caption}</Text>
              {explanation.reference_short ? (
                <Text style={styles.heroRef}>Réf. {explanation.reference_short}</Text>
              ) : null}
            </View>

            {ready?.incomplete ? <Text style={styles.note}>{EXPLAIN_INCOMPLETE_NOTE}</Text> : null}

            {explanation.sections.map((section) => (
              <View
                key={section.id}
                style={[styles.card, section.id === "limits" && styles.limitsCard]}
              >
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.cardBody}>{section.body}</Text>
              </View>
            ))}

            {explanation.can_ask_question ? (
              <PrimaryButton
                icon="chatbubble-ellipses"
                label={opening ? "Ouverture…" : EXPLAIN_ASK_LABEL}
                onPress={() => void openGenericQuestion()}
                disabled={opening}
                loading={opening}
              />
            ) : null}
          </>
        ) : null}

        <GhostButton label={EXPLAIN_BACK_LABEL} onPress={() => navigation.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray,
  },
  headerText: { flex: 1, minWidth: 0, gap: 4 },
  headerTitle: { color: colors.navy, fontWeight: "700", fontSize: 15 },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.md },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.stitchBlueHigh,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.stitchGreen },
  pillText: { color: colors.stitchOnVariant, fontSize: 11, fontWeight: "700" },
  hero: {
    backgroundColor: colors.stitchNavy,
    borderRadius: 20,
    padding: spacing.md,
    gap: 8,
    ...shadow.card,
  },
  heroKicker: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  heroAmount: { color: colors.stitchOrange, fontSize: 28, fontWeight: "800" },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroWhen: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  heroCaption: { color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 18 },
  heroRef: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontVariant: ["tabular-nums"] },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    ...shadow.card,
  },
  limitsCard: { backgroundColor: colors.stitchPeach },
  cardTitle: { color: colors.navy, fontWeight: "700", fontSize: 16 },
  cardBody: { color: colors.stitchOnVariant, fontSize: 14, lineHeight: 20 },
});
