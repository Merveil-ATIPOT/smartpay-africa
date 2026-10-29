from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class WalletConnection(models.Model):
    """Liaison publique à un portefeuille.

    Interdit : seed, clé privée, macaroon, mot de passe nœud.
    Autorisé : identifiant public, alias, pubkey de nœud.
    """

    class Provider(models.TextChoices):
        MOCK = "mock", _("Mock (non Lightning)")
        LND_REGTEST = "lnd_regtest", _("LND Regtest")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet_connections",
    )
    provider = models.CharField(max_length=32, choices=Provider.choices, default=Provider.MOCK)
    public_identifier = models.CharField(max_length=255)
    node_pubkey = models.CharField(max_length=66, blank=True)
    alias = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    mock_balance_sats = models.PositiveBigIntegerField(default=0)
    connected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("connexion portefeuille")
        verbose_name_plural = _("connexions portefeuille")
        constraints = [
            models.UniqueConstraint(
                fields=["user", "provider"],
                condition=models.Q(is_active=True),
                name="one_active_wallet_per_provider",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.provider}"
