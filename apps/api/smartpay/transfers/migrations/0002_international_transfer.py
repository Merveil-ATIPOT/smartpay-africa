# Generated manually for Phase B1 — table additive, aucune altération de TransferSimulation.

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("transfers", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Transfer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("public_reference", models.CharField(max_length=32, unique=True)),
                ("idempotency_key", models.CharField(blank=True, max_length=64)),
                ("source_country", models.CharField(blank=True, max_length=2)),
                ("destination_country", models.CharField(blank=True, max_length=2)),
                ("currency", models.CharField(blank=True, max_length=3)),
                ("operator", models.CharField(blank=True, max_length=16)),
                ("beneficiary_name", models.CharField(blank=True, max_length=120)),
                ("phone_number", models.CharField(blank=True, max_length=20)),
                ("reason", models.CharField(blank=True, max_length=255)),
                ("amount_local", models.PositiveBigIntegerField(default=0)),
                ("demo_rate_fcfa_per_btc", models.PositiveBigIntegerField(default=0)),
                ("amount_sats", models.PositiveBigIntegerField(default=0)),
                ("fee_sats", models.PositiveBigIntegerField(default=0)),
                ("total_sats", models.PositiveBigIntegerField(default=0)),
                ("quote_version", models.CharField(blank=True, max_length=32)),
                ("quoted_at", models.DateTimeField(blank=True, null=True)),
                ("quote_expires_at", models.DateTimeField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Brouillon"),
                            ("quoted", "Devis calculé"),
                            ("ready", "Informations validées"),
                            ("payment_pending", "Paiement en attente"),
                            ("lightning_settled", "Paiement LND confirmé"),
                            ("simulated_credited", "Crédit Mobile Money simulé"),
                            ("failed", "Échec confirmé"),
                            ("pending_reconciliation", "Réconciliation en attente"),
                        ],
                        default="draft",
                        max_length=32,
                    ),
                ),
                (
                    "execution_mode",
                    models.CharField(default="regtest_mobile_money_simulation", max_length=48),
                ),
                ("lightning_payment_id", models.UUIDField(blank=True, null=True)),
                ("lightning_payment_hash", models.CharField(blank=True, max_length=128)),
                ("lightning_settled_at", models.DateTimeField(blank=True, null=True)),
                (
                    "mobile_money_credit_status",
                    models.CharField(
                        choices=[
                            ("none", "Aucun"),
                            ("simulated", "Crédit simulé"),
                            ("failed", "Échec simulé"),
                        ],
                        default="none",
                        max_length=16,
                    ),
                ),
                ("simulated_credit_reference", models.CharField(blank=True, max_length=64)),
                (
                    "disclaimer",
                    models.TextField(
                        default=(
                            "Préparation de transfert de démonstration. Aucun paiement Lightning "
                            "ni crédit Mobile Money n'est exécuté à ce stade."
                        )
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="transfers",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "transfert international",
                "verbose_name_plural": "transferts internationaux",
                "ordering": ("-created_at",),
            },
        ),
        migrations.AddConstraint(
            model_name="transfer",
            constraint=models.CheckConstraint(
                condition=models.Q(("execution_mode", "regtest_mobile_money_simulation")),
                name="transfer_regtest_mm_simulation_only",
            ),
        ),
        migrations.AddConstraint(
            model_name="transfer",
            constraint=models.CheckConstraint(
                condition=models.Q(("source_country", ""))
                | models.Q(("source_country__in", ("SN", "CG", "CI"))),
                name="transfer_source_countries",
            ),
        ),
        migrations.AddConstraint(
            model_name="transfer",
            constraint=models.CheckConstraint(
                condition=models.Q(("destination_country", ""))
                | models.Q(("destination_country__in", ("SN", "CI", "CG", "CM", "BJ", "TG"))),
                name="transfer_destination_countries",
            ),
        ),
        migrations.AddConstraint(
            model_name="transfer",
            constraint=models.UniqueConstraint(
                condition=models.Q(("idempotency_key", ""), _negated=True),
                fields=("owner", "idempotency_key"),
                name="transfer_idempotency_per_owner",
            ),
        ),
        migrations.AddIndex(
            model_name="transfer",
            index=models.Index(fields=["owner", "status"], name="transfers_owner_status_idx"),
        ),
    ]
