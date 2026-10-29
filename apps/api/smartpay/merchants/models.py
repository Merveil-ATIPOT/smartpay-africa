from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Merchant(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", _("Brouillon")
        ACTIVE = "active", _("Actif")
        SUSPENDED = "suspended", _("Suspendu")

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="merchants",
    )
    legal_name = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255)
    country = models.CharField(max_length=2)
    registration_number = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("commerçant")
        verbose_name_plural = _("commerçants")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(country__in=("SN", "CG", "CI")),
                name="merchant_supported_country",
            )
        ]

    def __str__(self) -> str:
        return self.display_name
