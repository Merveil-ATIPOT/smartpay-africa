from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.core.permissions import IsAdminRole

from smartpay.transfers.corridors import CATALOG_DISCLAIMER, get_corridor, operators_for
from smartpay.transfers.models import Transfer, TransferSimulation
from smartpay.transfers.serializers import (
    CreateTransferSerializer,
    QuoteRequestSerializer,
    TransferSerializer,
    TransferSimulationSerializer,
    TransferStatusSerializer,
    UpdateTransferSerializer,
)
from smartpay.transfers.execution import confirm_execution, preview_execution, reconcile_execution, result_payload
from smartpay.transfers.services import (
    apply_quote,
    catalog_payload,
    compute_standalone_quote,
    create_draft,
    get_owned_transfer,
    mark_ready,
    resolve_idempotency_key,
    update_transfer,
    validate_beneficiary,
)


class TransferSimulationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = TransferSimulation.objects.filter(initiator=request.user)
        if request.user.is_admin_role:
            qs = TransferSimulation.objects.all()
        serializer = TransferSimulationSerializer(qs[:100], many=True)
        return Response({"count": qs.count(), "results": serializer.data})


class DestinationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(catalog_payload())


class DestinationOperatorsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, code):
        corridor = get_corridor(code)
        if corridor is None:
            raise NotFound("Destination inconnue.")
        operators = [
            {"id": item.id, "label": item.label, "short_label": item.short_label}
            for item in operators_for(code)
        ]
        return Response(
            {
                "code": corridor.code,
                "name": corridor.name,
                "available": corridor.available,
                "currency": corridor.currency,
                "disclaimer": CATALOG_DISCLAIMER,
                "operators": operators,
            }
        )


class StandaloneQuoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = QuoteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        destination = data.get("destination_country") or ""
        amount = data.get("amount_local")
        if amount is None:
            raise ValidationError({"amount_local": "Indiquez le montant en devise locale."})
        if not destination:
            raise ValidationError({"destination_country": "Indiquez le pays de destination."})
        return Response(compute_standalone_quote(amount, destination))


class TransferListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Transfer.objects.filter(owner=request.user)
        if request.user.is_admin_role:
            qs = Transfer.objects.all()
        serializer = TransferSerializer(qs[:100], many=True)
        return Response({"count": qs.count(), "results": serializer.data})

    def post(self, request):
        serializer = CreateTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        idempotency_key = resolve_idempotency_key(request, data.get("idempotency_key", ""))
        transfer, created = create_draft(
            user=request.user,
            data=data,
            idempotency_key=idempotency_key,
            request=request,
        )
        return Response(
            TransferSerializer(transfer).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class TransferDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        return Response(TransferSerializer(transfer).data)

    def patch(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        serializer = UpdateTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transfer = update_transfer(
            transfer,
            serializer.validated_data,
            actor=request.user,
            request=request,
        )
        return Response(TransferSerializer(transfer).data)


class TransferStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        return Response(TransferStatusSerializer(transfer).data)


class TransferBeneficiaryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        serializer = UpdateTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transfer = validate_beneficiary(
            transfer,
            serializer.validated_data,
            actor=request.user,
            request=request,
        )
        return Response(TransferSerializer(transfer).data)


class TransferQuoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        serializer = QuoteRequestSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        transfer = apply_quote(
            transfer,
            actor=request.user,
            request=request,
            amount_local=serializer.validated_data.get("amount_local"),
        )
        return Response(TransferSerializer(transfer).data)


class TransferReadyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        key = resolve_idempotency_key(request, (request.data or {}).get("idempotency_key", ""))
        transfer = mark_ready(
            transfer,
            actor=request.user,
            request=request,
            idempotency_key=key,
        )
        return Response(TransferSerializer(transfer).data)


class TransferPaymentPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        return Response(preview_execution(transfer))

    def post(self, request, transfer_id):
        return self.get(request, transfer_id)


class TransferConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        key = resolve_idempotency_key(request, (request.data or {}).get("idempotency_key", ""))
        transfer = confirm_execution(
            transfer,
            actor=request.user,
            idempotency_key=key,
            request=request,
        )
        return Response(TransferSerializer(transfer).data)


class TransferResultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        return Response(result_payload(transfer))


class TransferReconcileView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, transfer_id):
        transfer = get_owned_transfer(request.user, transfer_id)
        transfer = reconcile_execution(transfer, actor=request.user, request=request)
        return Response(result_payload(transfer))
