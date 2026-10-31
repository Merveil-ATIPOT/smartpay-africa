import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AcademyHeader } from "../components/AcademyChrome";
import { Badge, EmptyState, ErrorBanner, GhostButton, LoadingBlock, PrimaryButton } from "../components/ui";
import {
  ACADEMY_EMPTY_SUBTITLE,
  ACADEMY_EMPTY_TITLE,
  ACADEMY_FOOTER,
  ACADEMY_FREE_BADGE,
  ACADEMY_HOME_TITLE,
  ACADEMY_INTRO,
  ACADEMY_PROGRESS_TITLE,
  ACADEMY_RESUME_CTA,
  ACADEMY_RETRY,
  academyCourseValidationLabel,
  academyErrorMessage,
  academyLessonAdvancementLabel,
  academyResumeTarget,
  courseProgressOf,
  publishedModuleCountLabel,
  type AcademyCourseListItem,
  type AcademyProgress,
} from "../lib/academy";
import type { AppStackParamList } from "../navigation/types";
import { fetchAcademyProgress, listAcademyCourses } from "../services/academy";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AcademyHome">;

export function AcademyHomeScreen({ navigation }: Props) {
  const [courses, setCourses] = useState<AcademyCourseListItem[]>([]);
  const [progress, setProgress] = useState<AcademyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [catalog, nextProgress] = await Promise.all([listAcademyCourses(), fetchAcademyProgress()]);
      setCourses(catalog);
      setProgress(nextProgress);
    } catch (err) {
      setCourses([]);
      setProgress(null);
      setError(academyErrorMessage(err, "Impossible de charger le catalogue."));
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
      <AcademyHeader title={ACADEMY_HOME_TITLE} onBack={() => navigation.goBack()} accessibilityLabel="Retour à l'assistant" />
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
        <View style={styles.hero}>
          <Badge label={ACADEMY_FREE_BADGE} tone="orange" />
          <Text style={styles.heroTitle}>{ACADEMY_HOME_TITLE}</Text>
          <Text style={styles.heroCopy}>{ACADEMY_INTRO}</Text>
          {progress ? (
            <>
              <Text style={styles.heroCopy}>
                {academyLessonAdvancementLabel(progress.summary.lessons_completed, progress.summary.lessons_published)}
              </Text>
              <Text style={styles.heroCopy}>
                {academyCourseValidationLabel(
                  progress.summary.modules_completed,
                  progress.summary.modules_published,
                  progress.summary.progress_percent,
                )}
              </Text>
            </>
          ) : null}
        </View>
        {progress ? (
          <PrimaryButton label={ACADEMY_PROGRESS_TITLE} onPress={() => navigation.navigate("AcademyProgress")} icon="stats-chart" />
        ) : null}
        {(() => {
          const target = academyResumeTarget(progress?.summary.resume ?? null);
          if (!target || progress?.summary.resume?.kind === "completed") {
            return null;
          }
          return (
            <PrimaryButton
              label={ACADEMY_RESUME_CTA}
              onPress={() => navigation.navigate(target.name, target.params as never)}
              icon="play"
            />
          );
        })()}

        <Text style={styles.sectionTitle}>Formations disponibles</Text>
        {loading ? <LoadingBlock label="Chargement du catalogue…" /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {error ? <GhostButton label={ACADEMY_RETRY} onPress={() => void load()} /> : null}
        {!loading && !error && courses.length === 0 ? (
          <EmptyState title={ACADEMY_EMPTY_TITLE} subtitle={ACADEMY_EMPTY_SUBTITLE} />
        ) : null}
        {courses.map((course) => (
          <Pressable
            key={course.id}
            style={styles.card}
            onPress={() => navigation.navigate("AcademyCourse", { courseSlug: course.slug })}
            accessibilityRole="button"
          >
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.cardTitle}>{course.title}</Text>
              <Text style={styles.cardSummary}>{course.summary || "Formation SmartPay Academy."}</Text>
              <Text style={styles.cardMeta}>
                {publishedModuleCountLabel(course.published_module_count)}
                {courseProgressOf(progress, course.slug)
                  ? ` · ${academyLessonAdvancementLabel(
                      courseProgressOf(progress, course.slug)?.lessons_completed ?? 0,
                      courseProgressOf(progress, course.slug)?.lessons_published ?? 0,
                    )}`
                  : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
        <Text style={styles.footer}>{ACADEMY_FOOTER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.md },
  hero: {
    backgroundColor: colors.stitchNavy,
    borderRadius: 20,
    padding: spacing.md,
    gap: 10,
    ...shadow.card,
  },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: "800" },
  heroCopy: { color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: colors.navy, fontWeight: "700", fontSize: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadow.card,
  },
  cardTitle: { color: colors.navy, fontWeight: "700", fontSize: 15 },
  cardSummary: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  cardMeta: { color: colors.orange, fontSize: 12, fontWeight: "600" },
  footer: { color: colors.muted, textAlign: "center", fontSize: 11, lineHeight: 16 },
});
