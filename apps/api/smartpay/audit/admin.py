from django.contrib import admin

from smartpay.audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "resource_type", "resource_id", "actor")
    list_filter = ("action", "resource_type")
    search_fields = ("resource_id", "action")
    readonly_fields = ("actor", "action", "resource_type", "resource_id", "metadata", "ip_address", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
