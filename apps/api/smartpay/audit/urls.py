from django.urls import path

from smartpay.audit.views import AdminAuditLogListView

urlpatterns = [
    path("admin/audit/", AdminAuditLogListView.as_view(), name="admin-audit"),
]
