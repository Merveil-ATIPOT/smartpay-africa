# Phase B2 — champs d'exécution et tentatives. Additif, aucune suppression.

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0002_payment_encoded_invoice_and_more"),
        ("transfers", "0002_international_transfer"),
    ]

    operations = [
        migrations.AddField(
            model_name="transfer",
            name="invoice_amount_sats",
            field=models.PositiveBigIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="transfer",
            name="lnd_fee_sats_estimated",
            field=models.PositiveBigIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="transfer",
            name="lnd_fee_sats_paid",
            field=models.PositiveBigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="transfer",
            name="total_debited_sats",
            field=models.PositiveBigIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="TransferAttempt",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("idempotency_key", models.CharField(max_length=64)),
                ("invoice_amount_sats", models.PositiveBigIntegerField()),
                ("demo_fee_sats", models.PositiveBigIntegerField(default=0)),
                ("estimated_routing_fee_sats", models.PositiveBigIntegerField(default=0)),
                ("paid_routing_fee_sats", models.PositiveBigIntegerField(blank=True, null=True)),
                ("total_debited_sats", models.PositiveBigIntegerField(default=0)),
                ("encoded_invoice", models.TextField(blank=True)),
                ("payment_hash", models.CharField(blank=True, max_length=128)),
                ("bob_expires_at", models.DateTimeField(blank=True, null=True)),
                ("alice_status", models.CharField(blank=True, max_length=32)),
                ("bob_status", models.CharField(blank=True, max_length=32)),
                ("send_attempted", models.BooleanField(default=False)),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("prepared", "Préparée"),
                            ("paying", "Paiement en cours"),
                            ("lookup_pending", "Lookup en attente"),
                            ("settled", "Règlement confirmé"),
                            ("failed", "Échec confirmé"),
                            ("uncertain", "Incertain"),
                        ],
                        default="prepared",
                        max_length=24,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "lightning_payment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="transfer_attempts",
                        to="payments.payment",
                    ),
                ),
                (
                    "transfer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="attempts",
                        to="transfers.transfer",
                    ),
                ),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.AddConstraint(
            model_name="transferattempt",
            constraint=models.UniqueConstraint(
                fields=("transfer", "idempotency_key"),
                name="transfer_attempt_idempotency",
            ),
        ),
        migrations.CreateModel(
            name="SimulatedMobileMoneyCredit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("destination_country", models.CharField(max_length=2)),
                ("operator", models.CharField(max_length=16)),
                ("beneficiary_name", models.CharField(max_length=120)),
                ("amount_local", models.PositiveBigIntegerField()),
                ("currency", models.CharField(max_length=3)),
                ("reference", models.CharField(max_length=64, unique=True)),
                (
                    "disclaimer",
                    models.TextField(
                        default=(
                            "Crédit Mobile Money simulé. Aucun opérateur réel n'a été contacté. "
                            "Aucun SMS n'a été envoyé. Ceci n'est pas un paiement bancaire."
                        )
                    ),
                ),
                ("credited_at", models.DateTimeField(auto_now_add=True)),
                (
                    "transfer",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="simulated_credit",
                        to="transfers.transfer",
                    ),
                ),
            ],
            options={
                "verbose_name": "crédit Mobile Money simulé",
                "verbose_name_plural": "crédits Mobile Money simulés",
            },
        ),
    ]
