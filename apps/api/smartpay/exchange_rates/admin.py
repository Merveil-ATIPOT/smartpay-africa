from django.contrib import admin

from smartpay.exchange_rates.models import ExchangeRate


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ("pair", "is_placeholder", "source", "value")
    readonly_fields = ("disclaimer",)
