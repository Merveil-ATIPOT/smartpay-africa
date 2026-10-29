"""Adaptateur Mock — ne produit jamais un règlement Lightning."""

from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

from django.utils import timezone

from smartpay.payments.providers.base import InvoiceDraft, PaymentPreview

MOCK_WARNING = (
    "Fournisseur Mock : facture et paiement simulés. "
    "Ceci n'est PAS une transaction Lightning confirmée."
)


class MockPaymentProvider:
    name = "mock"

    def create_invoice(self, *, amount_sats: int, memo: str, expiry_seconds: int) -> InvoiceDraft:
        token = uuid4().hex
        return InvoiceDraft(
            encoded_invoice=f"mockln1{token}",
            payment_hash=f"mockhash_{token}",
            provider_reference=f"mock_{token}",
            expires_at=timezone.now() + timedelta(seconds=expiry_seconds),
            settlement_mode="mock",
            is_lightning_settled=False,
            is_mock=True,
        )

    def preview(self, *, amount_sats: int) -> PaymentPreview:
        return PaymentPreview(
            amount_sats=amount_sats,
            fee_sats=0,
            settlement_mode="mock",
            network="regtest",
            is_lightning_settled=False,
            warnings=[MOCK_WARNING],
        )
