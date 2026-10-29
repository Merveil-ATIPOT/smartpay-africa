from django.contrib import admin

from smartpay.merchants.models import Merchant


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = ("display_name", "owner", "country", "status")
    list_filter = ("country", "status")
    search_fields = ("legal_name", "display_name", "registration_number")
