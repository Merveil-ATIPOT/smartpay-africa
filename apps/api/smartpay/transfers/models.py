import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from smartpay.transfers.state import (
    DRAFT,
    FAILED,
    LIGHTNING_SETTLED,
    PAYMENT_PENDING,
    PENDING_RECONCILIATION,
    QUOTED,
    READY,
    SIMULATED_CREDITED,
)

SIMULATION_DISCLAIMER = (
    "SIMULATION UNIQUEMENT. Aucun dépôt FCFA, aucun versement Wave, "
    "Orange Money ou MTN Money, aucune conversion de change réelle."
)

TRANSFER_MODE = "regtest_mobile_money_simulation"
TRANSFER_DISCLAIMER = (
    "Préparation de transfert de démonstration. Aucun paiement Lightning "
    "ni crédit Mobile Money n'est exécuté à ce stade."
)

CREDIT_DISCLAIMER = (
    "Crédit Mobile Money simulé. Aucun opérateur réel n'a été contacté. "
    "Aucun SMS n'a été envoyé. Ceci n'est pas un paiement bancaire."
)


class TransferSimulation(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", _("Créé")
        PENDING = "pending", _("En attente")
        CONFIRMED = "confirmed", _("Confirmé (simulation)")
        FAILED = "failed", _("Échoué")
        EXPIRED = "expired", _("Expiré")

    initiator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="transfer_simulations",
    )
    source_country = models.CharField(max_length=2)
    destination_country = models.CharField(max_length=2)
    amount_sats = models.PositiveBigIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    disclaimer = models.TextField(default=SIMULATION_DISCLAIMER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("simulation de transfert")
        verbose_name_plural = _("simulations de transfert")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount_sats__gte=1),
                name="transfer_amount_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(source_country__in=("SN", "CG", "CI"))
                & models.Q(destination_country__in=("SN", "CG", "CI")),
                name="transfer_supported_countries",
            ),
        ]

    def __str__(self) -> str:
        return f"sim {self.pk} {self.amount_sats} sats"


class Transfer(models.Model):
    """Transfert international — préparation B1, exécution LND réservée à B2."""

    class Status(models.TextChoices):
        DRAFT = DRAFT, _("Brouillon")
        QUOTED = QUOTED, _("Devis calculé")
        READY = READY, _("Informations validées")
        PAYMENT_PENDING = PAYMENT_PENDING, _("Paiement en attente")
        LIGHTNING_SETTLED = LIGHTNING_SETTLED, _("Paiement LND confirmé")
        SIMULATED_CREDITED = SIMULATED_CREDITED, _("Crédit Mobile Money simulé")
        FAILED = FAILED, _("Échec confirmé")
        PENDING_RECONCILIATION = PENDING_RECONCILIATION, _("Réconciliation en attente")

    class CreditStatus(models.TextChoices):
        NONE = "none", _("Aucun")
        SIMULATED = "simulated", _("Crédit simulé")
        FAILED = "failed", _("Échec simulé")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="transfers",
    )
    public_reference = models.CharField(max_length=32, unique=True)
    idempotency_key = models.CharField(max_length=64, blank=True)
    source_country = models.CharField(max_length=2, blank=True)
    destination_country = models.CharField(max_length=2, blank=True)
    currency = models.CharField(max_length=3, blank=True)
    operator = models.CharField(max_length=16, blank=True)
    beneficiary_name = models.CharField(max_length=120, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    reason = models.CharField(max_length=255, blank=True)
    amount_local = models.PositiveBigIntegerField(default=0)
    demo_rate_fcfa_per_btc = models.PositiveBigIntegerField(default=0)
    amount_sats = models.PositiveBigIntegerField(default=0)
    fee_sats = models.PositiveBigIntegerField(default=0)
    total_sats = models.PositiveBigIntegerField(default=0)
    quote_version = models.CharField(max_length=32, blank=True)
    quoted_at = models.DateTimeField(null=True, blank=True)
    quote_expires_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    execution_mode = models.CharField(max_length=48, default=TRANSFER_MODE)
    lightning_payment_id = models.UUIDField(null=True, blank=True)
    lightning_payment_hash = models.CharField(max_length=128, blank=True)
    lightning_settled_at = models.DateTimeField(null=True, blank=True)
    mobile_money_credit_status = models.CharField(
        max_length=16,
        choices=CreditStatus.choices,
        default=CreditStatus.NONE,
    )
    simulated_credit_reference = models.CharField(max_length=64, blank=True)
    invoice_amount_sats = models.PositiveBigIntegerField(default=0)
    lnd_fee_sats_estimated = models.PositiveBigIntegerField(default=0)
    lnd_fee_sats_paid = models.PositiveBigIntegerField(null=True, blank=True)
    total_debited_sats = models.PositiveBigIntegerField(default=0)
    disclaimer = models.TextField(default=TRANSFER_DISCLAIMER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("transfert international")
        verbose_name_plural = _("transferts internationaux")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(execution_mode=TRANSFER_MODE),
                name="transfer_regtest_mm_simulation_only",
            ),
            models.CheckConstraint(
                condition=models.Q(source_country="")
                | models.Q(source_country__in=("SN", "CG", "CI")),
                name="transfer_source_countries",
            ),
            models.CheckConstraint(
                condition=models.Q(destination_country="")
                | models.Q(destination_country__in=("SN", "CI", "CG", "CM", "BJ", "TG")),
                name="transfer_destination_countries",
            ),
            models.UniqueConstraint(
                fields=["owner", "idempotency_key"],
                condition=~models.Q(idempotency_key=""),
                name="transfer_idempotency_per_owner",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "status"], name="transfers_owner_status_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.public_reference} {self.status}"


class TransferAttempt(models.Model):
    """Tentative d'exécution Lightning. Persistée avant tout envoi Alice."""

    class Status(models.TextChoices):
        PREPARED = "prepared", _("Préparée")
        PAYING = "paying", _("Paiement en cours")
        LOOKUP_PENDING = "lookup_pending", _("Lookup en attente")
        SETTLED = "settled", _("Règlement confirmé")
        FAILED = "failed", _("Échec confirmé")
        UNCERTAIN = "uncertain", _("Incertain")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transfer = models.ForeignKey(Transfer, on_delete=models.PROTECT, related_name="attempts")
    idempotency_key = models.CharField(max_length=64)
    invoice_amount_sats = models.PositiveBigIntegerField()
    demo_fee_sats = models.PositiveBigIntegerField(default=0)
    estimated_routing_fee_sats = models.PositiveBigIntegerField(default=0)
    paid_routing_fee_sats = models.PositiveBigIntegerField(null=True, blank=True)
    total_debited_sats = models.PositiveBigIntegerField(default=0)
    encoded_invoice = models.TextField(blank=True)
    payment_hash = models.CharField(max_length=128, blank=True)
    bob_expires_at = models.DateTimeField(null=True, blank=True)
    alice_status = models.CharField(max_length=32, blank=True)
    bob_status = models.CharField(max_length=32, blank=True)
    lightning_payment = models.ForeignKey(
        "payments.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfer_attempts",
    )
    send_attempted = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PREPARED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["transfer", "idempotency_key"],
                name="transfer_attempt_idempotency",
            ),
        ]

    def __str__(self) -> str:
        return f"attempt {self.id} {self.status}"


class SimulatedMobileMoneyCredit(models.Model):
    transfer = models.OneToOneField(
        Transfer,
        on_delete=models.PROTECT,
        related_name="simulated_credit",
    )
    destination_country = models.CharField(max_length=2)
    operator = models.CharField(max_length=16)
    beneficiary_name = models.CharField(max_length=120)
    amount_local = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3)
    reference = models.CharField(max_length=64, unique=True)
    disclaimer = models.TextField(default=CREDIT_DISCLAIMER)
    credited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("crédit Mobile Money simulé")
        verbose_name_plural = _("crédits Mobile Money simulés")

    def __str__(self) -> str:
        return self.reference
