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
    encoded_invoice: str = ""
    payment_hash: str = ""
    description: str = ""
    destination: str = ""
    expiry_seconds: int = 0
    expires_at: datetime | None = None


@dataclass(frozen=True)
class DecodedInvoice:
    payment_hash: str
    amount_sats: int
    description: str
    expiry_seconds: int
    destination: str
    encoded_invoice: str


@dataclass(frozen=True)
class LookupResult:
    """Résultat d'un lookup LND — seule source de vérité pour un règlement."""

    found: bool
    settled: bool
    status: str
    failure_reason: str = ""
    amount_sats: int = 0
    fee_sats: int = 0


@dataclass(frozen=True)
class NodeInfo:
    connected: bool
    pubkey: str = ""
    alias: str = ""
    synced_to_chain: bool = False
    block_height: int = 0
    num_active_channels: int = 0


class PaymentProvider(Protocol):
    name: str
    settlement_mode: str

    def create_invoice(self, *, amount_sats: int, memo: str, expiry_seconds: int) -> InvoiceDraft:
        ...

    def preview(self, *, amount_sats: int, encoded_invoice: str = "") -> PaymentPreview:
        ...

    def get_node_info(self) -> NodeInfo:
        ...

    def get_channel_balance_sats(self) -> int:
        ...

    def decode_invoice(self, encoded_invoice: str) -> DecodedInvoice:
        ...

    def lookup_invoice(self, payment_hash: str) -> LookupResult:
        ...

    def lookup_payment(self, payment_hash: str) -> LookupResult:
        ...

    def send_payment(
        self,
        *,
        encoded_invoice: str,
        timeout_seconds: int,
        fee_limit_sats: int | None = None,
    ) -> str:
        """Déclenche un paiement et retourne le payment_hash. Ce n'est PAS une preuve de règlement."""
        ...
