from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=80, unique=True)
    title = models.CharField(max_length=160)
    summary = models.TextField(blank=True)
    content_version = models.PositiveIntegerField(default=1)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("title",)
        constraints = [
            models.CheckConstraint(condition=models.Q(content_version__gte=1), name="academy_course_version_min"),
        ]

    def __str__(self) -> str:
        return self.title


class Module(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    slug = models.SlugField(max_length=80)
    title = models.CharField(max_length=160)
    objectives = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "slug")
        constraints = [
            models.UniqueConstraint(fields=["course", "slug"], name="academy_module_slug_per_course"),
            models.UniqueConstraint(fields=["course", "order"], name="academy_module_order_per_course"),
            models.CheckConstraint(condition=models.Q(order__gte=1), name="academy_module_order_min"),
        ]

    def __str__(self) -> str:
        return f"{self.course.slug}:{self.slug}"


class Lesson(models.Model):
    class Difficulty(models.TextChoices):
        INTRO = "intro", _("Introduction")
        BASE = "base", _("Base")
        ADVANCED = "approfondi", _("Approfondi")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="lessons")
    slug = models.SlugField(max_length=80)
    title = models.CharField(max_length=160)
    body_md = models.TextField(blank=True)
    difficulty = models.CharField(max_length=16, choices=Difficulty.choices, default=Difficulty.INTRO)
    duration_minutes = models.PositiveIntegerField(default=5)
    order = models.PositiveIntegerField()
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "slug")
        constraints = [
            models.UniqueConstraint(fields=["module", "slug"], name="academy_lesson_slug_per_module"),
            models.UniqueConstraint(fields=["module", "order"], name="academy_lesson_order_per_module"),
            models.CheckConstraint(condition=models.Q(order__gte=1), name="academy_lesson_order_min"),
            models.CheckConstraint(condition=models.Q(duration_minutes__gte=1), name="academy_lesson_duration_min"),
        ]

    def __str__(self) -> str:
        return self.title


class Exercise(models.Model):
    class Kind(models.TextChoices):
        REFLECTION = "reflection", _("Réflexion")
        IDENTIFY = "identify", _("Identification")
        NAVIGATE = "navigate", _("Parcours guidé")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="exercises")
    type = models.CharField(max_length=16, choices=Kind.choices, default=Kind.REFLECTION)
    prompt = models.TextField()
    content = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ("order",)
        constraints = [
            models.UniqueConstraint(fields=["lesson", "order"], name="academy_exercise_order_per_lesson"),
            models.CheckConstraint(condition=models.Q(order__gte=1), name="academy_exercise_order_min"),
        ]

    def __str__(self) -> str:
        return f"{self.lesson.slug}:{self.order}"


class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="quizzes")
    content_version = models.PositiveIntegerField(default=1)
    pass_score = models.PositiveIntegerField(default=70)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("module__order",)
        constraints = [
            models.UniqueConstraint(fields=["module"], name="academy_one_quiz_per_module"),
            models.CheckConstraint(condition=models.Q(content_version__gte=1), name="academy_quiz_version_min"),
            models.CheckConstraint(
                condition=models.Q(pass_score__gte=1) & models.Q(pass_score__lte=100),
                name="academy_quiz_pass_score_range",
            ),
        ]

    def __str__(self) -> str:
        return f"quiz:{self.module.slug}"


class Question(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    prompt = models.TextField()
    explanation = models.TextField(blank=True)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ("order",)
        constraints = [
            models.UniqueConstraint(fields=["quiz", "order"], name="academy_question_order_per_quiz"),
            models.CheckConstraint(condition=models.Q(order__gte=1), name="academy_question_order_min"),
        ]

    def __str__(self) -> str:
        return f"q{self.order}:{self.quiz_id}"


class AnswerOption(models.Model):
    """is_correct ne doit pas figurer dans un GET public avant soumission (IA.05.4)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    label = models.CharField(max_length=240)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("order", "id")
        constraints = [
            models.UniqueConstraint(fields=["question", "order"], name="academy_option_order_per_question"),
            models.CheckConstraint(condition=models.Q(order__gte=1), name="academy_option_order_min"),
        ]

    def __str__(self) -> str:
        return self.label


class LessonProgress(models.Model):
    class Status(models.TextChoices):
        STARTED = "started", _("Commencée")
        COMPLETED = "completed", _("Terminée")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="academy_lesson_progress",
    )
    lesson = models.ForeignKey(Lesson, on_delete=models.PROTECT, related_name="progress_rows")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.STARTED)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["owner", "lesson"], name="academy_lesson_progress_unique"),
            models.CheckConstraint(
                condition=(
                    models.Q(status="started", completed_at__isnull=True)
                    | models.Q(status="completed", completed_at__isnull=False)
                ),
                name="academy_lesson_progress_status_coherent",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "status"]),
        ]

    def mark_completed(self) -> None:
        self.status = self.Status.COMPLETED
        self.completed_at = self.completed_at or timezone.now()

    def __str__(self) -> str:
        return f"{self.owner_id}:{self.lesson_id}:{self.status}"


class QuizAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="academy_quiz_attempts",
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.PROTECT, related_name="attempts")
    quiz_version = models.PositiveIntegerField()
    pass_score = models.PositiveIntegerField(default=70)
    answers = models.JSONField(default=list, blank=True)
    score_percent = models.PositiveIntegerField()
    passed = models.BooleanField()
    idempotency_key = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.CheckConstraint(condition=models.Q(quiz_version__gte=1), name="academy_attempt_version_min"),
            models.CheckConstraint(
                condition=models.Q(score_percent__lte=100),
                name="academy_attempt_score_max",
            ),
            models.CheckConstraint(
                condition=models.Q(pass_score__gte=1) & models.Q(pass_score__lte=100),
                name="academy_attempt_pass_score_range",
            ),
            models.UniqueConstraint(
                fields=["owner", "quiz", "idempotency_key"],
                condition=~models.Q(idempotency_key=""),
                name="academy_attempt_idempotency_per_owner_quiz",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "quiz", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.owner_id}:{self.quiz_id}:{self.score_percent}"


class CourseProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="academy_course_progress",
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="progress_rows")
    percent = models.PositiveIntegerField(default=0)
    last_lesson = models.ForeignKey(
        Lesson,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    last_activity_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["owner", "course"], name="academy_course_progress_unique"),
            models.CheckConstraint(condition=models.Q(percent__lte=100), name="academy_course_percent_max"),
        ]
        indexes = [
            models.Index(fields=["owner", "-last_activity_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.owner_id}:{self.course.slug}:{self.percent}"
