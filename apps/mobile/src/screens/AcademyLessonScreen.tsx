import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, type TextStyle, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AcademyHeader } from "../components/AcademyChrome";
import { Badge, Card, ErrorBanner, GhostButton, LoadingBlock, PrimaryButton } from "../components/ui";
import {
  ACADEMY_COMPLETE_LESSON,
  ACADEMY_HOME_TITLE,
  ACADEMY_LESSON_DONE,
  ACADEMY_RETRY,
  ACADEMY_START_LESSON,
  academyErrorMessage,
  academyLessonAction,
  academyLessonStatusFromApi,
  courseProgressOf,
  exerciseTypeLabel,
  lessonDifficultyLabel,
  lessonDurationLabel,
  lessonStatusLabel,
  lessonStatusOf,
  moduleProgressOf,
  parseAcademyInline,
  parseAcademyMarkdown,
  publicExerciseContent,
  type AcademyLessonDetail,
  type AcademyLessonStatus,
  type AcademyMdBlock,
} from "../lib/academy";
import type { AppStackParamList } from "../navigation/types";
import { completeAcademyLesson, fetchAcademyLesson, fetchAcademyProgress, startAcademyLesson } from "../services/academy";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AcademyLesson">;

function MarkdownBody({ source }: { source: string }) {
  const blocks = parseAcademyMarkdown(source);
  if (blocks.length === 0) {
    return <Text style={styles.muted}>Aucun contenu pour cette leçon.</Text>;
  }
  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={`${block.type}-${index}`} block={block} />
      ))}
    </View>
  );
}

function MarkdownInline({
  text,
  style,
}: {
  text: string;
  style: TextStyle | Array<TextStyle | undefined>;
}) {
  return (
    <Text style={style}>
      {parseAcademyInline(text).map((part, index) => (
        <Text key={`${part.text}-${index}`} style={part.bold ? styles.mdBold : undefined}>
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function MarkdownBlock({ block }: { block: AcademyMdBlock }) {
  if (block.type === "heading") {
    return (
      <MarkdownInline text={block.text} style={[styles.mdHeading, block.level === 1 ? styles.mdH1 : undefined]} />
    );
  }
  if (block.type === "list") {
    return (
      <View style={{ gap: 4 }}>
        {block.items.map((item) => (
          <MarkdownInline key={item} text={`• ${item}`} style={styles.body} />
        ))}
      </View>
    );
  }
  if (block.type === "code") {
    return <Text style={styles.code}>{block.text}</Text>;
  }
  return <MarkdownInline text={block.text} style={styles.body} />;
}

export function AcademyLessonScreen({ navigation, route }: Props) {
  const { courseSlug, moduleSlug, lessonSlug } = route.params;
  const [lesson, setLesson] = useState<AcademyLessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonStatus, setLessonStatus] = useState<AcademyLessonStatus>(null);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const startLock = useRef(false);
  const completeLock = useRef(false);

  const applyStatus = useCallback((status: AcademyLessonStatus) => {
    setLessonStatus(status);
    startLock.current = status !== null;
    completeLock.current = status === "completed";
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [nextLesson, nextProgress] = await Promise.all([
        fetchAcademyLesson(courseSlug, moduleSlug, lessonSlug),
        fetchAcademyProgress(),
      ]);
      setLesson(nextLesson);
      applyStatus(lessonStatusOf(moduleProgressOf(courseProgressOf(nextProgress, courseSlug), moduleSlug), lessonSlug));
    } catch (err) {
      setLesson(null);
      setError(academyErrorMessage(err, "Impossible de charger cette leçon."));
    } finally {
      setLoading(false);
    }
  }, [applyStatus, courseSlug, lessonSlug, moduleSlug]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const action = academyLessonAction(lessonStatus);

  async function startLesson() {
    if (startLock.current || starting || action !== "start") {
      return;
    }
    startLock.current = true;
    setStarting(true);
    setError(null);
    try {
      const row = await startAcademyLesson(courseSlug, moduleSlug, lessonSlug);
      applyStatus(academyLessonStatusFromApi(row));
    } catch (err) {
      setError(academyErrorMessage(err, "Impossible de commencer la leçon."));
      startLock.current = false;
    } finally {
      setStarting(false);
    }
  }

  async function completeLesson() {
    if (completeLock.current || completing || action !== "complete") {
      return;
    }
    completeLock.current = true;
    setCompleting(true);
    setError(null);
    try {
      const row = await completeAcademyLesson(courseSlug, moduleSlug, lessonSlug);
      applyStatus(academyLessonStatusFromApi(row));
    } catch (err) {
      setError(academyErrorMessage(err, "Impossible de terminer la leçon."));
      completeLock.current = false;
    } finally {
      setCompleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AcademyHeader title={lesson?.title ?? ACADEMY_HOME_TITLE} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingBlock label="Chargement de la leçon…" /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {error && !lesson ? <GhostButton label={ACADEMY_RETRY} onPress={() => void load()} /> : null}
        {lesson ? (
          <>
            <Text style={styles.title}>{lesson.title}</Text>
            <View style={styles.metaRow}>
              <Badge label={lessonDifficultyLabel(lesson.difficulty)} tone="orange" />
              <Badge label={lessonDurationLabel(lesson.duration_minutes)} tone="navy" />
            </View>
            <MarkdownBody source={lesson.body_md} />
            {lesson.exercises.length > 0 ? <Text style={styles.sectionTitle}>Exercices</Text> : null}
            {lesson.exercises.map((exercise) => {
              const content = publicExerciseContent(exercise.content);
              const hint = typeof content.hint === "string" ? content.hint : "";
              return (
                <Card key={exercise.id}>
                  <Badge label={exerciseTypeLabel(exercise.type)} tone="orange" />
                  <Text style={styles.exercisePrompt}>{exercise.prompt}</Text>
                  {hint ? <Text style={styles.muted}>{hint}</Text> : null}
                </Card>
              );
            })}
            {action !== "start" ? (
              <Badge
                label={action === "done" ? ACADEMY_LESSON_DONE : lessonStatusLabel(lessonStatus)}
                tone={action === "done" ? "green" : "orange"}
              />
            ) : null}
            {action === "start" ? (
              <PrimaryButton label={ACADEMY_START_LESSON} onPress={() => void startLesson()} loading={starting} icon="play" />
            ) : null}
            {action === "complete" ? (
              <PrimaryButton
                label={ACADEMY_COMPLETE_LESSON}
                onPress={() => void completeLesson()}
                loading={completing}
                icon="checkmark-circle"
              />
            ) : null}
            {action === "done" ? <GhostButton label={ACADEMY_LESSON_DONE} onPress={() => undefined} disabled /> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.md },
  title: { color: colors.navy, fontSize: 22, fontWeight: "800" },
  metaRow: { flexDirection: "row", gap: 8 },
  sectionTitle: { color: colors.navy, fontWeight: "700", fontSize: 16 },
  body: { color: colors.navy, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  mdHeading: { color: colors.navy, fontWeight: "800", fontSize: 17 },
  mdH1: { fontSize: 20 },
  mdBold: { fontWeight: "700" },
  code: {
    fontFamily: "monospace",
    backgroundColor: colors.stitchBlueLow,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.navy,
    fontSize: 13,
  },
  exercisePrompt: { color: colors.navy, fontWeight: "600", fontSize: 14, marginTop: 8 },
});
