import type { Paginated } from "@smartpay/contracts";

import { collectAllPages } from "../lib/assistantChat";
import {
  academyCoursePath,
  academyLessonCompletePath,
  academyLessonPath,
  academyLessonStartPath,
  academyModulePath,
  academyQuizAttemptsPath,
  academyQuizPath,
  ACADEMY_COURSES_PATH,
  ACADEMY_PROGRESS_PATH,
  type AcademyCourseDetail,
  type AcademyCourseListItem,
  type AcademyProgress,
  type AcademyLessonDetail,
  type AcademyLessonProgress,
  type AcademyModuleDetail,
  type AcademyQuiz,
  type AcademyQuizAttemptDetail,
  type AcademyQuizSelection,
  buildQuizAnswers,
} from "../lib/academy";
import { api } from "./api";

export async function fetchAcademyProgress(): Promise<AcademyProgress> {
  return api.request<AcademyProgress>(ACADEMY_PROGRESS_PATH);
}

export async function listAcademyCourses(): Promise<AcademyCourseListItem[]> {
  return collectAllPages(`${ACADEMY_COURSES_PATH}?page_size=100`, (path) =>
    api.request<Paginated<AcademyCourseListItem>>(path),
  );
}

export async function fetchAcademyCourse(courseSlug: string): Promise<AcademyCourseDetail> {
  return api.request<AcademyCourseDetail>(academyCoursePath(courseSlug));
}

export async function fetchAcademyModule(courseSlug: string, moduleSlug: string): Promise<AcademyModuleDetail> {
  return api.request<AcademyModuleDetail>(academyModulePath(courseSlug, moduleSlug));
}

export async function fetchAcademyLesson(
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
): Promise<AcademyLessonDetail> {
  return api.request<AcademyLessonDetail>(academyLessonPath(courseSlug, moduleSlug, lessonSlug));
}

export async function startAcademyLesson(
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
): Promise<AcademyLessonProgress> {
  return api.request<AcademyLessonProgress>(academyLessonStartPath(courseSlug, moduleSlug, lessonSlug), {
    method: "POST",
    body: {},
  });
}

export async function completeAcademyLesson(
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
): Promise<AcademyLessonProgress> {
  return api.request<AcademyLessonProgress>(academyLessonCompletePath(courseSlug, moduleSlug, lessonSlug), {
    method: "POST",
    body: {},
  });
}

export async function fetchAcademyQuiz(courseSlug: string, moduleSlug: string): Promise<AcademyQuiz> {
  return api.request<AcademyQuiz>(academyQuizPath(courseSlug, moduleSlug));
}

export async function submitAcademyQuizAttempt(input: {
  courseSlug: string;
  moduleSlug: string;
  quizId: string;
  selected: AcademyQuizSelection;
  idempotencyKey: string;
}): Promise<AcademyQuizAttemptDetail> {
  return api.request<AcademyQuizAttemptDetail>(
    academyQuizAttemptsPath(input.courseSlug, input.moduleSlug, input.quizId),
    {
      method: "POST",
      headers: { "Idempotency-Key": input.idempotencyKey },
      body: { answers: buildQuizAnswers(input.selected) },
    },
  );
}
