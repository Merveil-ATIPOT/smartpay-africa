"""GET /api/v1/admin/corridors/ — lecture seule, administrateur uniquement."""

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.core.pagination import SmartPayPagination
from smartpay.core.permissions import IsAdminRole
from smartpay.transfers.admin_corridors import (
    catalog_supervision,
    filter_transfers,
    historical_simulations_payload,
    serialize_transfer,
    transfer_summary,
)


class AdminCorridorsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    http_method_names = ["get", "head", "options"]

    @extend_schema(
        description=(
            "Supervision des corridors de démonstration. Lecture seule PostgreSQL. "
            "Aucun appel LND. Aucune PII bénéficiaire. XOF et XAF restent séparés."
        ),
    )
    def get(self, request):
        qs = filter_transfers(
            source_country=request.query_params.get("source_country", ""),
            destination_country=request.query_params.get("destination_country", ""),
            status=request.query_params.get("status", ""),
            created_after=request.query_params.get("created_after", ""),
            created_before=request.query_params.get("created_before", ""),
        )
        paginator = SmartPayPagination()
        page = paginator.paginate_queryset(qs, request)
        response = Response(
            {
                "count": paginator.page.paginator.count,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
                "results": [serialize_transfer(item) for item in page],
                "catalog": catalog_supervision(),
                "summary": transfer_summary(),
                "historical_simulations": historical_simulations_payload(),
            }
        )
        response["Cache-Control"] = "private, no-store, no-cache, must-revalidate"
        response["Pragma"] = "no-cache"
        return response
