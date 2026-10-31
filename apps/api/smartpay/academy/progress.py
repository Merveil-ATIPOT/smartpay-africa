"""Progression Academy calculée depuis LessonProgress et QuizAttempt. Lecture seule."""

from __future__ import annotations

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from smartpay.academy.models import Course, CourseProgress, Lesson, LessonProgress, Module, Quiz, QuizAttempt
from smartpay.academy.scoring import compute_score_percent


def _iso(value):
    return value.isoformat() if value is not None else None


def _module_has_content(module: Module) -> bool:
    return bool(module.published_lessons or module.published_quiz)


def _lesson_status(row: LessonProgress | None) -> str | None:
    if row is None:
        return None
    return row.status


def _best_score(attempts: list[QuizAttempt]) -> int | None:
    if not attempts:
        return None
    return max(item.score_percent for item in attempts)


def _quiz_passed(attempts: list[QuizAttempt]) -> bool:
    return any(item.passed for item in attempts)


def _last_activity(*values):
    present = [item for item in values if item is not None]
    return max(present) if present else None


def _resume_for_course(*, course, progress_by_lesson, attempts_by_quiz) -> dict:
    for module in course.published_modules:
        if not _module_has_content(module):
            continue
        started = []
        unfinished = []
        for lesson in module.published_lessons:
            status = _lesson_status(progress_by_lesson.get(lesson.id))
            if status == LessonProgress.Status.STARTED:
                started.append(lesson)
            if status != LessonProgress.Status.COMPLETED:
                unfinished.append(lesson)
        if started:
            lesson = started[0]
            return {
                "kind": "lesson",
                "course_slug": course.slug,
                "module_slug": module.slug,
                "lesson_slug": lesson.slug,
                "title": lesson.title,
            }
        if unfinished:
            lesson = unfinished[0]
            return {
                "kind": "lesson",
                "course_slug": course.slug,
                "module_slug": module.slug,
                "lesson_slug": lesson.slug,
                "title": lesson.title,
            }
        quiz = module.published_quiz
        if quiz and not _quiz_passed(attempts_by_quiz.get(quiz.id, [])):
            return {
                "kind": "quiz",
                "course_slug": course.slug,
                "module_slug": module.slug,
                "lesson_slug": None,
                "title": f"Quiz · {module.title}",
            }
    return {
        "kind": "completed",
        "course_slug": course.slug,
        "module_slug": None,
        "lesson_slug": None,
        "title": course.title,
    }


def _build_module(*, module, progress_by_lesson, attempts_by_quiz) -> dict:
    lessons = []
    completed_lessons = 0
    started_lessons = 0
    last_at = None
    for lesson in module.published_lessons:
        row = progress_by_lesson.get(lesson.id)
        status = _lesson_status(row)
        if status:
            started_lessons += 1
        if status == LessonProgress.Status.COMPLETED:
            completed_lessons += 1
        if row:
            last_at = _last_activity(last_at, row.started_at, row.completed_at)
        lessons.append(
            {
                "slug": lesson.slug,
                "title": lesson.title,
                "order": lesson.order,
                "status": status,
            }
        )
    quiz = module.published_quiz
    attempts = attempts_by_quiz.get(quiz.id, []) if quiz else []
    if attempts:
        last_at = _last_activity(last_at, max(item.created_at for item in attempts))
    quiz_required = quiz is not None
    quiz_passed = _quiz_passed(attempts) if quiz_required else True
    lessons_done = completed_lessons == len(module.published_lessons)
    has_content = _module_has_content(module)
    completed = has_content and lessons_done and quiz_passed
    return {
        "slug": module.slug,
        "title": module.title,
        "order": module.order,
        "completed": completed,
        "lessons_started": started_lessons,
        "lessons_completed": completed_lessons,
        "lessons_published": len(module.published_lessons),
        "quiz_required": quiz_required,
        "quiz_passed": bool(quiz and _quiz_passed(attempts)),
        "quiz_attempts": len(attempts),
        "best_score_percent": _best_score(attempts),
        "last_activity_at": _iso(last_at),
        "lessons": lessons,
    }


def _build_course(*, course, progress_by_lesson, attempts_by_quiz) -> dict:
    modules = []
    content_modules = []
    for module in course.published_modules:
        payload = _build_module(
            module=module,
            progress_by_lesson=progress_by_lesson,
            attempts_by_quiz=attempts_by_quiz,
        )
        modules.append(payload)
        if _module_has_content(module):
            content_modules.append(payload)

    published_modules = len(content_modules)
    completed_modules = sum(1 for item in content_modules if item["completed"])
    progress_percent = compute_score_percent(completed_modules, published_modules)
    lessons_started = sum(item["lessons_started"] for item in modules)
    lessons_completed = sum(item["lessons_completed"] for item in modules)
    lessons_published = sum(item["lessons_published"] for item in modules)
    quiz_attempts = sum(item["quiz_attempts"] for item in modules)
    quizzes_passed = sum(1 for item in modules if item["quiz_required"] and item["quiz_passed"])
    scores = [item["best_score_percent"] for item in modules if item["best_score_percent"] is not None]
    last_at = None
    for item in modules:
        if item["last_activity_at"]:
            last_at = _last_activity(last_at, item["last_activity_at"])
    resume = _resume_for_course(
        course=course,
        progress_by_lesson=progress_by_lesson,
        attempts_by_quiz=attempts_by_quiz,
    )
    completed = published_modules > 0 and completed_modules == published_modules
    return {
        "id": str(course.id),
        "slug": course.slug,
        "title": course.title,
        "lessons_started": lessons_started,
        "lessons_completed": lessons_completed,
        "lessons_published": lessons_published,
        "modules_completed": completed_modules,
        "modules_published": published_modules,
        "quiz_attempts": quiz_attempts,
        "quizzes_passed": quizzes_passed,
        "best_score_percent": max(scores) if scores else None,
        "progress_percent": progress_percent,
        "completed": completed,
        "last_activity_at": last_at if isinstance(last_at, str) else _iso(last_at),
        "resume": resume,
        "modules": modules,
    }


def _attach_published_graph(courses: list[Course]) -> None:
    modules = list(Module.objects.filter(course__in=courses, is_published=True).order_by("order", "slug"))
    lessons = list(Lesson.objects.filter(module__in=modules, is_published=True).order_by("order", "slug"))
    quizzes = list(Quiz.objects.filter(module__in=modules, is_published=True))
    lessons_by_module: dict = {module.id: [] for module in modules}
    quizzes_by_module: dict = {}
    for lesson in lessons:
        lessons_by_module.setdefault(lesson.module_id, []).append(lesson)
    for quiz in quizzes:
        quizzes_by_module[quiz.module_id] = quiz
    modules_by_course: dict = {course.id: [] for course in courses}
    for module in modules:
        module.published_lessons = lessons_by_module.get(module.id, [])
        module.published_quiz = quizzes_by_module.get(module.id)
        modules_by_course.setdefault(module.course_id, []).append(module)
    for course in courses:
        course.published_modules = modules_by_course.get(course.id, [])


def compute_owner_progress(user) -> dict:
    courses = list(Course.objects.filter(is_published=True).order_by("title", "slug"))
    _attach_published_graph(courses)
    lesson_ids = [
        lesson.id
        for course in courses
        for module in course.published_modules
        for lesson in module.published_lessons
    ]
    quiz_ids = [
        module.published_quiz.id
        for course in courses
        for module in course.published_modules
        if module.published_quiz
    ]
    progress_by_lesson = {
        row.lesson_id: row
        for row in LessonProgress.objects.filter(owner=user, lesson_id__in=lesson_ids)
    }
    attempts_by_quiz: dict[object, list[QuizAttempt]] = {quiz_id: [] for quiz_id in quiz_ids}
    for attempt in QuizAttempt.objects.filter(owner=user, quiz_id__in=quiz_ids).order_by("created_at"):
        attempts_by_quiz.setdefault(attempt.quiz_id, []).append(attempt)

    course_payloads = [
        _build_course(
            course=course,
            progress_by_lesson=progress_by_lesson,
            attempts_by_quiz=attempts_by_quiz,
        )
        for course in courses
    ]
    published_modules = sum(item["modules_published"] for item in course_payloads)
    completed_modules = sum(item["modules_completed"] for item in course_payloads)
    scores = [item["best_score_percent"] for item in course_payloads if item["best_score_percent"] is not None]
    last_at = None
    for item in course_payloads:
        if item["last_activity_at"]:
            last_at = _last_activity(last_at, item["last_activity_at"])
    resume = None
    active = [item for item in course_payloads if not item["completed"] and item["last_activity_at"]]
    if active:
        resume = max(active, key=lambda item: item["last_activity_at"] or "")["resume"]
    else:
        pending = next((item for item in course_payloads if not item["completed"]), None)
        resume = pending["resume"] if pending else None
        if resume is None and course_payloads:
            resume = course_payloads[0]["resume"]
    return {
        "summary": {
            "lessons_started": sum(item["lessons_started"] for item in course_payloads),
            "lessons_completed": sum(item["lessons_completed"] for item in course_payloads),
            "lessons_published": sum(item["lessons_published"] for item in course_payloads),
            "modules_completed": completed_modules,
            "modules_published": published_modules,
            "quiz_attempts": sum(item["quiz_attempts"] for item in course_payloads),
            "quizzes_passed": sum(item["quizzes_passed"] for item in course_payloads),
            "best_score_percent": max(scores) if scores else None,
            "progress_percent": compute_score_percent(completed_modules, published_modules),
            "last_activity_at": last_at if isinstance(last_at, str) else _iso(last_at),
            "resume": resume,
        },
        "courses": course_payloads,
    }


def _as_datetime(value):
    if value in (None, ""):
        return None
    if isinstance(value, str):
        return parse_datetime(value)
    return value


def persist_course_progress(*, user, course: Course) -> CourseProgress:
    payload = compute_owner_progress(user)
    current = next((item for item in payload["courses"] if item["slug"] == course.slug), None)
    existing = CourseProgress.objects.filter(owner=user, course=course).first()
    last_lesson = None
    if current and current["resume"]["kind"] == "lesson" and current["resume"]["lesson_slug"]:
        last_lesson = Lesson.objects.filter(
            slug=current["resume"]["lesson_slug"],
            module__slug=current["resume"]["module_slug"],
            module__course=course,
        ).first()
    completed_at = None
    if current and current["completed"]:
        completed_at = existing.completed_at if existing and existing.completed_at else timezone.now()
    row, _ = CourseProgress.objects.update_or_create(
        owner=user,
        course=course,
        defaults={
            "percent": current["progress_percent"] if current else 0,
            "last_activity_at": _as_datetime(current["last_activity_at"]) if current else None,
            "completed_at": completed_at,
            "last_lesson": last_lesson,
        },
    )
    return row
