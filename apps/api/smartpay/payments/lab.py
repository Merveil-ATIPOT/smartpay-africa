"""Contrepartie laboratoire Bob. Ne remplace jamais le portefeuille utilisateur."""

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smartpay.payments.providers import get_lab_counterparty_provider
from smartpay.payments.providers.errors import LndError, LndInvoiceError, LndUnavailable
from smartpay.payments.serializers import CreateInvoiceSerializer

LAB_WARNING = (
    "Facture du nœud Bob (laboratoire). Ce n'est PAS le portefeuille de l'utilisateur. "
    "Collez-la dans M13 puis confirmez dans M15 : Alice paie Bob."
)


class LabCounterpartyInvoiceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(settings, "LAB_COUNTERPARTY_ENABLED", False):
            raise NotFound("Contrepartie laboratoire non activée.")
        provider = get_lab_counterparty_provider()
        if provider is None:
            raise ValidationError({"lab": "Nœud Bob non configuré."})
        serializer = CreateInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            draft = provider.create_invoice(
                amount_sats=data["amount_sats"],
                memo=data.get("memo") or "Facture SmartPay Africa",
                expiry_seconds=data.get("expiry_seconds", 3600),
            )
        except (LndUnavailable, LndInvoiceError, LndError) as exc:
            raise ValidationError({"lab": str(exc)}) from exc
        return Response(
            {
                "encoded_invoice": draft.encoded_invoice,
                "payment_hash": draft.payment_hash,
                "amount_sats": data["amount_sats"],
                "expires_at": draft.expires_at.isoformat(),
                "counterparty": "bob",
                "is_user_wallet": False,
                "warnings": [LAB_WARNING],
            },
            status=status.HTTP_201_CREATED,
        )
