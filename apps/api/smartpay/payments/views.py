from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.core.permissions import IsOwnerOrAdmin
from smartpay.merchants.models import Merchant
from smartpay.payments.models import Payment
from smartpay.payments.providers import get_payment_provider
from smartpay.payments.serializers import (
    CreateInvoiceSerializer,
    CreatePaymentSerializer,
    PaymentSerializer,
    PreviewPaymentSerializer,
)
from smartpay.payments.services import create_invoice, create_outgoing_payment, resolve_idempotency_key


class PaymentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Payment.objects.filter(owner=request.user).select_related("invoice", "merchant")
        if request.user.is_admin_role:
            qs = Payment.objects.all().select_related("invoice", "merchant")
        serializer = PaymentSerializer(qs[:100], many=True)
        return Response({"count": qs.count(), "results": serializer.data})

    def post(self, request):
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        merchant = None
        merchant_id = data.get("merchant_id")
        if merchant_id:
            try:
                merchant = Merchant.objects.get(pk=merchant_id)
            except Merchant.DoesNotExist as exc:
                raise ValidationError({"merchant_id": "Commerçant introuvable."}) from exc
            if merchant.owner_id != request.user.id and not request.user.is_admin_role:
                raise PermissionDenied("Ce commerçant ne vous appartient pas.")
        idempotency_key = resolve_idempotency_key(request, data.get("idempotency_key", ""))
        payment, created = create_outgoing_payment(
            user=request.user,
            amount_sats=data["amount_sats"],
            description=data.get("description", ""),
            merchant=merchant,
            idempotency_key=idempotency_key,
            request=request,
        )
        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PaymentDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get(self, request, payment_id):
        try:
            payment = Payment.objects.select_related("invoice", "merchant").get(pk=payment_id)
        except Payment.DoesNotExist as exc:
            raise NotFound("Paiement introuvable.") from exc
        self.check_object_permissions(request, payment)
        return Response(PaymentSerializer(payment).data)


class PaymentInvoiceCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payment = create_invoice(
            user=request.user,
            amount_sats=data["amount_sats"],
            memo=data.get("memo", ""),
            expiry_seconds=data.get("expiry_seconds", 3600),
            request=request,
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PreviewPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        preview = get_payment_provider().preview(amount_sats=serializer.validated_data["amount_sats"])
        return Response(
            {
                "amount_sats": preview.amount_sats,
                "fee_sats": preview.fee_sats,
                "settlement_mode": preview.settlement_mode,
                "network": preview.network,
                "is_lightning_settled": preview.is_lightning_settled,
                "warnings": preview.warnings,
            }
        )
