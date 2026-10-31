import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AcademyHeader } from "../components/AcademyChrome";
import { EmptyState, ErrorBanner, GhostButton, LoadingBlock, PrimaryButton } from "../components/ui";
import {
  ACADEMY_COURSE_DONE,
  ACADEMY_COURSE_VALIDATION_TITLE,
  ACADEMY_LESSON_ADVANCEMENT_TITLE,
  ACADEMY_PROGRESS_EMPTY,
  ACADEMY_PROGRESS_TITLE,
  ACADEMY_RESUME_CTA,
  ACADEMY_RETRY,
  academyCourseValidationLabel,
  academyErrorMessage,
  academyLessonAdvancementLabel,
  academyResumeTarget,
  formatAttemptDate,
  progressPercentLabel,
  type AcademyProgress,
} from "../lib/academy";
import type { AppStackParamList } from "../navigation/types";
import { fetchAcademyProgress } from "../services/academy";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AcademyProgress">;

export function AcademyProgressScreen({ navigation }: Props) {
  const [progress, setProgress] = useState<AcademyProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setProgress(await fetchAcademyProgress());
    } catch (err) {
      setProgress(null);
      setError(academyErrorMessage(err, "Impossible de charger votre progression."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const summary = progress?.summary;
  const target = academyResumeTarget(summary?.resume ?? null);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AcademyHeader title={ACADEMY_PROGRESS_TITLE} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingBlock label="Chargement de votre progression…" /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {error ? <GhostButton label={ACADEMY_RETRY} onPress={() => void load()} /> : null}
        {summary ? (
          <>
            <View style={styles.indicators}>
              <View style={styles.indicator}>
                <Text style={styles.indicatorTitle}>{ACADEMY_LESSON_ADVANCEMENT_TITLE}</Text>
                <Text style={styles.indicatorValue}>
                  {academyLessonAdvancementLabel(summary.lessons_completed, summary.lessons_published)}
                </Text>
              </View>
              <View style={styles.indicator}>
                <Text style={styles.indicatorTitle}>{ACADEMY_COURSE_VALIDATION_TITLE}</Text>
                <Text style={styles.indicatorValue}>
                  {academyCourseValidationLabel(
                    summary.modules_completed,
                    summary.modules_published,
                    summary.progress_percent,
                  )}
                </Text>
              </View>
            </View>
            {summary.lessons_started === 0 && summary.quiz_attempts === 0 ? (
              <EmptyState title={ACADEMY_PROGRESS_EMPTY} subtitle="Commencez une leçon pour enregistrer votre avancement." />
            ) : null}
            <View style={styles.grid}>
              <Stat label="Leçons terminées" value={`${summary.lessons_completed}/${summary.lessons_published}`} />
              <Stat label="Leçons commencées" value={`${summary.lessons_started}`} />
              <Stat label="Modules validés" value={`${summary.modules_completed}/${summary.modules_published}`} />
              <Stat label="Quiz effectués" value={`${summary.quiz_attempts}`} />
              <Stat label="Quiz réussis" value={`${summary.quizzes_passed}`} />
              <Stat
                label="Meilleure note"
                value={summary.best_score_percent == null ? "—" : progressPercentLabel(summary.best_score_percent)}
              />
            </View>
            <Text style={styles.line}>
              Dernière activité : {summary.last_activity_at ? formatAttemptDate(summary.last_activity_at) : "Aucune"}
            </Text>
            {summary.resume?.kind === "completed" ? <Text style={styles.done}>{ACADEMY_COURSE_DONE}</Text> : null}
            {target && summary.resume?.kind !== "completed" ? (
              <PrimaryButton
                label={ACADEMY_RESUME_CTA}
                onPress={() => navigation.navigate(target.name, target.params as never)}
                icon="play"
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.md },
  indicators: { gap: 8 },
  indicator: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.md,
    gap: 6,
    ...shadow.card,
  },
  indicatorTitle: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  indicatorValue: { color: colors.navy, fontSize: 18, fontWeight: "800", lineHeight: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  statValue: { color: colors.navy, fontWeight: "800", fontSize: 18 },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 4 },
  line: { color: colors.muted, fontSize: 13 },
  done: { color: colors.green, fontWeight: "700" },
});
