from django.contrib import admin

from smartpay.academy.models import Course, Exercise, Lesson, Module, Question, Quiz


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_published", "content_version", "updated_at")
    search_fields = ("slug", "title")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "order", "is_published")
    list_filter = ("course", "is_published")
    search_fields = ("slug", "title")


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("title", "module", "order", "difficulty", "is_published")
    list_filter = ("difficulty", "is_published")
    search_fields = ("slug", "title")


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ("lesson", "type", "order")


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("module", "pass_score", "content_version", "is_published")


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("quiz", "order")


# LessonProgress, QuizAttempt et CourseProgress ne sont pas exposés ici :
# un staff ne doit pas attribuer un score à un autre compte.
