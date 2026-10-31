from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from smartpay.academy.models import CourseProgress, LessonProgress, QuizAttempt
from smartpay.academy.services import seed_catalog


class Command(BaseCommand):
    help = "Importe le catalogue Academy depuis content/manifest.json. Idempotent. Aucune progression fictive."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Autorise le seed hors DEBUG (usage local uniquement).",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError("seed_academy refusé hors DEBUG. Passez --force seulement en local.")

        before_progress = LessonProgress.objects.count() + QuizAttempt.objects.count() + CourseProgress.objects.count()
        course = seed_catalog()
        after_progress = LessonProgress.objects.count() + QuizAttempt.objects.count() + CourseProgress.objects.count()
        if after_progress != before_progress:
            raise CommandError("seed_academy ne doit pas créer ni modifier de progression.")

        self.stdout.write(
            self.style.SUCCESS(
                f"Catalogue Academy prêt : {course.slug} v{course.content_version} "
                f"(publié={course.is_published})."
            )
        )
