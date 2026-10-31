"""GET /api/v1/admin/infrastructure/ — lecture seule, administrateur uniquement."""

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.core.permissions import IsAdminRole
from smartpay.infrastructure.serializers import InfrastructureSnapshotSerializer
from smartpay.infrastructure.snapshot import get_infrastructure_snapshot


class AdminInfrastructureView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    http_method_names = ["get", "head", "options"]

    @extend_schema(
        responses={200: InfrastructureSnapshotSerializer},
        description=(
            "Supervision lecture seule d'Alice, Bob, Django et PostgreSQL. "
            "Bitcoin Core n'est pas sondé. Aucun secret. Aucune mutation LND."
        ),
    )
    def get(self, request):
        payload = InfrastructureSnapshotSerializer(get_infrastructure_snapshot()).data
        response = Response(payload)
        response["Cache-Control"] = "private, no-store, no-cache, must-revalidate"
        response["Pragma"] = "no-cache"
        return response
