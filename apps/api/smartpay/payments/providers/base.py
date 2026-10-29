from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class InvoiceDraft:
    encoded_invoice: str
    payment_hash: str
    provider_reference: str
    expires_at: datetime
    settlement_mode: str
    is_lightning_settled: bool = False
    is_mock: bool = True


@dataclass(frozen=True)
class PaymentPreview:
    amount_sats: int
    fee_sats: int
    settlement_mode: str
    network: str
    is_lightning_settled: bool
    warnings: list[str] = field(default_factory=list)


class PaymentProvider(Protocol):
    name: str

    def create_invoice(self, *, amount_sats: int, memo: str, expiry_seconds: int) -> InvoiceDraft:
        ...

    def preview(self, *, amount_sats: int) -> PaymentPreview:
        ...
