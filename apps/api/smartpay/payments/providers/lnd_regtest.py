"""Adaptateur LND Regtest — règlements uniquement après lookup LND, jamais après un simple HTTP 200."""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from smartpay.payments.providers.base import (
    DecodedInvoice,
    InvoiceDraft,
    LookupResult,
    NodeInfo,
    PaymentPreview,
)
from smartpay.payments.providers.errors import LndError, LndInvoiceError, LndUnavailable
from smartpay.payments.providers.lnd_client import LndRestClient, payment_hash_to_hex

REGTEST_WARNING = (
    "Fournisseur LND Regtest. Un HTTP 200 n'est pas une preuve de règlement. "
    "Le statut settled provient d'un lookup LND."
)
SELF_PAY_WARNING = (
    "Cette facture a été émise par le nœud payeur (Alice). "
    "Un paiement Alice → Alice n'est pas un transfert Alice → Bob. "
    "Utilisez une facture de la contrepartie Bob."
)


def _msat_to_sats(value: str | int | None) -> int:
    if value in (None, ""):
        return 0
    return int(value) // 1000


class LndRegtestPaymentProvider:
    name = "lnd_regtest"
    settlement_mode = "lightning_regtest"

    def __init__(self, client: LndRestClient | None = None) -> None:
        self.client = client or LndRestClient(
            rest_url=getattr(settings, "LND_REST_URL", ""),
            macaroon_path=getattr(settings, "LND_MACAROON_PATH", ""),
            tls_cert_path=getattr(settings, "LND_TLS_CERT_PATH", ""),
            timeout_seconds=float(getattr(settings, "LND_TIMEOUT_SECONDS", 30)),
        )

    def create_invoice(self, *, amount_sats: int, memo: str, expiry_seconds: int) -> InvoiceDraft:
        payload = self.client.add_invoice(
            amount_sats=amount_sats, memo=memo, expiry_seconds=expiry_seconds
        )
        encoded = payload.get("payment_request") or ""
        payment_hash = payment_hash_to_hex(payload.get("r_hash") or "")
        if not encoded or not payment_hash:
            raise LndError("LND n'a pas renvoyé de facture BOLT11 complète.")
        if not encoded.startswith("lnbcrt"):
            raise LndInvoiceError("La facture n'est pas une BOLT11 Regtest (préfixe lnbcrt).")
        return InvoiceDraft(
            encoded_invoice=encoded,
            payment_hash=payment_hash,
            provider_reference=payment_hash,
            expires_at=timezone.now() + timedelta(seconds=expiry_seconds),
            settlement_mode="lightning_regtest",
            is_lightning_settled=False,
            is_mock=False,
        )

    def preview(self, *, amount_sats: int, encoded_invoice: str = "") -> PaymentPreview:
        fee_sats = 0
        payment_hash = ""
        description = ""
        destination = ""
        expiry_seconds = 0
        expires_at = None
        if encoded_invoice:
            decoded = self.decode_invoice(encoded_invoice)
            payment_hash = decoded.payment_hash
            description = decoded.description
            destination = decoded.destination
            expiry_seconds = decoded.expiry_seconds
            if decoded.amount_sats:
                if amount_sats and amount_sats != decoded.amount_sats:
                    raise LndInvoiceError("Le montant ne correspond pas à la facture BOLT11.")
                amount_sats = decoded.amount_sats
            if expiry_seconds:
                expires_at = timezone.now() + timedelta(seconds=expiry_seconds)
            estimate = self.client.estimate_route_fee(encoded_invoice)
            fee_msat = estimate.get("routing_fee_msat") or estimate.get("routing_fee") or 0
            fee_sats = _msat_to_sats(fee_msat) if int(fee_msat or 0) >= 1000 else int(fee_msat or 0)
            if estimate.get("unavailable"):
                fee_sats = 0
        warnings = [REGTEST_WARNING]
        if destination:
            try:
                node = self.get_node_info()
            except (LndUnavailable, LndError):
                node = NodeInfo(connected=False)
            if node.pubkey and destination == node.pubkey:
                warnings.append(SELF_PAY_WARNING)
        return PaymentPreview(
            amount_sats=amount_sats,
            fee_sats=fee_sats,
            settlement_mode="lightning_regtest",
            network="regtest",
            is_lightning_settled=False,
            warnings=warnings,
            encoded_invoice=encoded_invoice,
            payment_hash=payment_hash,
            description=description,
            destination=destination,
            expiry_seconds=expiry_seconds,
            expires_at=expires_at,
        )

    def get_node_info(self) -> NodeInfo:
        try:
            info = self.client.getinfo()
        except LndUnavailable:
            return NodeInfo(connected=False)
        return NodeInfo(
            connected=True,
            pubkey=info.get("identity_pubkey") or "",
            alias=info.get("alias") or "",
            synced_to_chain=bool(info.get("synced_to_chain")),
            block_height=int(info.get("block_height") or 0),
            num_active_channels=int(info.get("num_active_channels") or 0),
        )

    def get_channel_balance_sats(self) -> int:
        payload = self.client.channel_balance()
        local = payload.get("local_balance") or {}
        if isinstance(local, dict):
            sat = local.get("sat") or local.get("sats")
            if sat is not None:
                return int(sat)
        return int(payload.get("balance") or 0)

    def decode_invoice(self, encoded_invoice: str) -> DecodedInvoice:
        if not encoded_invoice.startswith("lnbcrt"):
            raise LndInvoiceError("Seules les factures BOLT11 Regtest (lnbcrt) sont acceptées.")
        payload = self.client.decode_pay_req(encoded_invoice)
        amount_sats = int(payload.get("num_satoshis") or 0)
        expiry = int(payload.get("expiry") or 0)
        timestamp = int(payload.get("timestamp") or 0)
        if timestamp and expiry:
            expires_at = timestamp + expiry
            if expires_at <= int(timezone.now().timestamp()):
                raise LndInvoiceError("La facture BOLT11 est expirée.")
        return DecodedInvoice(
            payment_hash=payment_hash_to_hex(payload.get("payment_hash") or ""),
            amount_sats=amount_sats,
            description=payload.get("description") or "",
            expiry_seconds=expiry,
            destination=payload.get("destination") or "",
            encoded_invoice=encoded_invoice,
        )

    def lookup_invoice(self, payment_hash: str) -> LookupResult:
        try:
            payload = self.client.lookup_invoice(payment_hash)
        except LndError:
            return LookupResult(found=False, settled=False, status="unknown")
        state = (payload.get("state") or "").upper()
        settled = bool(payload.get("settled")) or state == "SETTLED"
        amount = int(payload.get("value") or 0)
        return LookupResult(
            found=True,
            settled=settled,
            status=state or ("SETTLED" if settled else "OPEN"),
            amount_sats=amount,
        )

    def lookup_payment(self, payment_hash: str) -> LookupResult:
        payload = self.client.lookup_payment(payment_hash)
        if not payload:
            return LookupResult(found=False, settled=False, status="unknown")
        status = str(payload.get("status") or "").upper()
        settled = status in {"SUCCEEDED", "SUCCESS", "2"}
        failed = status in {"FAILED", "FAILURE", "3"}
        fee_sat = payload.get("fee_sat") or payload.get("fee") or 0
        fee_msat = payload.get("fee_msat") or 0
        fee_sats = int(fee_sat or 0)
        if fee_sats == 0 and int(fee_msat or 0) >= 1000:
            fee_sats = int(fee_msat) // 1000
        return LookupResult(
            found=True,
            settled=settled,
            status=status or "IN_FLIGHT",
            failure_reason="" if not failed else str(payload.get("failure_reason") or "payment_failed"),
            amount_sats=int(payload.get("value_sat") or payload.get("value") or 0),
            fee_sats=fee_sats,
        )

    def send_payment(
        self,
        *,
        encoded_invoice: str,
        timeout_seconds: int,
        fee_limit_sats: int | None = None,
    ) -> str:
        decoded = self.decode_invoice(encoded_invoice)
        limit = fee_limit_sats if fee_limit_sats is not None else max(50, decoded.amount_sats // 100)
        payload = self.client.send_payment_sync(
            encoded_invoice=encoded_invoice,
            timeout_seconds=timeout_seconds,
            fee_limit_sats=limit,
        )
        error = payload.get("payment_error") or ""
        payment_hash = payment_hash_to_hex(payload.get("payment_hash") or decoded.payment_hash)
        if error:
            raise LndError(f"LND a signalé une erreur d'envoi: {error}")
        if not payment_hash:
            raise LndError("LND n'a pas renvoyé de payment_hash.")
        return payment_hash
