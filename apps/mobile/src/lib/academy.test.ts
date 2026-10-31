import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { ApiError } from "../services/errors";
import {
  ACADEMY_CARD_CTA,
  ACADEMY_CARD_DESCRIPTION,
  ACADEMY_CARD_TITLE,
  ACADEMY_COURSES_PATH,
  ACADEMY_PROGRESS_PATH,
  ACADEMY_EMPTY_SUBTITLE,
  ACADEMY_EMPTY_TITLE,
  ACADEMY_FREE_BADGE,
  ACADEMY_HOME_TITLE,
  AcademySubmitLock,
  academyResumeTarget,
  academyCoursePath,
  academyCourseValidation,
  academyCourseValidationLabel,
  academyErrorMessage,
  academyHomeCopy,
  academyLessonAction,
  academyLessonAdvancement,
  academyLessonAdvancementLabel,
  academyLessonCompletePath,
  academyLessonPath,
  academyLessonStartPath,
  academyLessonStatusFromApi,
  academyModulePath,
  academyQuizAttemptsPath,
  academyQuizPath,
  academyUsesCatalogOnly,
  parseAcademyInline,
  allQuestionsAnswered,
  buildQuizAnswers,
  canSubmitQuiz,
  classifyAcademyError,
  lessonStatusLabel,
  lessonDifficultyLabel,
  newAcademyIdempotencyKey,
  parseAcademyMarkdown,
  publicExerciseContent,
  publishedModuleCountLabel,
  quizOutcomeLabel,
  type AcademyQuizQuestion,
} from "./academy";

const questions: AcademyQuizQuestion[] = [
  {
    id: "q1",
    prompt: "Regtest a-t-il une valeur de marché ?",
    order: 1,
    options: [
      { id: "o1", label: "Non", order: 1 },
      { id: "o2", label: "Oui", order: 2 },
    ],
  },
  {
    id: "q2",
    prompt: "1 BTC vaut combien de sats ?",
    order: 2,
    options: [
      { id: "o3", label: "100000000", order: 1 },
      { id: "o4", label: "1000", order: 2 },
    ],
  },
];

describe("SmartPay Academy mobile", () => {
  it("ouvre Academy depuis Services puis l'Assistant IA", () => {
    const services = readFileSync("src/screens/ServicesScreen.tsx", "utf8");
    const home = readFileSync("src/screens/AssistantHomeScreen.tsx", "utf8");
    const types = readFileSync("src/navigation/types.ts", "utf8");
    const root = readFileSync("src/navigation/RootNavigator.tsx", "utf8");
    assert.match(services, /navigate\("AssistantHome"\)/);
    assert.match(services, /SmartPay Academy/);
    assert.match(home, /navigate\("AcademyHome"\)/);
    assert.match(home, /ACADEMY_CARD_TITLE/);
    assert.match(home, /ACADEMY_CARD_DESCRIPTION/);
    assert.match(home, /ACADEMY_CARD_CTA/);
    assert.equal(ACADEMY_CARD_TITLE, "SmartPay Academy");
    assert.match(ACADEMY_CARD_DESCRIPTION, /Bitcoin et Lightning/);
    assert.equal(ACADEMY_CARD_CTA, "Commencer à apprendre");
    assert.match(types, /AcademyHome:\s*undefined/);
    assert.match(types, /AcademyCourse:\s*\{\s*courseSlug:\s*string/);
    assert.match(types, /AcademyLesson:[\s\S]*lessonSlug/);
    assert.match(root, /name="AcademyHome"/);
    assert.match(root, /name="AcademyProgress"/);
    assert.match(root, /name="AcademyQuizResult"/);
    assert.match(root, /name="AssistantHome"/);
    assert.match(root, /name="AssistantExplain"/);
  });

  it("présente un catalogue vide sans formation fictive", () => {
    const screen = readFileSync("src/screens/AcademyHomeScreen.tsx", "utf8");
    assert.match(screen, /listAcademyCourses/);
    assert.match(screen, /ACADEMY_EMPTY_TITLE/);
    assert.match(screen, /ErrorBanner/);
    assert.match(screen, /LoadingBlock/);
    assert.equal(ACADEMY_EMPTY_TITLE, "Aucune formation publiée");
    assert.match(ACADEMY_EMPTY_SUBTITLE, /fictive/);
    assert.equal(academyHomeCopy().includes("Bitcoin Lightning SmartPay"), false);
    assert.match(ACADEMY_FREE_BADGE, /Formation gratuite/);
  });

  it("utilise le catalogue Django réel", () => {
    assert.equal(ACADEMY_COURSES_PATH, "/api/v1/academy/courses/");
    assert.equal(academyCoursePath("bitcoin-lightning-smartpay"), "/api/v1/academy/courses/bitcoin-lightning-smartpay/");
    assert.equal(publishedModuleCountLabel(0), "0 module");
    assert.equal(publishedModuleCountLabel(2), "2 modules");
    const service = readFileSync("src/services/academy.ts", "utf8");
    assert.match(service, /listAcademyCourses/);
    assert.match(service, /fetchAcademyCourse/);
    assert.equal(academyUsesCatalogOnly(ACADEMY_COURSES_PATH), true);
  });

  it("relie modules et leçons aux routes imbriquées", () => {
    assert.equal(
      academyModulePath("btc", "intro"),
      "/api/v1/academy/courses/btc/modules/intro/",
    );
    assert.equal(
      academyLessonPath("btc", "intro", "sats"),
      "/api/v1/academy/courses/btc/modules/intro/lessons/sats/",
    );
    assert.equal(lessonDifficultyLabel("intro"), "Introduction");
    const course = readFileSync("src/screens/AcademyCourseScreen.tsx", "utf8");
    const moduleScreen = readFileSync("src/screens/AcademyModuleScreen.tsx", "utf8");
    assert.match(course, /fetchAcademyCourse/);
    assert.match(course, /AcademyModule/);
    assert.match(moduleScreen, /fetchAcademyModule/);
    assert.match(moduleScreen, /AcademyLesson/);
    assert.match(moduleScreen, /AcademyQuiz/);
    assert.equal(course.includes("prérequis"), false);
    assert.match(moduleScreen, /fetchAcademyProgress/);
    assert.equal(moduleScreen.includes("Math.floor"), false);
  });

  it("démarre et termine une leçon sans le faire au GET", () => {
    const lesson = readFileSync("src/screens/AcademyLessonScreen.tsx", "utf8");
    assert.match(lesson, /fetchAcademyLesson/);
    assert.match(lesson, /startAcademyLesson/);
    assert.match(lesson, /completeAcademyLesson/);
    assert.match(lesson, /completeLock/);
    assert.equal(
      academyLessonStartPath("btc", "intro", "sats"),
      "/api/v1/academy/courses/btc/modules/intro/lessons/sats/start/",
    );
    assert.equal(
      academyLessonCompletePath("btc", "intro", "sats"),
      "/api/v1/academy/courses/btc/modules/intro/lessons/sats/complete/",
    );
    const loadBlock = lesson.match(/const load = useCallback\([\s\S]*?\}, \[[^\]]+\]\);/);
    assert.ok(loadBlock);
    assert.equal(loadBlock[0].includes("startAcademyLesson"), false);
    assert.equal(loadBlock[0].includes("completeAcademyLesson"), false);
  });

  it("valide les réponses du quiz avant soumission", () => {
    assert.equal(allQuestionsAnswered(questions, {}), false);
    assert.equal(allQuestionsAnswered(questions, { q1: "o1" }), false);
    assert.equal(allQuestionsAnswered(questions, { q1: "o1", q2: "o3" }), true);
    assert.equal(canSubmitQuiz(questions, { q1: "o1", q2: "o3" }, false), true);
    assert.equal(canSubmitQuiz(questions, { q1: "o1", q2: "o3" }, true), false);
    assert.deepEqual(buildQuizAnswers({ q1: "o1", q2: "o3" }), [
      { question_id: "q1", option_id: "o1" },
      { question_id: "q2", option_id: "o3" },
    ]);
    const quiz = readFileSync("src/screens/AcademyQuizScreen.tsx", "utf8");
    assert.match(quiz, /fetchAcademyQuiz/);
    assert.equal(quiz.includes("is_correct"), false);
    assert.equal(quiz.includes("score_percent"), false);
    assert.equal(academyQuizPath("btc", "intro"), "/api/v1/academy/courses/btc/modules/intro/quizzes/");
  });

  it("conserve la même Idempotency-Key pendant un retry réseau", () => {
    const lock = new AcademySubmitLock();
    const first = lock.begin();
    assert.ok(first);
    assert.equal(lock.begin(), null);
    lock.fail();
    const retry = lock.begin();
    assert.equal(retry, first);
    lock.succeed();
    const nextTry = lock.begin();
    assert.ok(nextTry);
    assert.notEqual(nextTry, first);
    assert.match(newAcademyIdempotencyKey(1, 0.5), /^acd05-1-/);
    const service = readFileSync("src/services/academy.ts", "utf8");
    assert.match(service, /Idempotency-Key/);
    assert.match(service, /submitAcademyQuizAttempt/);
    assert.equal(
      academyQuizAttemptsPath("btc", "intro", "quiz-1"),
      "/api/v1/academy/courses/btc/modules/intro/quizzes/quiz-1/attempts/",
    );
  });

  it("affiche le résultat serveur sans recalculer la note", () => {
    const result = readFileSync("src/screens/AcademyQuizResultScreen.tsx", "utf8");
    assert.match(result, /attempt.score_percent/);
    assert.match(result, /attempt.pass_score/);
    assert.match(result, /attempt.passed/);
    assert.match(result, /correct_label/);
    assert.match(result, /explanation/);
    assert.match(result, /ACADEMY_REVIEW_MODULE/);
    assert.match(result, /ACADEMY_RETRY_QUIZ/);
    assert.equal(quizOutcomeLabel(true), "Quiz réussi");
    assert.equal(quizOutcomeLabel(false), "Quiz à retravailler");
    assert.equal(result.includes("Math.floor"), false);
    assert.equal(result.includes("compute_score"), false);
  });

  it("classe les erreurs API Academy", () => {
    assert.equal(classifyAcademyError(new ApiError(401, "no")), "auth");
    assert.equal(classifyAcademyError(new ApiError(404, "absent")), "not_found");
    assert.equal(classifyAcademyError(new ApiError(409, "dup")), "conflict");
    assert.equal(classifyAcademyError(new ApiError(429, "slow")), "throttled");
    assert.equal(classifyAcademyError(new ApiError(0, "timeout")), "network");
    assert.match(academyErrorMessage(new ApiError(401, "no")), /Reconnectez-vous/);
    assert.match(academyErrorMessage(new ApiError(409, "dup")), /Recommencez/);
    assert.match(academyErrorMessage(new ApiError(0, "Réseau injoignable.")), /pas un paiement/);
    const content = publicExerciseContent({ hint: "unité", is_correct: true });
    assert.deepEqual(content, { hint: "unité" });
  });

  it("permet un retour arrière depuis chaque écran Academy", () => {
    for (const file of [
      "src/screens/AcademyHomeScreen.tsx",
      "src/screens/AcademyCourseScreen.tsx",
      "src/screens/AcademyModuleScreen.tsx",
      "src/screens/AcademyLessonScreen.tsx",
      "src/screens/AcademyQuizScreen.tsx",
      "src/screens/AcademyQuizResultScreen.tsx",
      "src/screens/AcademyProgressScreen.tsx",
    ]) {
      assert.match(readFileSync(file, "utf8"), /goBack/);
    }
    assert.match(ACADEMY_HOME_TITLE, /SmartPay Academy/);
  });

  it("synchronise la progression depuis Django après mutation", () => {
    assert.equal(ACADEMY_PROGRESS_PATH, "/api/v1/academy/me/progress/");
    const home = readFileSync("src/screens/AcademyHomeScreen.tsx", "utf8");
    const lesson = readFileSync("src/screens/AcademyLessonScreen.tsx", "utf8");
    const progress = readFileSync("src/screens/AcademyProgressScreen.tsx", "utf8");
    const service = readFileSync("src/services/academy.ts", "utf8");
    assert.match(service, /fetchAcademyProgress/);
    assert.match(home, /fetchAcademyProgress/);
    assert.match(home, /ACADEMY_RESUME_CTA/);
    assert.match(lesson, /fetchAcademyProgress/);
    assert.match(progress, /fetchAcademyProgress/);
    assert.equal(home.includes("AsyncStorage"), false);
    assert.equal(progress.includes("AsyncStorage"), false);
    assert.equal(lessonStatusLabel("started"), "Commencée");
    assert.equal(lessonStatusLabel("completed"), "Terminée");
    const target = academyResumeTarget({
      kind: "lesson",
      course_slug: "btc",
      module_slug: "intro",
      lesson_slug: "sats",
      title: "BTC",
    });
    assert.deepEqual(target, {
      name: "AcademyLesson",
      params: { courseSlug: "btc", moduleSlug: "intro", lessonSlug: "sats" },
    });
  });

  it("n'introduit aucun paiement Lightning", () => {
    const files = [
      "src/lib/academy.ts",
      "src/services/academy.ts",
      "src/screens/AcademyHomeScreen.tsx",
      "src/screens/AcademyCourseScreen.tsx",
      "src/screens/AcademyModuleScreen.tsx",
      "src/screens/AcademyLessonScreen.tsx",
      "src/screens/AcademyQuizScreen.tsx",
      "src/screens/AcademyQuizResultScreen.tsx",
      "src/screens/AcademyProgressScreen.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      assert.equal(/confirmPayment|createInvoice|previewPayment|createLabCounterpartyInvoice/.test(source), false, file);
      assert.equal(source.includes("/api/v1/payments/"), false, file);
      assert.equal(source.includes("IA.05"), false, file);
    }
    const md = parseAcademyMarkdown("# Titre\n\nUn satoshi.\n\n- A\n- B");
    assert.equal(md[0]?.type, "heading");
    assert.equal(md[1]?.type, "paragraph");
    assert.equal(md[2]?.type, "list");
  });

  it("rend le gras Markdown sans afficher les astérisques", () => {
    const blocks = parseAcademyMarkdown("## Objectifs\n\n**Bitcoin** est un réseau.\n\n- Les **utilisateurs** créent\n- Les nœuds vérifient");
    assert.equal(blocks[0]?.type, "heading");
    assert.equal(blocks[1]?.type, "paragraph");
    assert.equal(blocks[2]?.type, "list");
    const inline = parseAcademyInline("**Bitcoin** est un réseau.");
    assert.deepEqual(inline, [
      { bold: true, text: "Bitcoin" },
      { bold: false, text: " est un réseau." },
    ]);
    assert.equal(inline.map((part) => part.text).join(""), "Bitcoin est un réseau.");
    assert.equal(inline.some((part) => part.text.includes("*")), false);
    const lesson = readFileSync("src/screens/AcademyLessonScreen.tsx", "utf8");
    assert.match(lesson, /parseAcademyInline/);
    assert.match(lesson, /mdBold/);
    assert.equal(lesson.includes("dangerouslySetInnerHTML"), false);
    assert.equal(lesson.includes("<b>"), false);
  });

  it("sépare avancement des leçons et validation de la formation", () => {
    const lessons = academyLessonAdvancement(1, 4);
    assert.deepEqual(lessons, { completed: 1, published: 4, percent: 25 });
    assert.match(academyLessonAdvancementLabel(1, 4), /1\/4 leçons terminées — 25 % d'avancement/);
    assert.equal(academyLessonAdvancement(0, 0).percent, 0);
    assert.match(academyLessonAdvancementLabel(0, 0), /0\/0 leçon terminée — 0 % d'avancement/);
    const validation = academyCourseValidation(0, 1, 0);
    assert.deepEqual(validation, { completed: 0, published: 1, percent: 0 });
    assert.match(academyCourseValidationLabel(0, 1, 0), /0\/1 module validé — 0 % de validation/);
    assert.equal(academyCourseValidation(0, 1, 0).percent, 0);
    const home = readFileSync("src/screens/AcademyHomeScreen.tsx", "utf8");
    const progress = readFileSync("src/screens/AcademyProgressScreen.tsx", "utf8");
    const course = readFileSync("src/screens/AcademyCourseScreen.tsx", "utf8");
    assert.match(home, /academyLessonAdvancementLabel/);
    assert.match(home, /academyCourseValidationLabel/);
    assert.match(progress, /ACADEMY_LESSON_ADVANCEMENT_TITLE/);
    assert.match(progress, /ACADEMY_COURSE_VALIDATION_TITLE/);
    assert.match(progress, /styles\.indicators/);
    assert.match(progress, /Leçons terminées/);
    assert.match(progress, /Meilleure note/);
    assert.equal(progress.includes("progressPercentLabel(summary.progress_percent)"), false);
    assert.match(course, /academyLessonAdvancementLabel/);
    assert.match(course, /academyCourseValidationLabel/);
  });

  it("affiche les actions de leçon selon le statut API", () => {
    assert.equal(academyLessonAction(null), "start");
    assert.equal(academyLessonAction("started"), "complete");
    assert.equal(academyLessonAction("completed"), "done");
    assert.equal(academyLessonStatusFromApi({ status: "started" }), "started");
    assert.equal(academyLessonStatusFromApi({ status: "completed" }), "completed");
    const lesson = readFileSync("src/screens/AcademyLessonScreen.tsx", "utf8");
    assert.match(lesson, /academyLessonAction/);
    assert.match(lesson, /academyLessonStatusFromApi/);
    assert.match(lesson, /ACADEMY_START_LESSON/);
    assert.match(lesson, /ACADEMY_COMPLETE_LESSON/);
    assert.match(lesson, /ACADEMY_LESSON_DONE/);
    assert.match(lesson, /startLock/);
    assert.match(lesson, /completeLock/);
    assert.match(lesson, /action !== "complete"/);
    assert.match(lesson, /action !== "start"/);
    assert.equal(lesson.includes("dangerouslySetInnerHTML"), false);
  });
});
