from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.academy.permissions import IsAcademyOwner
from smartpay.academy.progress import compute_owner_progress
from smartpay.academy.serializers import (
    AcademyProgressSummarySerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    LessonDetailSerializer,
    LessonProgressSerializer,
    ModuleDetailSerializer,
    QuizAttemptDetailSerializer,
    QuizAttemptListSerializer,
    QuizPublicSerializer,
    SubmitQuizAttemptSerializer,
)
from smartpay.academy.services import (
    MAX_QUIZ_PAYLOAD_BYTES,
    complete_lesson,
    get_owned_attempt,
    get_published_course,
    get_published_lesson,
    get_published_module,
    get_published_quiz,
    owned_attempts,
    published_courses,
    published_lessons_for,
    published_modules_for,
    resolve_quiz_idempotency_key,
    start_lesson,
    submit_quiz_attempt,
)
from smartpay.academy.throttling import AcademyQuizAttemptRateThrottle
from smartpay.core.pagination import SmartPayPagination


class CourseListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: CourseListSerializer(many=True)})
    def get(self, request):
        paginator = SmartPayPagination()
        page = paginator.paginate_queryset(published_courses(), request)
        return paginator.get_paginated_response(CourseListSerializer(page, many=True).data)


class CourseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: CourseDetailSerializer})
    def get(self, request, course_slug):
        course = get_published_course(course_slug)
        return Response(
            CourseDetailSerializer(
                course,
                context={"published_modules": published_modules_for(course)},
            ).data
        )


class ModuleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ModuleDetailSerializer})
    def get(self, request, course_slug, module_slug):
        module = get_published_module(course_slug, module_slug)
        return Response(
            ModuleDetailSerializer(
                module,
                context={"published_lessons": published_lessons_for(module)},
            ).data
        )


class LessonDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: LessonDetailSerializer})
    def get(self, request, course_slug, module_slug, lesson_slug):
        lesson = get_published_lesson(course_slug, module_slug, lesson_slug)
        return Response(LessonDetailSerializer(lesson).data)


class LessonStartView(APIView):
    permission_classes = [IsAuthenticated, IsAcademyOwner]

    @extend_schema(responses={200: LessonProgressSerializer})
    def post(self, request, course_slug, module_slug, lesson_slug):
        lesson = get_published_lesson(course_slug, module_slug, lesson_slug)
        progress = start_lesson(user=request.user, lesson=lesson)
        return Response(LessonProgressSerializer(progress).data)


class LessonCompleteView(APIView):
    permission_classes = [IsAuthenticated, IsAcademyOwner]

    @extend_schema(responses={200: LessonProgressSerializer})
    def post(self, request, course_slug, module_slug, lesson_slug):
        lesson = get_published_lesson(course_slug, module_slug, lesson_slug)
        progress = complete_lesson(user=request.user, lesson=lesson)
        return Response(LessonProgressSerializer(progress).data, status=status.HTTP_200_OK)


class QuizDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: QuizPublicSerializer})
    def get(self, request, course_slug, module_slug):
        quiz = get_published_quiz(course_slug, module_slug)
        return Response(QuizPublicSerializer(quiz).data)


class QuizAttemptListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAcademyOwner]

    def get_throttles(self):
        if self.request.method == "POST":
            return [AcademyQuizAttemptRateThrottle()]
        return []

    @extend_schema(responses={200: QuizAttemptListSerializer(many=True)})
    def get(self, request, course_slug, module_slug, quiz_id):
        quiz = get_published_quiz(course_slug, module_slug, quiz_id)
        paginator = SmartPayPagination()
        page = paginator.paginate_queryset(owned_attempts(user=request.user, quiz=quiz), request)
        return paginator.get_paginated_response(QuizAttemptListSerializer(page, many=True).data)

    @extend_schema(request=SubmitQuizAttemptSerializer, responses={201: QuizAttemptDetailSerializer})
    def post(self, request, course_slug, module_slug, quiz_id):
        raw = request.body or b""
        if len(raw) > MAX_QUIZ_PAYLOAD_BYTES:
            return Response(
                {"answers": ["Le payload de soumission est trop volumineux."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quiz = get_published_quiz(course_slug, module_slug, quiz_id)
        serializer = SubmitQuizAttemptSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        attempt, replayed = submit_quiz_attempt(
            user=request.user,
            quiz=quiz,
            answers=serializer.validated_data["answers"],
            idempotency_key=resolve_quiz_idempotency_key(request),
        )
        payload = QuizAttemptDetailSerializer(attempt).data
        code = status.HTTP_200_OK if replayed else status.HTTP_201_CREATED
        return Response(payload, status=code)


class QuizAttemptDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAcademyOwner]

    @extend_schema(responses={200: QuizAttemptDetailSerializer})
    def get(self, request, course_slug, module_slug, quiz_id, attempt_id):
        quiz = get_published_quiz(course_slug, module_slug, quiz_id)
        attempt = get_owned_attempt(user=request.user, quiz=quiz, attempt_id=attempt_id)
        return Response(QuizAttemptDetailSerializer(attempt).data)


class MyAcademyProgressView(APIView):
    permission_classes = [IsAuthenticated, IsAcademyOwner]

    @extend_schema(responses={200: AcademyProgressSummarySerializer})
    def get(self, request):
        return Response(compute_owner_progress(request.user))
