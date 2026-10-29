from django.db import models
from django.utils.translation import gettext_lazy as _

PLACEHOLDER_DISCLAIMER = (
    "Placeholder P01. Ce n'est PAS un taux de marché. "
    "Aucune conversion BTC/FCFA réelle n'est effectuée."
)


class ExchangeRate(models.Model):
    """Enregistrement explicite d'absence de taux réel."""

    pair = models.CharField(max_length=32, unique=True)
    is_placeholder = models.BooleanField(default=True)
    source = models.CharField(max_length=64, default="not_a_market_rate")
    value = models.DecimalField(max_digits=24, decimal_places=8, null=True, blank=True)
    disclaimer = models.TextField(default=PLACEHOLDER_DISCLAIMER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("taux de change placeholder")
        verbose_name_plural = _("taux de change placeholders")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(is_placeholder=True) & models.Q(value__isnull=True),
                name="exchange_rate_must_be_placeholder",
            )
        ]

    def __str__(self) -> str:
        return f"{self.pair} (placeholder)"
