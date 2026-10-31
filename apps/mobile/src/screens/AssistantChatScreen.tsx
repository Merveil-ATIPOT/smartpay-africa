import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AssistantMessage } from "@smartpay/contracts";

import { SmartPayLogo } from "../components/SmartPayLogo";
import { Badge, EmptyState, ErrorBanner } from "../components/ui";
import {
  ASSISTANT_CHAT_BADGE,
  ASSISTANT_CHAT_EMPTY_SUBTITLE,
  ASSISTANT_CHAT_EMPTY_TITLE,
  ASSISTANT_CHAT_FOOTER,
  ASSISTANT_CHAT_MODE,
  ASSISTANT_CHAT_PLACEHOLDER,
  ASSISTANT_CHAT_SECRET_BANNER,
  ASSISTANT_CHAT_TITLE,
  formatMessageTime,
  mergeExchange,
} from "../lib/assistantChat";
import { ASSISTANT_SUGGESTIONS } from "../lib/assistantHome";
import type { AppStackParamList } from "../navigation/types";
import { listMessages, sendAssistantMessage } from "../services/assistant";
import { userFacingRequestError } from "../services/errors";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AssistantChat">;

export function AssistantChatScreen({ navigation, route }: Props) {
  const conversationId = route.params.conversationId;
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState(route.params.draftQuestion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<AssistantMessage>>(null);
  const sendingLock = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMessages(await listMessages(conversationId));
    } catch (err) {
      setError(userFacingRequestError(err, "Historique indisponible."));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  async function send(text?: string) {
    const content = (text ?? draft).trim();
    if (!content || sendingLock.current) {
      return;
    }
    sendingLock.current = true;
    setSending(true);
    setError(null);
    try {
      const exchange = await sendAssistantMessage({ conversationId, content });
      setMessages((current) => mergeExchange(current, exchange.user_message, exchange.assistant_message));
      setDraft("");
    } catch (err) {
      setError(userFacingRequestError(err, "Envoi impossible."));
    } finally {
      sendingLock.current = false;
      setSending(false);
    }
  }

  function renderItem({ item }: { item: AssistantMessage }) {
    const mine = item.role === "user";
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        {!mine ? (
          <View style={styles.avatar}>
            <Ionicons name="flash" size={14} color={colors.white} />
          </View>
        ) : null}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
            {item.content}
          </Text>
          <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Retour" style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.navy} />
        </Pressable>
        <SmartPayLogo size={28} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {ASSISTANT_CHAT_TITLE}
          </Text>
          <View style={styles.headerBadges}>
            <Badge label={ASSISTANT_CHAT_BADGE} tone="orange" />
            <Badge label={ASSISTANT_CHAT_MODE} tone="muted" />
          </View>
        </View>
      </View>

      <View style={styles.secretBanner}>
        <Ionicons name="shield-checkmark" size={16} color={colors.orange} />
        <Text style={styles.secretText}>{ASSISTANT_CHAT_SECRET_BANNER}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={8}
      >
        {error ? (
          <View style={styles.errorWrap}>
            <ErrorBanner message={error} />
          </View>
        ) : null}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.orange} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <EmptyState title={ASSISTANT_CHAT_EMPTY_TITLE} subtitle={ASSISTANT_CHAT_EMPTY_SUBTITLE} />
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={styles.composerDock}>
          <View style={styles.chips}>
            {ASSISTANT_SUGGESTIONS.map((item) => (
              <Pressable
                key={item.id}
                style={styles.chip}
                onPress={() => setDraft(item.label)}
                accessibilityRole="button"
              >
                <Text style={styles.chipText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={ASSISTANT_CHAT_PLACEHOLDER}
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              editable={!sending}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={() => void send()}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Envoyer"
              onPress={() => void send()}
              disabled={sending || !draft.trim()}
              style={[styles.send, (sending || !draft.trim()) && styles.sendOff]}
            >
              {sending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Ionicons name="send" size={16} color={colors.white} />
              )}
            </Pressable>
          </View>
          <Text style={styles.footer}>{ASSISTANT_CHAT_FOOTER}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  flex: { flex: 1 },
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
  headerBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  secretBanner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: colors.stitchBlueLow,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  secretText: { flex: 1, color: colors.stitchOnVariant, fontSize: 11, lineHeight: 16 },
  errorWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.md, paddingBottom: 16, gap: 10, flexGrow: 1 },
  bubbleRow: { flexDirection: "row", maxWidth: "92%", gap: 8 },
  bubbleRowMine: { alignSelf: "flex-end" },
  bubbleRowTheirs: { alignSelf: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.stitchOrange,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  bubble: { borderRadius: 16, padding: 12, maxWidth: "100%", ...shadow.card },
  bubbleMine: { backgroundColor: colors.stitchNavy, borderTopRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.white, borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: colors.white },
  bubbleTextTheirs: { color: colors.navy },
  time: { fontSize: 10, marginTop: 6 },
  timeMine: { color: "rgba(255,255,255,0.65)", textAlign: "right" },
  timeTheirs: { color: colors.muted },
  composerDock: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.stitchBlueLow,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: colors.navy, fontSize: 11, fontWeight: "600" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: colors.gray,
    borderRadius: radius.pill,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: { flex: 1, minHeight: 40, maxHeight: 120, color: colors.navy, fontSize: 14, paddingTop: 8 },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.stitchOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { opacity: 0.45 },
  footer: { color: colors.muted, textAlign: "center", fontSize: 10 },
});
