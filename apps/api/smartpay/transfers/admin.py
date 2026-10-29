from django.contrib import admin

from smartpay.transfers.models import SimulatedMobileMoneyCredit, Transfer, TransferAttempt, TransferSimulation


@admin.register(TransferSimulation)
class TransferSimulationAdmin(admin.ModelAdmin):
    list_display = ("id", "initiator", "source_country", "destination_country", "amount_sats", "status")
    list_filter = ("status", "source_country", "destination_country")
    readonly_fields = ("disclaimer", "created_at", "updated_at")


@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    list_display = (
        "public_reference",
        "owner",
        "destination_country",
        "operator",
        "amount_local",
        "total_sats",
        "status",
    )
    list_filter = ("status", "destination_country", "operator")
    search_fields = ("public_reference",)
    readonly_fields = (
        "id",
        "public_reference",
        "execution_mode",
        "lightning_payment_id",
        "lightning_payment_hash",
        "lightning_settled_at",
        "mobile_money_credit_status",
        "simulated_credit_reference",
        "invoice_amount_sats",
        "lnd_fee_sats_estimated",
        "lnd_fee_sats_paid",
        "total_debited_sats",
        "disclaimer",
        "created_at",
        "updated_at",
    )


@admin.register(TransferAttempt)
class TransferAttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "transfer", "status", "invoice_amount_sats", "send_attempted", "payment_hash")
    readonly_fields = ("encoded_invoice", "created_at", "updated_at")
    search_fields = ("payment_hash",)


@admin.register(SimulatedMobileMoneyCredit)
class SimulatedMobileMoneyCreditAdmin(admin.ModelAdmin):
    list_display = ("reference", "transfer", "destination_country", "operator", "amount_local")
    readonly_fields = ("reference", "disclaimer", "credited_at")
