import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AcademyHeader } from "../components/AcademyChrome";
import { Badge, GhostButton, PrimaryButton } from "../components/ui";
import { ACADEMY_RETRY_QUIZ, ACADEMY_REVIEW_MODULE, formatAttemptDate, quizOutcomeLabel } from "../lib/academy";
import type { AppStackParamList } from "../navigation/types";
import { colors, radius, shadow, spacing } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "AcademyQuizResult">;

export function AcademyQuizResultScreen({ navigation, route }: Props) {
  const { courseSlug, moduleSlug, attempt } = route.params;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AcademyHeader title="Résultat" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, attempt.passed ? styles.heroPass : styles.heroFail]}>
          <Badge label={quizOutcomeLabel(attempt.passed)} tone={attempt.passed ? "green" : "orange"} />
          <Text style={styles.score}>{attempt.score_percent} %</Text>
          <Text style={styles.heroMeta}>Seuil de réussite : {attempt.pass_score} %</Text>
          <Text style={styles.heroMeta}>{formatAttemptDate(attempt.created_at)}</Text>
        </View>
        {attempt.answers.map((row) => (
          <View key={`${row.question_id}-${row.option_id}`} style={styles.card}>
            <Text style={styles.prompt}>{row.prompt}</Text>
            <Text style={styles.line}>Votre réponse : {row.selected_label}</Text>
            <Text style={styles.line}>Bonne réponse : {row.correct_label}</Text>
            {row.explanation ? <Text style={styles.explain}>{row.explanation}</Text> : null}
            <Badge label={row.is_correct ? "Correct" : "À revoir"} tone={row.is_correct ? "green" : "orange"} />
          </View>
        ))}
        <PrimaryButton
          label={ACADEMY_REVIEW_MODULE}
          onPress={() => navigation.navigate("AcademyModule", { courseSlug, moduleSlug })}
          icon="book"
        />
        <GhostButton
          label={ACADEMY_RETRY_QUIZ}
          onPress={() => navigation.navigate("AcademyQuiz", { courseSlug, moduleSlug })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stitchSurface },
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.md },
  hero: { borderRadius: 20, padding: spacing.md, gap: 8, ...shadow.card },
  heroPass: { backgroundColor: colors.mint },
  heroFail: { backgroundColor: colors.amberBg },
  score: { color: colors.navy, fontSize: 36, fontWeight: "800" },
  heroMeta: { color: colors.muted, fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
    ...shadow.card,
  },
  prompt: { color: colors.navy, fontWeight: "700", fontSize: 15, lineHeight: 21 },
  line: { color: colors.navy, fontSize: 14 },
  explain: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
