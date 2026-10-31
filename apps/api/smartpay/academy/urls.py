from django.urls import path

from smartpay.academy.views import (
    CourseDetailView,
    CourseListView,
    LessonCompleteView,
    LessonDetailView,
    LessonStartView,
    ModuleDetailView,
    MyAcademyProgressView,
    QuizAttemptDetailView,
    QuizAttemptListCreateView,
    QuizDetailView,
)

urlpatterns = [
    path("academy/me/progress/", MyAcademyProgressView.as_view(), name="academy-me-progress"),
    path("academy/courses/", CourseListView.as_view(), name="academy-courses"),
    path("academy/courses/<slug:course_slug>/", CourseDetailView.as_view(), name="academy-course-detail"),
    path(
        "academy/courses/<slug:course_slug>/modules/<slug:module_slug>/",
        ModuleDetailView.as_view(),
        name="academy-module-detail",
    ),
    path(
        "academy/courses/<slug:course_slug>/modules/<slug:module_slug>/lessons/<slug:lesson_slug>/",
        LessonDetailView.as_view(),
        name="academy-lesson-detail",
    ),
    path(
        "academy/courses/<slug:course_slug>/modules/<slug:module_slug>/lessons/<slug:lesson_slug>/start/",
        LessonStartView.as_view(),
        name="academy-lesson-start",
    ),
    path(
        "academy/courses/<slug:course_slug>/modules/<slug:module_slug>/lessons/<slug:lesson_slug>/complete/",
        LessonCompleteView.as_view(),
        name="academy-lesson-complete",
    ),
    path(
        "academy/courses/<slug:course_slug>/modules/<slug:module_slug>/quizzes/",
        QuizDetailView.as_view(),
        name="academy-quiz-detail",
    ),
    path(
        "academy/courses/<slug:course_slug>/modules/<slug:module_slug>/quizzes/<uuid:quiz_id>/attempts/",
        QuizAttemptListCreateView.as_view(),
        name="academy-quiz-attempts",
    ),
    path(
        "academy/courses/<slug:course_slug>/modules/<slug:module_slug>/quizzes/<uuid:quiz_id>/attempts/<uuid:attempt_id>/",
        QuizAttemptDetailView.as_view(),
        name="academy-quiz-attempt-detail",
    ),
]
