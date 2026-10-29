from django.apps import AppConfig


class ExchangeRatesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "smartpay.exchange_rates"
    label = "exchange_rates"
    verbose_name = "Taux de change (placeholder)"
