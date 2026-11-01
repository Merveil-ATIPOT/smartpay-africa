"""Documentation OpenAPI : ouverte en DEBUG, admin seulement sinon."""

from django.conf import settings
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny, IsAuthenticated

from smartpay.core.permissions import IsAdminRole


class DebugOrAdminSchemaMixin:
    def get_permissions(self):
        if getattr(settings, "DEBUG", False):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminRole()]


class SmartPaySchemaView(DebugOrAdminSchemaMixin, SpectacularAPIView):
    pass


class SmartPaySwaggerView(DebugOrAdminSchemaMixin, SpectacularSwaggerView):
    pass
