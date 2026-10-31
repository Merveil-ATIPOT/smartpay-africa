import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AcademyHeader } from "../components/AcademyChrome";
import { Badge, EmptyState, ErrorBanner, GhostButton, LoadingBlock } from "../components/ui";
import {
  ACADEMY_HOME_TITLE,
  ACADEMY_RETRY,
  academyCourseValidationLabel,
  academyErrorMessage,
  academyLessonAdvancementLabel,
  courseProgressOf,
  moduleLessonCountLabel,
  moduleProgressOf,
  type AcademyCourseDetail,
  type AcademyProgress,
} from "../lib/academy";
import type { AppStackParamList } from "../navigation/types";
import { fetchAcademyCourse, fetchAcademyProgress } from "../services/academy";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AcademyCourse">;

export function AcademyCourseScreen({ navigation, route }: Props) {
  const { courseSlug } = route.params;
  const [course, setCourse] = useState<AcademyCourseDetail | null>(null);
  const [progress, setProgress] = useState<AcademyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [nextCourse, nextProgress] = await Promise.all([
        fetchAcademyCourse(courseSlug),
        fetchAcademyProgress(),
      ]);
      setCourse(nextCourse);
      setProgress(nextProgress);
    } catch (err) {
      setCourse(null);
      setProgress(null);
      setError(academyErrorMessage(err, "Impossible de charger cette formation."));
    } finally {
      setLoading(false);
    }
  }, [courseSlug]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AcademyHeader title={course?.title ?? ACADEMY_HOME_TITLE} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingBlock label="Chargement de la formation…" /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {error ? <GhostButton label={ACADEMY_RETRY} onPress={() => void load()} /> : null}
        {course ? (
          <>
            <Text style={styles.title}>{course.title}</Text>
            <Text style={styles.summary}>{course.summary || "Formation SmartPay Academy."}</Text>
            {courseProgressOf(progress, course.slug) ? (
              <>
                <Text style={styles.summary}>
                  {academyLessonAdvancementLabel(
                    courseProgressOf(progress, course.slug)?.lessons_completed ?? 0,
                    courseProgressOf(progress, course.slug)?.lessons_published ?? 0,
                  )}
                </Text>
                <Text style={styles.summary}>
                  {academyCourseValidationLabel(
                    courseProgressOf(progress, course.slug)?.modules_completed ?? 0,
                    courseProgressOf(progress, course.slug)?.modules_published ?? 0,
                    courseProgressOf(progress, course.slug)?.progress_percent ?? 0,
                  )}
                </Text>
              </>
            ) : null}
            <Text style={styles.sectionTitle}>Modules</Text>
            {course.modules.length === 0 ? (
              <EmptyState title="Aucun module publié" subtitle="Les modules publiés apparaîtront dans l'ordre pédagogique." />
            ) : null}
            {course.modules.map((module) => (
              <Pressable
                key={module.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("AcademyModule", { courseSlug: course.slug, moduleSlug: module.slug })
                }
                accessibilityRole="button"
              >
                <View style={styles.order}>
                  <Text style={styles.orderText}>{module.order}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.cardTitle}>{module.title}</Text>
                  {module.objectives ? <Text style={styles.cardSub}>{module.objectives}</Text> : null}
                  <Text style={styles.cardMeta}>{moduleLessonCountLabel(module.published_lesson_count)}</Text>
                  {moduleProgressOf(courseProgressOf(progress, course.slug), module.slug)?.completed ? (
                    <Badge label="Module terminé" tone="green" />
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
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
  summary: { color: colors.muted, fontSize: 14, lineHeight: 20 },
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
  cardSub: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  cardMeta: { color: colors.orange, fontSize: 12, fontWeight: "600" },
});
