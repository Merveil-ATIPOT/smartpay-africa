from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

SIMULATION_DISCLAIMER = (
    "SIMULATION UNIQUEMENT. Aucun dépôt FCFA, aucun versement Wave, "
    "Orange Money ou MTN Money, aucune conversion de change réelle."
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
