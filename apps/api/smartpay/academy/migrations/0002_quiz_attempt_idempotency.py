from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("academy", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="quizattempt",
            name="pass_score",
            field=models.PositiveIntegerField(default=70),
        ),
        migrations.AddField(
            model_name="quizattempt",
            name="idempotency_key",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddConstraint(
            model_name="quizattempt",
            constraint=models.CheckConstraint(
                condition=models.Q(pass_score__gte=1) & models.Q(pass_score__lte=100),
                name="academy_attempt_pass_score_range",
            ),
        ),
        migrations.AddConstraint(
            model_name="quizattempt",
            constraint=models.UniqueConstraint(
                fields=("owner", "quiz", "idempotency_key"),
                condition=models.Q(("idempotency_key", ""), _negated=True),
                name="academy_attempt_idempotency_per_owner_quiz",
            ),
        ),
    ]
