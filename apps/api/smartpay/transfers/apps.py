from django.apps import AppConfig


class TransfersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "smartpay.transfers"
    label = "transfers"
    verbose_name = "Transferts"
