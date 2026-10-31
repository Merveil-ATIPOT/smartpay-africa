from django.urls import path

from smartpay.infrastructure.views import AdminInfrastructureView

urlpatterns = [
    path("admin/infrastructure/", AdminInfrastructureView.as_view(), name="admin-infrastructure"),
]
