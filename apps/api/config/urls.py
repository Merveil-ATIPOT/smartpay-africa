"""Routage racine SmartPay Africa."""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token-obtain"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/v1/", include("smartpay.core.urls")),
    path("api/v1/", include("smartpay.accounts.urls")),
    path("api/v1/", include("smartpay.wallets.urls")),
    path("api/v1/", include("smartpay.payments.urls")),
    path("api/v1/", include("smartpay.transfers.urls")),
    path("api/v1/", include("smartpay.merchants.urls")),
    path("api/v1/", include("smartpay.infrastructure.urls")),
    path("api/v1/", include("smartpay.audit.urls")),
    path("api/v1/", include("smartpay.ai_assistant.urls")),
    path("api/v1/", include("smartpay.academy.urls")),
]
