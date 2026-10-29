"""Réseau Lightning fictif pour les tests B2. Aucun appel LND réel."""

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
from smartpay.payments.providers.errors import LndInvoiceError, LndPaymentError, LndUnavailable


class FakeNode:
    name = "fake_lnd"
    settlement_mode = "lightning_regtest"

    def __init__(self, network: "FakeRegtestNetwork", role: str, pubkey: str):
        self.network = network
        self.role = role
        self.pubkey = pubkey
        self.balance = 1_000_000
        self.connected = True

    def create_invoice(self, *, amount_sats: int, memo: str, expiry_seconds: int) -> InvoiceDraft:
        token = uuid4().hex
        payment_hash = token
        encoded = f"lnbcrt{amount_sats}n1{token[:20]}"
        expires_at = timezone.now() + timedelta(seconds=expiry_seconds)
        self.network.invoices[payment_hash] = {
            "encoded": encoded,
            "amount_sats": amount_sats,
            "memo": memo,
            "expires_at": expires_at,
            "settled": False,
            "expired": False,
        }
        return InvoiceDraft(
            encoded_invoice=encoded,
            payment_hash=payment_hash,
            provider_reference=payment_hash,
            expires_at=expires_at,
            settlement_mode="lightning_regtest",
            is_lightning_settled=False,
            is_mock=False,
        )

    def preview(self, *, amount_sats: int, encoded_invoice: str = "") -> PaymentPreview:
        fee = self.network.estimated_fee
        decoded = self.decode_invoice(encoded_invoice) if encoded_invoice else None
        return PaymentPreview(
            amount_sats=decoded.amount_sats if decoded and decoded.amount_sats else amount_sats,
            fee_sats=fee,
            settlement_mode="lightning_regtest",
            network="regtest",
            is_lightning_settled=False,
            encoded_invoice=encoded_invoice,
            payment_hash=decoded.payment_hash if decoded else "",
            destination=decoded.destination if decoded else "",
        )

    def get_node_info(self) -> NodeInfo:
        return NodeInfo(connected=self.connected, pubkey=self.pubkey, alias=self.role)

    def get_channel_balance_sats(self) -> int:
        return self.balance

    def decode_invoice(self, encoded_invoice: str) -> DecodedInvoice:
        if encoded_invoice.startswith("lnbc") and not encoded_invoice.startswith("lnbcrt"):
            raise LndInvoiceError("Seules les factures BOLT11 Regtest (lnbcrt) sont acceptées.")
        match = next((key for key, item in self.network.invoices.items() if item["encoded"] == encoded_invoice), None)
        if match is None:
            raise LndInvoiceError("Facture inconnue.")
        item = self.network.invoices[match]
        if item.get("expired") or item["expires_at"] <= timezone.now():
            raise LndInvoiceError("La facture BOLT11 est expirée.")
        return DecodedInvoice(
            payment_hash=match,
            amount_sats=item["amount_sats"],
            description=item.get("memo") or "",
            expiry_seconds=600,
            destination=self.network.bob.pubkey,
            encoded_invoice=encoded_invoice,
        )

    def lookup_invoice(self, payment_hash: str) -> LookupResult:
        item = self.network.invoices.get(payment_hash)
        if item is None:
            return LookupResult(found=False, settled=False, status="unknown")
        settled = bool(item["settled"])
        return LookupResult(
            found=True,
            settled=settled,
            status="SETTLED" if settled else "OPEN",
            amount_sats=item["amount_sats"],
        )

    def lookup_payment(self, payment_hash: str) -> LookupResult:
        payment = self.network.payments.get(payment_hash)
        if payment is None:
            return LookupResult(found=False, settled=False, status="unknown")
        return LookupResult(
            found=True,
            settled=payment["status"] == "SUCCEEDED",
            status=payment["status"],
            failure_reason=payment.get("failure_reason", ""),
            amount_sats=payment.get("amount_sats", 0),
            fee_sats=payment.get("fee_sats", 0),
        )

    def send_payment(
        self,
        *,
        encoded_invoice: str,
        timeout_seconds: int,
        fee_limit_sats: int | None = None,
    ) -> str:
        self.network.send_calls += 1
        if self.network.pay_behavior == "unavailable":
            raise LndUnavailable("Nœud LND injoignable.")
        if self.network.pay_behavior == "refused":
            raise LndPaymentError("Paiement refusé par LND.")
        decoded = self.decode_invoice(encoded_invoice)
        if self.network.pay_behavior == "in_flight":
            self.network.payments[decoded.payment_hash] = {
                "status": "IN_FLIGHT",
                "amount_sats": decoded.amount_sats,
                "fee_sats": 0,
            }
            return decoded.payment_hash
        self.network.invoices[decoded.payment_hash]["settled"] = True
        self.network.payments[decoded.payment_hash] = {
            "status": "SUCCEEDED",
            "amount_sats": decoded.amount_sats,
            "fee_sats": self.network.paid_fee,
        }
        self.balance -= decoded.amount_sats + self.network.paid_fee
        return decoded.payment_hash


class FakeRegtestNetwork:
    def __init__(self) -> None:
        self.invoices: dict = {}
        self.payments: dict = {}
        self.send_calls = 0
        self.pay_behavior = "succeed"
        self.estimated_fee = 4
        self.paid_fee = 3
        self.alice = FakeNode(self, "alice", "02" + "aa" * 32)
        self.bob = FakeNode(self, "bob", "03" + "bb" * 32)
