from django.contrib import admin

from smartpay.transfers.models import TransferSimulation


@admin.register(TransferSimulation)
class TransferSimulationAdmin(admin.ModelAdmin):
    list_display = ("id", "initiator", "source_country", "destination_country", "amount_sats", "status")
    list_filter = ("status", "source_country", "destination_country")
    readonly_fields = ("disclaimer", "created_at", "updated_at")
