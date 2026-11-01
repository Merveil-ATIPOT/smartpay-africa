import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AssistantConversation, Payment } from "@smartpay/contracts";

import { SmartPayLogo } from "../components/SmartPayLogo";
import { Badge, EmptyState, ErrorBanner, GhostButton, LoadingBlock, PrimaryButton } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import {
  ACADEMY_CARD_CTA,
  ACADEMY_CARD_DESCRIPTION,
  ACADEMY_CARD_TITLE,
} from "../lib/academy";
import {
  ASSISTANT_BANNER_BADGE,
  ASSISTANT_BANNER_TEXT,
  ASSISTANT_FOOTER_NOTE,
  ASSISTANT_HISTORY_EMPTY,
  ASSISTANT_HISTORY_ERROR,
  ASSISTANT_HISTORY_RETRY,
  ASSISTANT_HISTORY_TITLE,
  assistantAccountLine,
  ASSISTANT_GENIUS_DESCRIPTION,
  ASSISTANT_GENIUS_NAME,
  ASSISTANT_GENIUS_STATUS,
  ASSISTANT_HOME_TITLE,
  ASSISTANT_LAST_OP_ADMIN_SUBTITLE,
  ASSISTANT_LAST_OP_ADMIN_TITLE,
  ASSISTANT_LAST_OP_EMPTY_SUBTITLE,
  ASSISTANT_LAST_OP_EMPTY_TITLE,
  ASSISTANT_LAST_OP_TITLE,
  ASSISTANT_QUESTION_PREVIEW,
  ASSISTANT_QUESTION_PREVIEW_HINT,
  ASSISTANT_REGTEST_BADGE,
  ASSISTANT_START_HINT,
  ASSISTANT_START_LABEL,
  ASSISTANT_SUGGESTIONS,
  ASSISTANT_SUGGESTIONS_TITLE,
  ASSISTANT_TOPICS,
  ASSISTANT_TOPICS_TITLE,
  assistantGreeting,
  canShowPersonalLastOperation,
  lastOperationTeaser,
  pickLatestPayment,
  type AssistantTopic,
} from "../lib/assistantHome";
import type { AppStackParamList } from "../navigation/types";
import { userFacingRequestError } from "../services/errors";
import { conversationPreview, pickResumeConversation, sortConversationsForDisplay } from "../lib/assistantChat";
import { createConversation, listConversations } from "../services/assistant";
import { listPayments } from "../services/payments";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AssistantHome">;

const TOPIC_ICONS: Record<AssistantTopic["icon"], keyof typeof Ionicons.glyphMap> = {
  flash: "flash",
  receipt: "receipt-outline",
  card: "card-outline",
  globe: "globe-outline",
};

export function AssistantHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [latest, setLatest] = useState<Payment | null>(null);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState(false);
  const personal = canShowPersonalLastOperation(user?.role);

  const loadPayments = useCallback(async () => {
    if (!canShowPersonalLastOperation(user?.role)) {
      setLatest(null);
      return;
    }
    try {
      setLatest(pickLatestPayment(await listPayments()));
    } catch (err) {
      setLatest(null);
      setError(userFacingRequestError(err, "Historique des paiements indisponible."));
    }
  }, [user?.role]);

  const loadConversations = useCallback(async () => {
    setHistoryError(null);
    try {
      setConversations(sortConversationsForDisplay(await listConversations()));
    } catch (err) {
      setHistoryError(userFacingRequestError(err, ASSISTANT_HISTORY_ERROR));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    await Promise.all([loadPayments(), loadConversations()]);
    setLoading(false);
    setRefreshing(false);
  }, [loadConversations, loadPayments]);

  async function openChat(draftQuestion?: string, mode: "new" | "resume" = "resume") {
    if (opening) {
      return;
    }
    setOpening(true);
    setHistoryError(null);
    try {
      const existing = mode === "resume" ? pickResumeConversation(conversations) : null;
      const conversation = existing ?? (await createConversation());
      navigation.navigate("AssistantChat", {
        conversationId: conversation.id,
        draftQuestion,
      });
    } catch (err) {
      setHistoryError(userFacingRequestError(err, "Impossible d'ouvrir la conversation."));
    } finally {
      setOpening(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const teaser = latest ? lastOperationTeaser(latest) : null;
  const accountLine = assistantAccountLine({ email: user?.email, firstName: user?.first_name });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Retour" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <SmartPayLogo size={28} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {ASSISTANT_HOME_TITLE}
          </Text>
          <Badge label={ASSISTANT_REGTEST_BADGE} tone="orange" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <View style={styles.banner}>
          <Ionicons name="information-circle" size={20} color={colors.orange} />
          <View style={{ flex: 1, gap: 4 }}>
            <Badge label={ASSISTANT_BANNER_BADGE} tone="orange" />
            <Text style={styles.bannerText}>{ASSISTANT_BANNER_TEXT}</Text>
          </View>
        </View>

        <View style={styles.academyCard}>
          <View style={styles.academyIcon}>
            <Ionicons name="school" size={20} color={colors.orange} />
          </View>
          <Text style={styles.academyTitle}>{ACADEMY_CARD_TITLE}</Text>
          <Text style={styles.academyCopy}>{ACADEMY_CARD_DESCRIPTION}</Text>
          <PrimaryButton
            label={ACADEMY_CARD_CTA}
            onPress={() => navigation.navigate("AcademyHome")}
            icon="arrow-forward"
          />
        </View>

        <Text style={styles.sectionTitle}>{ASSISTANT_HISTORY_TITLE}</Text>
        {accountLine ? <Text style={styles.historyAccount}>{accountLine}</Text> : null}
        {historyLoading ? <LoadingBlock label="Chargement de vos conversations…" /> : null}
        {historyError ? <ErrorBanner message={historyError} /> : null}
        {historyError ? (
          <GhostButton
            label={ASSISTANT_HISTORY_RETRY}
            onPress={() => {
              setHistoryLoading(true);
              void loadConversations();
            }}
          />
        ) : null}
        {!historyLoading && !historyError && conversations.length === 0 ? (
          <EmptyState title={ASSISTANT_HISTORY_EMPTY} subtitle="Créez une nouvelle conversation pour commencer." />
        ) : null}
        {conversations.map((item) => (
          <Pressable
            key={item.id}
            style={styles.historyRow}
            onPress={() => navigation.navigate("AssistantChat", { conversationId: item.id })}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>{conversationPreview(item)}</Text>
              <Text style={styles.historyMeta}>
                {(item.message_count ?? 0) > 0
                  ? `${item.message_count} message${(item.message_count ?? 0) > 1 ? "s" : ""} · ${item.updated_at.slice(0, 10)}`
                  : `Aucun message · ${item.updated_at.slice(0, 10)}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
        <PrimaryButton
          label={ASSISTANT_START_LABEL}
          onPress={() => void openChat(undefined, "new")}
          loading={opening}
          icon="add-circle"
        />

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIdentity}>
              <View style={styles.geniusIcon}>
                <Ionicons name="sparkles" size={18} color={colors.stitchOrange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.geniusName}>{ASSISTANT_GENIUS_NAME}</Text>
                <Text style={styles.geniusStatus}>{ASSISTANT_GENIUS_STATUS}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.hello}>{assistantGreeting(user?.first_name)}</Text>
          <Text style={styles.heroCopy}>{ASSISTANT_GENIUS_DESCRIPTION}</Text>
          <Pressable
            style={styles.preview}
            onPress={() => void openChat(undefined, "resume")}
            accessibilityRole="button"
            accessibilityLabel={ASSISTANT_QUESTION_PREVIEW_HINT}
          >
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.previewText}>{ASSISTANT_QUESTION_PREVIEW}</Text>
          </Pressable>
          <Text style={styles.previewHint}>{ASSISTANT_QUESTION_PREVIEW_HINT}</Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{ASSISTANT_TOPICS_TITLE}</Text>
          <Text style={styles.sectionMeta}>4 catégories</Text>
        </View>
        <View style={styles.topicGrid}>
          {ASSISTANT_TOPICS.map((topic) => (
            <Pressable
              key={topic.id}
              style={styles.topic}
              onPress={() => void openChat(topic.question, "resume")}
              accessibilityRole="button"
            >
              <View style={styles.topicIcon}>
                <Ionicons name={TOPIC_ICONS[topic.icon]} size={18} color={colors.orange} />
              </View>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicSub}>{topic.subtitle}</Text>
              <View style={styles.topicQuestion}>
                <Text style={styles.topicQuestionText}>« {topic.question} »</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Ionicons name="bulb-outline" size={16} color={colors.orange} />
          <Text style={styles.sectionKicker}>{ASSISTANT_SUGGESTIONS_TITLE}</Text>
        </View>
        <View style={styles.chips}>
          {ASSISTANT_SUGGESTIONS.map((item) => (
            <Pressable
              key={item.id}
              style={styles.chip}
              onPress={() => void openChat(item.label, "resume")}
              accessibilityRole="button"
            >
              <Text style={styles.chipText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{ASSISTANT_LAST_OP_TITLE}</Text>
        {error ? <ErrorBanner message={error} /> : null}
        {loading ? <LoadingBlock label="Chargement de l'historique…" /> : null}
        {!loading && !personal ? (
          <EmptyState title={ASSISTANT_LAST_OP_ADMIN_TITLE} subtitle={ASSISTANT_LAST_OP_ADMIN_SUBTITLE} />
        ) : null}
        {!loading && personal && !teaser && !error ? (
          <EmptyState title={ASSISTANT_LAST_OP_EMPTY_TITLE} subtitle={ASSISTANT_LAST_OP_EMPTY_SUBTITLE} />
        ) : null}
        {!loading && personal && teaser ? (
          <View style={styles.lastOp}>
            <View style={styles.lastOpTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lastOpKicker}>Dernière opération de ce compte</Text>
                <Text style={styles.lastOpTitle}>{teaser.title}</Text>
                <Text style={styles.lastOpMeta}>
                  {teaser.statusLine} · {teaser.when}
                </Text>
              </View>
              <Text style={styles.lastOpAmount}>{teaser.amountLabel}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.ctaHint}>{ASSISTANT_START_HINT}</Text>
        <Text style={styles.footer}>{ASSISTANT_FOOTER_NOTE}</Text>
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
  banner: {
    backgroundColor: colors.stitchPeach,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bannerText: { color: colors.navy, fontSize: 13, lineHeight: 18 },
  academyCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.stitchPeach,
    ...shadow.card,
  },
  academyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.amberBg,
    alignItems: "center",
    justifyContent: "center",
  },
  academyTitle: { color: colors.navy, fontWeight: "800", fontSize: 18 },
  academyCopy: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  hero: {
    backgroundColor: colors.stitchNavy,
    borderRadius: 20,
    padding: spacing.md,
    gap: 10,
    ...shadow.card,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  heroIdentity: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  geniusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  geniusName: { color: colors.white, fontWeight: "700", fontSize: 16 },
  geniusStatus: { color: colors.stitchGreenGlow, fontSize: 11, fontWeight: "600", marginTop: 2 },
  hello: { color: colors.white, fontSize: 20, fontWeight: "700", lineHeight: 26 },
  heroCopy: { color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 20 },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewText: { flex: 1, color: "rgba(255,255,255,0.7)", fontSize: 14 },
  micGhost: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.stitchOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  previewHint: { color: "rgba(255,255,255,0.55)", fontSize: 11, lineHeight: 15 },
  historyRow: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow.card,
  },
  historyTitle: { color: colors.navy, fontWeight: "700", fontSize: 14 },
  historyMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  historyAccount: { color: colors.muted, fontSize: 12, marginTop: -8 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { color: colors.navy, fontWeight: "700", fontSize: 16, flex: 1 },
  sectionMeta: { color: colors.orange, fontSize: 12, fontWeight: "600" },
  sectionKicker: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  topicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topic: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    minHeight: 148,
    ...shadow.card,
  },
  topicIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.amberBg,
    alignItems: "center",
    justifyContent: "center",
  },
  topicTitle: { color: colors.navy, fontWeight: "700", fontSize: 13, lineHeight: 18 },
  topicSub: { color: colors.muted, fontSize: 11 },
  topicQuestion: { backgroundColor: colors.stitchBlueLow, borderRadius: 8, padding: 8, marginTop: "auto" },
  topicQuestionText: { color: colors.navy, fontSize: 11, lineHeight: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...shadow.card,
  },
  chipText: { color: colors.navy, fontSize: 12, fontWeight: "600" },
  lastOp: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  lastOpTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  lastOpKicker: { color: colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  lastOpTitle: { color: colors.navy, fontWeight: "700", fontSize: 15, marginTop: 4 },
  lastOpMeta: { color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 },
  lastOpAmount: { color: colors.navy, fontWeight: "800", fontSize: 13 },
  ctaHint: { color: colors.muted, textAlign: "center", fontSize: 13, fontWeight: "600" },
  footer: { color: colors.muted, textAlign: "center", fontSize: 11, lineHeight: 16 },
});
