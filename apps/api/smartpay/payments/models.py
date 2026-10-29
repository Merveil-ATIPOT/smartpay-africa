from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Payment(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", _("Créé")
        PENDING = "pending", _("En attente")
        CONFIRMED = "confirmed", _("Confirmé (métier)")
        FAILED = "failed", _("Échoué")
        EXPIRED = "expired", _("Expiré")

    class SettlementMode(models.TextChoices):
        MOCK = "mock", _("Mock — pas un règlement Lightning")
        LIGHTNING_REGTEST = "lightning_regtest", _("Lightning Regtest")

    class Direction(models.TextChoices):
        INCOMING = "incoming", _("Entrant (facture)")
        OUTGOING = "outgoing", _("Sortant")

    class Network(models.TextChoices):
        REGTEST = "regtest", _("Bitcoin Regtest")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    merchant = models.ForeignKey(
        "merchants.Merchant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    amount_sats = models.PositiveBigIntegerField()
    description = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    settlement_mode = models.CharField(
        max_length=32,
        choices=SettlementMode.choices,
        default=SettlementMode.MOCK,
    )
    is_lightning_settled = models.BooleanField(default=False)
    network = models.CharField(max_length=16, choices=Network.choices, default=Network.REGTEST)
    direction = models.CharField(max_length=16, choices=Direction.choices)
    idempotency_key = models.CharField(max_length=64, blank=True)
    provider_reference = models.CharField(max_length=128, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount_sats__gte=1),
                name="payment_amount_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(network="regtest"),
                name="payment_regtest_only",
            ),
            models.CheckConstraint(
                condition=~models.Q(settlement_mode="mock", is_lightning_settled=True),
                name="mock_cannot_be_lightning_settled",
            ),
            models.UniqueConstraint(
                fields=["owner", "idempotency_key"],
                condition=~models.Q(idempotency_key=""),
                name="payment_idempotency_per_owner",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["settlement_mode", "is_lightning_settled"]),
        ]

    def __str__(self) -> str:
        return f"{self.id} {self.status} {self.amount_sats} sats"


class PaymentInvoice(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="invoice")
    encoded_invoice = models.TextField()
    payment_hash = models.CharField(max_length=128)
    memo = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField()
    is_mock = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("facture de paiement")
        verbose_name_plural = _("factures de paiement")

    def __str__(self) -> str:
        return self.payment_hash
