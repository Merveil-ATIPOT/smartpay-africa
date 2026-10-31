import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AcademyHeader } from "../components/AcademyChrome";
import { Badge, EmptyState, ErrorBanner, GhostButton, LoadingBlock, PrimaryButton } from "../components/ui";
import {
  ACADEMY_HOME_TITLE,
  ACADEMY_RETRY,
  academyErrorMessage,
  courseProgressOf,
  lessonDifficultyLabel,
  lessonDurationLabel,
  lessonStatusLabel,
  lessonStatusOf,
  moduleProgressOf,
  progressPercentLabel,
  type AcademyModuleDetail,
  type AcademyProgress,
} from "../lib/academy";
import type { AppStackParamList } from "../navigation/types";
import { fetchAcademyModule, fetchAcademyProgress } from "../services/academy";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AcademyModule">;

export function AcademyModuleScreen({ navigation, route }: Props) {
  const { courseSlug, moduleSlug } = route.params;
  const [module, setModule] = useState<AcademyModuleDetail | null>(null);
  const [progress, setProgress] = useState<AcademyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [nextModule, nextProgress] = await Promise.all([
        fetchAcademyModule(courseSlug, moduleSlug),
        fetchAcademyProgress(),
      ]);
      setModule(nextModule);
      setProgress(nextProgress);
    } catch (err) {
      setModule(null);
      setProgress(null);
      setError(academyErrorMessage(err, "Impossible de charger ce module."));
    } finally {
      setLoading(false);
    }
  }, [courseSlug, moduleSlug]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AcademyHeader title={module?.title ?? ACADEMY_HOME_TITLE} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingBlock label="Chargement du module…" /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {error ? <GhostButton label={ACADEMY_RETRY} onPress={() => void load()} /> : null}
        {module ? (
          <>
            <Text style={styles.title}>{module.title}</Text>
            {module.objectives ? <Text style={styles.objectives}>{module.objectives}</Text> : null}
            {moduleProgressOf(courseProgressOf(progress, courseSlug), module.slug) ? (
              <Text style={styles.objectives}>
                {moduleProgressOf(courseProgressOf(progress, courseSlug), module.slug)?.completed
                  ? "Module terminé"
                  : "Module en cours"}
                {moduleProgressOf(courseProgressOf(progress, courseSlug), module.slug)?.best_score_percent != null
                  ? ` · meilleure note ${progressPercentLabel(moduleProgressOf(courseProgressOf(progress, courseSlug), module.slug)?.best_score_percent ?? 0)}`
                  : ""}
              </Text>
            ) : null}
            <Text style={styles.sectionTitle}>Leçons</Text>
            {module.lessons.length === 0 ? (
              <EmptyState title="Aucune leçon publiée" subtitle="Les leçons publiées apparaîtront dans l'ordre pédagogique." />
            ) : null}
            {module.lessons.map((lesson) => (
              <Pressable
                key={lesson.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("AcademyLesson", {
                    courseSlug,
                    moduleSlug: module.slug,
                    lessonSlug: lesson.slug,
                  })
                }
                accessibilityRole="button"
              >
                <View style={styles.order}>
                  <Text style={styles.orderText}>{lesson.order}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.cardTitle}>{lesson.title}</Text>
                  <Text style={styles.cardMeta}>
                    {lessonDifficultyLabel(lesson.difficulty)} · {lessonDurationLabel(lesson.duration_minutes)}
                  </Text>
                  <Badge
                    label={lessonStatusLabel(lessonStatusOf(moduleProgressOf(courseProgressOf(progress, courseSlug), module.slug), lesson.slug))}
                    tone={lessonStatusOf(moduleProgressOf(courseProgressOf(progress, courseSlug), module.slug), lesson.slug) === "completed" ? "green" : "orange"}
                  />
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
            <PrimaryButton
              label="Passer le quiz"
              icon="help-circle"
              onPress={() => navigation.navigate("AcademyQuiz", { courseSlug, moduleSlug: module.slug })}
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
  title: { color: colors.navy, fontSize: 22, fontWeight: "800" },
  objectives: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: colors.navy, fontWeight: "700", fontSize: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.card,
  },
  order: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.amberBg,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: { color: colors.orange, fontWeight: "800" },
  cardTitle: { color: colors.navy, fontWeight: "700", fontSize: 15 },
  cardMeta: { color: colors.muted, fontSize: 12 },
});
