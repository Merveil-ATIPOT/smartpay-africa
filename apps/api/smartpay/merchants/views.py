from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.core.pagination import SmartPayPagination
from smartpay.core.permissions import IsAdminRole
from smartpay.merchants.directory import (
    filter_merchants,
    merchant_linked_payments,
    merchant_payments_summary,
    merchant_summary,
)
from smartpay.merchants.models import Merchant
from smartpay.merchants.serializers import AdminMerchantLinkedPaymentSerializer, AdminMerchantSerializer


class AdminMerchantListView(APIView):
    """GET /api/v1/admin/merchants/ — lecture seule, administrateur uniquement."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        responses={200: AdminMerchantSerializer(many=True)},
        description="Annuaire PostgreSQL des marchands. Aucun secret. Aucune mutation.",
    )
    def get(self, request):
        qs = filter_merchants(
            Merchant.objects.all(),
            q=request.query_params.get("q", ""),
            country=request.query_params.get("country", ""),
            status=request.query_params.get("status", ""),
        )
        paginator = SmartPayPagination()
        page = paginator.paginate_queryset(qs, request)
        return Response(
            {
                "count": paginator.page.paginator.count,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
                "results": AdminMerchantSerializer(page, many=True).data,
                "summary": merchant_summary(),
            }
        )


class AdminMerchantDetailView(APIView):
    """GET /api/v1/admin/merchants/{id}/ — fiche lecture seule, administrateur uniquement."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        responses={200: AdminMerchantSerializer},
        description="Fiche PostgreSQL d'un marchand. Paiements filtrés sur merchant_id. Aucun secret. Aucune mutation.",
    )
    def get(self, request, merchant_id: int):
        qs = Merchant.objects.select_related("owner").annotate(payment_count=Count("payments"))
        try:
            merchant = qs.get(pk=merchant_id)
        except Merchant.DoesNotExist as exc:
            raise NotFound("Marchand introuvable.") from exc
        recent = merchant_linked_payments(merchant)[:20]
        payload = AdminMerchantSerializer(merchant).data
        payload["payments_summary"] = merchant_payments_summary(merchant)
        payload["recent_payments"] = AdminMerchantLinkedPaymentSerializer(recent, many=True).data
        return Response(payload)
