"""GET /api/v1/admin/audit/ — lecture seule, administrateur uniquement."""

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.audit.directory import audit_summary, filter_audit_logs
from smartpay.audit.serializers import AdminAuditLogSerializer
from smartpay.core.pagination import SmartPayPagination
from smartpay.core.permissions import IsAdminRole


class AdminAuditLogListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]
    http_method_names = ["get", "head", "options"]

    @extend_schema(
        responses={200: AdminAuditLogSerializer(many=True)},
        description=(
            "Journaux AuditLog PostgreSQL. Lecture seule. "
            "metadata n'est jamais renvoyée brute. ip_address n'est pas exposée."
        ),
    )
    def get(self, request):
        qs = filter_audit_logs(
            q=request.query_params.get("q", ""),
            action=request.query_params.get("action", ""),
            resource_type=request.query_params.get("resource_type", ""),
            resource_id=request.query_params.get("resource_id", ""),
            actor=request.query_params.get("actor", ""),
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
                "results": AdminAuditLogSerializer(page, many=True).data,
                "summary": audit_summary(),
            }
        )
        response["Cache-Control"] = "private, no-store, no-cache, must-revalidate"
        response["Pragma"] = "no-cache"
        return response
