from django.contrib import admin

from smartpay.wallets.models import WalletConnection


@admin.register(WalletConnection)
class WalletConnectionAdmin(admin.ModelAdmin):
    list_display = ("user", "provider", "public_identifier", "is_active", "mock_balance_sats")
    list_filter = ("provider", "is_active")
    search_fields = ("public_identifier", "alias", "node_pubkey")
    readonly_fields = ("connected_at", "updated_at")
