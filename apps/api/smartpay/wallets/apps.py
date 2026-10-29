from django.apps import AppConfig


class WalletsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "smartpay.wallets"
    label = "wallets"
    verbose_name = "Portefeuilles"

    def ready(self) -> None:
        from smartpay.wallets import signals  # noqa: F401
