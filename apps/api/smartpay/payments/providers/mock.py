"""Adaptateur Mock — ne produit jamais un règlement Lightning."""

from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

from django.utils import timezone

from smartpay.payments.providers.base import (
    DecodedInvoice,
    InvoiceDraft,
    LookupResult,
    NodeInfo,
    PaymentPreview,
)
from smartpay.payments.providers.errors import LndInvoiceError, LndPaymentError

MOCK_WARNING = (
    "Fournisseur Mock : facture et paiement simulés. "
    "Ceci n'est PAS une transaction Lightning confirmée."
)


class MockPaymentProvider:
    name = "mock"
    settlement_mode = "mock"

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

    def preview(self, *, amount_sats: int, encoded_invoice: str = "") -> PaymentPreview:
        return PaymentPreview(
            amount_sats=amount_sats,
            fee_sats=0,
            settlement_mode="mock",
            network="regtest",
            is_lightning_settled=False,
            warnings=[MOCK_WARNING],
            encoded_invoice=encoded_invoice,
        )

    def get_node_info(self) -> NodeInfo:
        return NodeInfo(connected=False, alias="mock")

    def get_channel_balance_sats(self) -> int:
        return 0

    def decode_invoice(self, encoded_invoice: str) -> DecodedInvoice:
        if encoded_invoice.startswith("lnbcrt") or encoded_invoice.startswith("lnbc"):
            raise LndInvoiceError("Une facture BOLT11 réelle ne peut pas être payée via Mock.")
        return DecodedInvoice(
            payment_hash="mockhash_decoded",
            amount_sats=0,
            description="",
            expiry_seconds=0,
            destination="",
            encoded_invoice=encoded_invoice,
        )

    def lookup_invoice(self, payment_hash: str) -> LookupResult:
        return LookupResult(found=True, settled=False, status="mock")

    def lookup_payment(self, payment_hash: str) -> LookupResult:
        return LookupResult(found=True, settled=False, status="mock")

    def send_payment(self, *, encoded_invoice: str, timeout_seconds: int) -> str:
        raise LndPaymentError("Le fournisseur Mock n'exécute aucun paiement Lightning.")
