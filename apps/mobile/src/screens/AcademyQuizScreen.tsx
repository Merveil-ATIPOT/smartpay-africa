import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AcademyHeader } from "../components/AcademyChrome";
import { EmptyState, ErrorBanner, GhostButton, LoadingBlock, PrimaryButton } from "../components/ui";
import {
  ACADEMY_HOME_TITLE,
  ACADEMY_QUIZ_EMPTY,
  ACADEMY_RETRY,
  ACADEMY_SUBMIT_QUIZ,
  AcademySubmitLock,
  academyErrorMessage,
  canSubmitQuiz,
  classifyAcademyError,
  quizProgressLabel,
  type AcademyQuiz,
  type AcademyQuizSelection,
} from "../lib/academy";
import type { AppStackParamList } from "../navigation/types";
import { fetchAcademyQuiz, submitAcademyQuizAttempt } from "../services/academy";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AcademyQuiz">;

export function AcademyQuizScreen({ navigation, route }: Props) {
  const { courseSlug, moduleSlug } = route.params;
  const [quiz, setQuiz] = useState<AcademyQuiz | null>(null);
  const [selected, setSelected] = useState<AcademyQuizSelection>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(new AcademySubmitLock());

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const next = await fetchAcademyQuiz(courseSlug, moduleSlug);
      setQuiz(next);
      setSelected({});
    } catch (err) {
      setQuiz(null);
      setError(academyErrorMessage(err, ACADEMY_QUIZ_EMPTY));
    } finally {
      setLoading(false);
    }
  }, [courseSlug, moduleSlug]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function submit() {
    if (!quiz || !canSubmitQuiz(quiz.questions, selected, submitting)) {
      return;
    }
    const key = lock.current.begin();
    if (!key) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const attempt = await submitAcademyQuizAttempt({
        courseSlug,
        moduleSlug,
        quizId: quiz.id,
        selected,
        idempotencyKey: key,
      });
      lock.current.succeed();
      navigation.navigate("AcademyQuizResult", {
        courseSlug,
        moduleSlug,
        quizId: quiz.id,
        attempt,
      });
    } catch (err) {
      lock.current.fail();
      setError(academyErrorMessage(err, "Impossible d'envoyer vos réponses."));
      if (classifyAcademyError(err) === "conflict") {
        lock.current.succeed();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const answered = quiz ? Object.keys(selected).length : 0;
  const total = quiz?.questions.length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AcademyHeader title="Quiz" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingBlock label="Chargement du quiz…" /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {error && !quiz ? <GhostButton label={ACADEMY_RETRY} onPress={() => void load()} /> : null}
        {quiz && quiz.questions.length === 0 ? <EmptyState title={ACADEMY_QUIZ_EMPTY} subtitle={ACADEMY_HOME_TITLE} /> : null}
        {quiz && quiz.questions.length > 0 ? (
          <>
            <Text style={styles.progress}>{quizProgressLabel(Math.min(answered + 1, total), total)}</Text>
            <Text style={styles.meta}>{answered}/{total} questions répondues · seuil {quiz.pass_score} %</Text>
            {quiz.questions.map((question) => (
              <View key={question.id} style={styles.card}>
                <Text style={styles.prompt}>{question.prompt}</Text>
                {question.options.map((option) => {
                  const on = selected[question.id] === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.option, on && styles.optionOn]}
                      onPress={() => setSelected((current) => ({ ...current, [question.id]: option.id }))}
                      accessibilityRole="button"
                    >
                      <View style={[styles.radio, on && styles.radioOn]} />
                      <Text style={[styles.optionText, on && styles.optionTextOn]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <PrimaryButton
              label={ACADEMY_SUBMIT_QUIZ}
              onPress={() => void submit()}
              loading={submitting}
              disabled={!canSubmitQuiz(quiz.questions, selected, submitting)}
              icon="send"
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.md },
  progress: { color: colors.navy, fontWeight: "800", fontSize: 18 },
  meta: { color: colors.muted, fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
    ...shadow.card,
  },
  prompt: { color: colors.navy, fontWeight: "700", fontSize: 15, lineHeight: 21 },
  option: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionOn: { borderColor: colors.orange, backgroundColor: colors.amberBg },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.muted,
  },
  radioOn: { borderColor: colors.orange, backgroundColor: colors.orange },
  optionText: { color: colors.navy, flex: 1, fontSize: 14 },
  optionTextOn: { fontWeight: "700" },
});
