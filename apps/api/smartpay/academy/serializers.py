from rest_framework import serializers

from smartpay.academy.models import (
    AnswerOption,
    Course,
    Exercise,
    Lesson,
    LessonProgress,
    Module,
    Question,
    Quiz,
    QuizAttempt,
)


class CourseListSerializer(serializers.ModelSerializer):
    published_module_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Course
        fields = ("id", "slug", "title", "summary", "content_version", "published_module_count")
        read_only_fields = fields


class CourseModuleSerializer(serializers.ModelSerializer):
    published_lesson_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Module
        fields = ("id", "slug", "title", "objectives", "order", "published_lesson_count")
        read_only_fields = fields


class CourseDetailSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ("id", "slug", "title", "summary", "content_version", "modules")
        read_only_fields = fields

    def get_modules(self, obj):
        published = self.context.get("published_modules")
        if published is None:
            from smartpay.academy.services import published_modules_for

            published = published_modules_for(obj)
        return CourseModuleSerializer(published, many=True).data


class ModuleLessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ("id", "slug", "title", "difficulty", "duration_minutes", "order")
        read_only_fields = fields


class ModuleDetailSerializer(serializers.ModelSerializer):
    course = serializers.SerializerMethodField()
    lessons = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ("id", "slug", "title", "objectives", "order", "course", "lessons")
        read_only_fields = fields

    def get_course(self, obj) -> dict:
        return {"id": str(obj.course_id), "slug": obj.course.slug, "title": obj.course.title}

    def get_lessons(self, obj):
        published = self.context.get("published_lessons")
        if published is None:
            from smartpay.academy.services import published_lessons_for

            published = published_lessons_for(obj)
        return ModuleLessonSerializer(published, many=True).data


class ExerciseSerializer(serializers.ModelSerializer):
    content = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = ("id", "type", "prompt", "content", "order")
        read_only_fields = fields

    def get_content(self, obj) -> dict:
        raw = obj.content if isinstance(obj.content, dict) else {}
        return {key: value for key, value in raw.items() if key != "is_correct"}


class LessonDetailSerializer(serializers.ModelSerializer):
    module = serializers.SerializerMethodField()
    exercises = ExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = (
            "id",
            "slug",
            "title",
            "body_md",
            "difficulty",
            "duration_minutes",
            "order",
            "module",
            "exercises",
        )
        read_only_fields = fields

    def get_module(self, obj) -> dict:
        return {
            "id": str(obj.module_id),
            "slug": obj.module.slug,
            "title": obj.module.title,
            "course_slug": obj.module.course.slug,
        }


class LessonProgressSerializer(serializers.ModelSerializer):
    lesson_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = LessonProgress
        fields = ("lesson_id", "status", "started_at", "completed_at")
        read_only_fields = fields


class QuizOptionPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = ("id", "label", "order")
        read_only_fields = fields


class QuizQuestionPublicSerializer(serializers.ModelSerializer):
    options = QuizOptionPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ("id", "prompt", "order", "options")
        read_only_fields = fields


class QuizPublicSerializer(serializers.ModelSerializer):
    questions = QuizQuestionPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ("id", "content_version", "pass_score", "questions")
        read_only_fields = fields


class SubmittedAnswerSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    option_id = serializers.UUIDField()


class SubmitQuizAttemptSerializer(serializers.Serializer):
    answers = SubmittedAnswerSerializer(many=True)

    def validate_answers(self, value):
        if len(value) > 40:
            raise serializers.ValidationError("Trop de réponses.")
        return value


class QuizAttemptListSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ("id", "quiz_version", "pass_score", "score_percent", "passed", "created_at")
        read_only_fields = fields


class AcademyResumeSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=("lesson", "quiz", "completed"))
    course_slug = serializers.SlugField()
    module_slug = serializers.SlugField(allow_null=True)
    lesson_slug = serializers.SlugField(allow_null=True)
    title = serializers.CharField()


class AcademyProgressSummarySerializer(serializers.Serializer):
    lessons_started = serializers.IntegerField()
    lessons_completed = serializers.IntegerField()
    lessons_published = serializers.IntegerField()
    modules_completed = serializers.IntegerField()
    modules_published = serializers.IntegerField()
    quiz_attempts = serializers.IntegerField()
    quizzes_passed = serializers.IntegerField()
    best_score_percent = serializers.IntegerField(allow_null=True)
    progress_percent = serializers.IntegerField()
    last_activity_at = serializers.CharField(allow_null=True)
    resume = AcademyResumeSerializer(allow_null=True)


class QuizAttemptDetailSerializer(serializers.ModelSerializer):
    quiz_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = QuizAttempt
        fields = (
            "id",
            "quiz_id",
            "quiz_version",
            "pass_score",
            "score_percent",
            "passed",
            "answers",
            "created_at",
        )
        read_only_fields = fields
