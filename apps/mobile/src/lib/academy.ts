import { ApiError, userFacingRequestError } from "../services/errors";

export const ACADEMY_HOME_TITLE = "SmartPay Academy";
export const ACADEMY_FREE_BADGE = "Formation gratuite · Démonstration";
export const ACADEMY_REGTEST_BADGE = "Regtest · Démo";
export const ACADEMY_INTRO =
  "Découvrez Bitcoin et Lightning avec des leçons courtes, des exercices et des quiz. Les notes sont calculées par le serveur. Aucun paiement n'est demandé.";
export const ACADEMY_CARD_TITLE = "SmartPay Academy";
export const ACADEMY_CARD_DESCRIPTION =
  "Apprenez Bitcoin et Lightning avec des cours, des exercices et des quiz.";
export const ACADEMY_CARD_CTA = "Commencer à apprendre";
export const ACADEMY_EMPTY_TITLE = "Aucune formation publiée";
export const ACADEMY_EMPTY_SUBTITLE =
  "Les cours publiés apparaîtront ici. Aucune formation fictive n'est affichée.";
export const ACADEMY_RETRY = "Réessayer";
export const ACADEMY_BACK_ASSISTANT = "Retour à l'assistant";
export const ACADEMY_START_LESSON = "Commencer la leçon";
export const ACADEMY_COMPLETE_LESSON = "Marquer comme terminée";
export const ACADEMY_LESSON_STARTED = "Leçon commencée";
export const ACADEMY_LESSON_DONE = "Leçon terminée";
export const ACADEMY_SUBMIT_QUIZ = "Soumettre mes réponses";
export const ACADEMY_REVIEW_MODULE = "Revoir le module";
export const ACADEMY_RETRY_QUIZ = "Réessayer le quiz";
export const ACADEMY_QUIZ_EMPTY = "Aucun quiz publié pour ce module.";
export const ACADEMY_FOOTER = "Espace pédagogique · aucun paiement Lightning.";
export const ACADEMY_PROGRESS_TITLE = "Ma progression";
export const ACADEMY_RESUME_CTA = "Reprendre ma formation";
export const ACADEMY_PROGRESS_EMPTY = "Aucune progression enregistrée pour ce compte.";
export const ACADEMY_COURSE_DONE = "Formation terminée";
export const ACADEMY_LESSON_ADVANCEMENT_TITLE = "Avancement des leçons";
export const ACADEMY_COURSE_VALIDATION_TITLE = "Validation de la formation";

export const ACADEMY_COURSES_PATH = "/api/v1/academy/courses/";
export const ACADEMY_PROGRESS_PATH = "/api/v1/academy/me/progress/";

export type AcademyLessonDifficulty = "intro" | "base" | "approfondi";

export type AcademyCourseListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content_version: number;
  published_module_count: number;
};

export type AcademyCourseModule = {
  id: string;
  slug: string;
  title: string;
  objectives: string;
  order: number;
  published_lesson_count: number;
};

export type AcademyCourseDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content_version: number;
  modules: AcademyCourseModule[];
};

export type AcademyModuleLesson = {
  id: string;
  slug: string;
  title: string;
  difficulty: AcademyLessonDifficulty;
  duration_minutes: number;
  order: number;
};

export type AcademyModuleDetail = {
  id: string;
  slug: string;
  title: string;
  objectives: string;
  order: number;
  course: { id: string; slug: string; title: string };
  lessons: AcademyModuleLesson[];
};

export type AcademyExercise = {
  id: string;
  type: "reflection" | "identify" | "navigate";
  prompt: string;
  content: Record<string, unknown>;
  order: number;
};

export type AcademyLessonDetail = {
  id: string;
  slug: string;
  title: string;
  body_md: string;
  difficulty: AcademyLessonDifficulty;
  duration_minutes: number;
  order: number;
  module: { id: string; slug: string; title: string; course_slug: string };
  exercises: AcademyExercise[];
};

export type AcademyLessonProgress = {
  lesson_id: string;
  status: "started" | "completed";
  started_at: string;
  completed_at: string | null;
};

export type AcademyQuizOption = {
  id: string;
  label: string;
  order: number;
};

export type AcademyQuizQuestion = {
  id: string;
  prompt: string;
  order: number;
  options: AcademyQuizOption[];
};

export type AcademyQuiz = {
  id: string;
  content_version: number;
  pass_score: number;
  questions: AcademyQuizQuestion[];
};

export type AcademyQuizAnswerSnapshot = {
  question_id: string;
  option_id: string;
  prompt: string;
  selected_label: string;
  is_correct: boolean;
  correct_option_id: string;
  correct_label: string;
  explanation: string;
};

export type AcademyQuizAttemptDetail = {
  id: string;
  quiz_id: string;
  quiz_version: number;
  pass_score: number;
  score_percent: number;
  passed: boolean;
  answers: AcademyQuizAnswerSnapshot[];
  created_at: string;
};

export type AcademyQuizSelection = Record<string, string>;

export type AcademyResume = {
  kind: "lesson" | "quiz" | "completed";
  course_slug: string;
  module_slug: string | null;
  lesson_slug: string | null;
  title: string;
};

export type AcademyLessonStatus = "started" | "completed" | null;

export type AcademyProgressLesson = {
  slug: string;
  title: string;
  order: number;
  status: AcademyLessonStatus;
};

export type AcademyProgressModule = {
  slug: string;
  title: string;
  order: number;
  completed: boolean;
  lessons_started: number;
  lessons_completed: number;
  lessons_published: number;
  quiz_required: boolean;
  quiz_passed: boolean;
  quiz_attempts: number;
  best_score_percent: number | null;
  last_activity_at: string | null;
  lessons: AcademyProgressLesson[];
};

export type AcademyCourseProgress = {
  id: string;
  slug: string;
  title: string;
  lessons_started: number;
  lessons_completed: number;
  lessons_published: number;
  modules_completed: number;
  modules_published: number;
  quiz_attempts: number;
  quizzes_passed: number;
  best_score_percent: number | null;
  progress_percent: number;
  completed: boolean;
  last_activity_at: string | null;
  resume: AcademyResume;
  modules: AcademyProgressModule[];
};

export type AcademyProgressSummary = {
  lessons_started: number;
  lessons_completed: number;
  lessons_published: number;
  modules_completed: number;
  modules_published: number;
  quiz_attempts: number;
  quizzes_passed: number;
  best_score_percent: number | null;
  progress_percent: number;
  last_activity_at: string | null;
  resume: AcademyResume | null;
};

export type AcademyProgress = {
  summary: AcademyProgressSummary;
  courses: AcademyCourseProgress[];
};

export type AcademyErrorKind = "auth" | "not_found" | "conflict" | "throttled" | "network" | "validation" | "unknown";

export type AcademyMdInline = { bold: boolean; text: string };

export type AcademyMdBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string };

export type AcademyLessonAction = "start" | "complete" | "done";

export type AcademyLessonAdvancement = {
  completed: number;
  published: number;
  percent: number;
};

export type AcademyCourseValidation = {
  completed: number;
  published: number;
  percent: number;
};

export function academyCoursePath(courseSlug: string): string {
  return `/api/v1/academy/courses/${courseSlug}/`;
}

export function academyModulePath(courseSlug: string, moduleSlug: string): string {
  return `/api/v1/academy/courses/${courseSlug}/modules/${moduleSlug}/`;
}

export function academyLessonPath(courseSlug: string, moduleSlug: string, lessonSlug: string): string {
  return `${academyModulePath(courseSlug, moduleSlug)}lessons/${lessonSlug}/`;
}

export function academyLessonStartPath(courseSlug: string, moduleSlug: string, lessonSlug: string): string {
  return `${academyLessonPath(courseSlug, moduleSlug, lessonSlug)}start/`;
}

export function academyLessonCompletePath(courseSlug: string, moduleSlug: string, lessonSlug: string): string {
  return `${academyLessonPath(courseSlug, moduleSlug, lessonSlug)}complete/`;
}

export function academyQuizPath(courseSlug: string, moduleSlug: string): string {
  return `${academyModulePath(courseSlug, moduleSlug)}quizzes/`;
}

export function academyQuizAttemptsPath(courseSlug: string, moduleSlug: string, quizId: string): string {
  return `${academyQuizPath(courseSlug, moduleSlug)}${quizId}/attempts/`;
}

export function academyProgressPath(): string {
  return ACADEMY_PROGRESS_PATH;
}

export function courseProgressOf(progress: AcademyProgress | null, slug: string): AcademyCourseProgress | null {
  return progress?.courses.find((item) => item.slug === slug) ?? null;
}

export function moduleProgressOf(
  course: AcademyCourseProgress | null,
  moduleSlug: string,
): AcademyProgressModule | null {
  return course?.modules.find((item) => item.slug === moduleSlug) ?? null;
}

export function lessonStatusOf(module: AcademyProgressModule | null, lessonSlug: string): AcademyLessonStatus {
  return module?.lessons.find((item) => item.slug === lessonSlug)?.status ?? null;
}

export function lessonStatusLabel(status: AcademyLessonStatus): string {
  if (status === "completed") {
    return "Terminée";
  }
  if (status === "started") {
    return "Commencée";
  }
  return "À faire";
}

export function progressPercentLabel(value: number): string {
  return `${value} %`;
}

export function academyLessonAdvancement(completed: number, published: number): AcademyLessonAdvancement {
  const safeCompleted = Math.max(0, completed);
  const safePublished = Math.max(0, published);
  return {
    completed: safeCompleted,
    published: safePublished,
    percent: safePublished === 0 ? 0 : Math.floor((100 * safeCompleted) / safePublished),
  };
}

export function academyCourseValidation(
  modulesCompleted: number,
  modulesPublished: number,
  progressPercent: number,
): AcademyCourseValidation {
  return {
    completed: Math.max(0, modulesCompleted),
    published: Math.max(0, modulesPublished),
    percent: progressPercent,
  };
}

export function academyLessonAdvancementLabel(completed: number, published: number): string {
  const row = academyLessonAdvancement(completed, published);
  if (row.published === 0) {
    return "0/0 leçon terminée — 0 % d'avancement";
  }
  const lessonWord = row.published <= 1 ? "leçon terminée" : "leçons terminées";
  return `${row.completed}/${row.published} ${lessonWord} — ${row.percent} % d'avancement`;
}

export function academyCourseValidationLabel(
  modulesCompleted: number,
  modulesPublished: number,
  progressPercent: number,
): string {
  const row = academyCourseValidation(modulesCompleted, modulesPublished, progressPercent);
  if (row.published === 0) {
    return `0/0 module validé — ${row.percent} % de validation`;
  }
  const moduleWord = row.published <= 1 ? "module validé" : "modules validés";
  return `${row.completed}/${row.published} ${moduleWord} — ${row.percent} % de validation`;
}

export function academyLessonAction(status: AcademyLessonStatus): AcademyLessonAction {
  if (status === "completed") {
    return "done";
  }
  if (status === "started") {
    return "complete";
  }
  return "start";
}

export function academyLessonStatusFromApi(row: Pick<AcademyLessonProgress, "status">): AcademyLessonStatus {
  if (row.status === "completed" || row.status === "started") {
    return row.status;
  }
  return null;
}

export function academyResumeTarget(resume: AcademyResume | null): {
  name: "AcademyLesson" | "AcademyQuiz" | "AcademyCourse";
  params: { courseSlug: string; moduleSlug?: string; lessonSlug?: string };
} | null {
  if (!resume) {
    return null;
  }
  if (resume.kind === "lesson" && resume.module_slug && resume.lesson_slug) {
    return {
      name: "AcademyLesson",
      params: { courseSlug: resume.course_slug, moduleSlug: resume.module_slug, lessonSlug: resume.lesson_slug },
    };
  }
  if (resume.kind === "quiz" && resume.module_slug) {
    return { name: "AcademyQuiz", params: { courseSlug: resume.course_slug, moduleSlug: resume.module_slug } };
  }
  if (resume.kind === "completed") {
    return { name: "AcademyCourse", params: { courseSlug: resume.course_slug } };
  }
  return null;
}

export function newAcademyIdempotencyKey(now = Date.now(), random = Math.random()): string {
  return `acd05-${now}-${random.toString(36).slice(2, 12)}`.slice(0, 64);
}

export class AcademySubmitLock {
  private busy = false;
  private key: string | null = null;

  begin(): string | null {
    if (this.busy) {
      return null;
    }
    this.busy = true;
    this.key = this.key ?? newAcademyIdempotencyKey();
    return this.key;
  }

  fail(): void {
    this.busy = false;
  }

  succeed(): void {
    this.busy = false;
    this.key = null;
  }

  currentKey(): string | null {
    return this.key;
  }

  isBusy(): boolean {
    return this.busy;
  }
}

export function classifyAcademyError(error: unknown): AcademyErrorKind {
  if (!(error instanceof ApiError)) {
    return "unknown";
  }
  if (error.status === 0 || error.status >= 500) {
    return "network";
  }
  if (error.status === 401) {
    return "auth";
  }
  if (error.status === 404) {
    return "not_found";
  }
  if (error.status === 409) {
    return "conflict";
  }
  if (error.status === 429) {
    return "throttled";
  }
  if (error.status === 400) {
    return "validation";
  }
  return "unknown";
}

export function academyErrorMessage(error: unknown, fallback = "Impossible de charger Academy."): string {
  const kind = classifyAcademyError(error);
  if (kind === "auth") {
    return "Session expirée. Reconnectez-vous pour continuer Academy.";
  }
  if (kind === "not_found") {
    return "Ce contenu n'est pas disponible ou n'est plus publié.";
  }
  if (kind === "conflict") {
    return "Cette tentative a déjà été envoyée avec d'autres réponses. Recommencez le quiz.";
  }
  if (kind === "throttled") {
    return "Trop de soumissions. Patientez un instant avant de réessayer.";
  }
  if (kind === "network") {
    return userFacingRequestError(error, "Réseau indisponible. Academy n'a déclenché aucun paiement.");
  }
  return userFacingRequestError(error, fallback);
}

export function lessonDifficultyLabel(value: string): string {
  if (value === "intro") {
    return "Introduction";
  }
  if (value === "base") {
    return "Base";
  }
  if (value === "approfondi") {
    return "Approfondi";
  }
  return value;
}

export function lessonDurationLabel(minutes: number): string {
  return `${minutes} min`;
}

export function moduleLessonCountLabel(count: number): string {
  return count <= 1 ? `${count} leçon` : `${count} leçons`;
}

export function publishedModuleCountLabel(count: number): string {
  return count <= 1 ? `${count} module` : `${count} modules`;
}

export function quizProgressLabel(current: number, total: number): string {
  return `Question ${current} sur ${total}`;
}

export function allQuestionsAnswered(questions: readonly AcademyQuizQuestion[], selected: AcademyQuizSelection): boolean {
  return questions.length > 0 && questions.every((question) => Boolean(selected[question.id]));
}

export function buildQuizAnswers(selected: AcademyQuizSelection): { question_id: string; option_id: string }[] {
  return Object.entries(selected).map(([question_id, option_id]) => ({ question_id, option_id }));
}

export function canSubmitQuiz(
  questions: readonly AcademyQuizQuestion[],
  selected: AcademyQuizSelection,
  submitting: boolean,
): boolean {
  return !submitting && allQuestionsAnswered(questions, selected);
}

export function publicExerciseContent(content: Record<string, unknown>): Record<string, unknown> {
  const next = { ...content };
  delete next.is_correct;
  return next;
}

export function exerciseTypeLabel(type: AcademyExercise["type"]): string {
  if (type === "identify") {
    return "Identification";
  }
  if (type === "navigate") {
    return "Parcours guidé";
  }
  return "Réflexion";
}

export function formatAttemptDate(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) {
    return "";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

export function quizOutcomeLabel(passed: boolean): string {
  return passed ? "Quiz réussi" : "Quiz à retravailler";
}

export function parseAcademyMarkdown(source: string): AcademyMdBlock[] {
  const text = source.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return [];
  }
  const blocks: AcademyMdBlock[] = [];
  const chunks = text.split(/\n{2,}/);
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    if (lines[0].startsWith("```")) {
      blocks.push({ type: "code", text: lines.slice(1).join("\n").replace(/```$/, "").trim() });
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(lines[0]);
    if (heading && lines.length === 1) {
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      continue;
    }
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      blocks.push({ type: "list", items: lines.map((line) => line.replace(/^[-*]\s+/, "").trim()) });
      continue;
    }
    blocks.push({ type: "paragraph", text: lines.join(" ").trim() });
  }
  return blocks;
}

export function parseAcademyInline(source: string): AcademyMdInline[] {
  const parts: AcademyMdInline[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match = pattern.exec(source);
  while (match) {
    if (match.index > lastIndex) {
      parts.push({ bold: false, text: source.slice(lastIndex, match.index) });
    }
    parts.push({ bold: true, text: match[1] });
    lastIndex = match.index + match[0].length;
    match = pattern.exec(source);
  }
  if (lastIndex < source.length) {
    parts.push({ bold: false, text: source.slice(lastIndex) });
  }
  return parts.filter((part) => part.text.length > 0);
}

export function academyHomeCopy(): string {
  return [
    ACADEMY_HOME_TITLE,
    ACADEMY_FREE_BADGE,
    ACADEMY_INTRO,
    ACADEMY_EMPTY_TITLE,
    ACADEMY_EMPTY_SUBTITLE,
    ACADEMY_CARD_TITLE,
    ACADEMY_CARD_DESCRIPTION,
    ACADEMY_CARD_CTA,
    ACADEMY_FOOTER,
  ].join("\n");
}

export function academyUsesCatalogOnly(path: string): boolean {
  return path.startsWith("/api/v1/academy/") && !/payments|wallet|lnd|transfers/i.test(path);
}
