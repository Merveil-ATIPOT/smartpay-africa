from django.contrib import admin

from smartpay.payments.models import Payment, PaymentInvoice


class PaymentInvoiceInline(admin.StackedInline):
    model = PaymentInvoice
    extra = 0
    readonly_fields = ("encoded_invoice", "payment_hash", "memo", "expires_at", "is_mock", "created_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "owner",
        "amount_sats",
        "status",
        "settlement_mode",
        "is_lightning_settled",
        "direction",
        "created_at",
    )
    list_filter = ("status", "settlement_mode", "is_lightning_settled", "direction")
    search_fields = ("id", "provider_reference", "idempotency_key")
    readonly_fields = (
        "id",
        "is_lightning_settled",
        "settlement_mode",
        "network",
        "provider_reference",
        "created_at",
        "updated_at",
    )
    inlines = [PaymentInvoiceInline]
