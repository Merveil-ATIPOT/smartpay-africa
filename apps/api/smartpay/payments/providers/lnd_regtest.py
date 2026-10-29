"""Adaptateur LND Regtest — interface préparée, non implémentée en P01."""

from __future__ import annotations

from smartpay.payments.providers.base import InvoiceDraft, PaymentPreview


class LndRegtestPaymentProvider:
    name = "lnd_regtest"

    def create_invoice(self, *, amount_sats: int, memo: str, expiry_seconds: int) -> InvoiceDraft:
        raise NotImplementedError(
            "Le fournisseur LND Regtest n'est pas implémenté en phase P01."
        )

    def preview(self, *, amount_sats: int) -> PaymentPreview:
        raise NotImplementedError(
            "Le fournisseur LND Regtest n'est pas implémenté en phase P01."
        )
