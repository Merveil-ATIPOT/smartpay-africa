"""Client REST LND. Les macaroons restent côté backend, jamais renvoyés au client."""

from __future__ import annotations

import base64
import logging
import ssl
from pathlib import Path
from typing import Any

import httpx

from smartpay.payments.providers.errors import LndError, LndUnavailable

logger = logging.getLogger("smartpay.payments.lnd")

# Préimage et macaroon ne doivent jamais apparaître dans les logs.
_REDACT_KEYS = frozenset(
    {
        "payment_preimage",
        "r_preimage",
        "preimage",
        "macaroon",
        "admin.macaroon",
        "invoice_macaroon",
        "readonly_macaroon",
    }
)


def payment_hash_to_hex(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if all(char in "0123456789abcdefABCDEF" for char in raw) and len(raw) == 64:
        return raw.lower()
    padded = raw + "=" * ((4 - len(raw) % 4) % 4)
    try:
        return base64.urlsafe_b64decode(padded).hex()
    except Exception:
        try:
            return base64.b64decode(padded).hex()
        except Exception as exc:
            raise LndError("payment_hash illisible.") from exc


def _redact(payload: Any) -> Any:
    if isinstance(payload, dict):
        return {
            key: "***redacted***" if key.lower() in _REDACT_KEYS else _redact(value)
            for key, value in payload.items()
        }
    if isinstance(payload, list):
        return [_redact(item) for item in payload]
    return payload


class LndRestClient:
    def __init__(
        self,
        *,
        rest_url: str,
        macaroon_path: str,
        tls_cert_path: str,
        timeout_seconds: float = 30,
    ) -> None:
        self.rest_url = (rest_url or "").rstrip("/")
        self.macaroon_path = Path(macaroon_path)
        self.tls_cert_path = Path(tls_cert_path)
        self.timeout_seconds = timeout_seconds

    def _macaroon_hex(self) -> str:
        if not self.macaroon_path.is_file():
            raise LndUnavailable("Fichier macaroon introuvable.")
        return self.macaroon_path.read_bytes().hex()

    def _ssl_context(self) -> ssl.SSLContext:
        if not self.tls_cert_path.is_file():
            raise LndUnavailable("Certificat TLS LND introuvable.")
        context = ssl.create_default_context()
        context.load_verify_locations(cafile=str(self.tls_cert_path))
        return context

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self.rest_url,
            headers={"Grpc-Metadata-macaroon": self._macaroon_hex()},
            verify=str(self.tls_cert_path),
            timeout=self.timeout_seconds,
        )

    def request(self, method: str, path: str, *, json: dict | None = None) -> dict:
        if not self.rest_url:
            raise LndUnavailable("LND_REST_URL est vide.")
        try:
            with self._client() as client:
                response = client.request(method, path, json=json)
        except httpx.TimeoutException as exc:
            logger.warning("lnd_timeout method=%s path=%s", method, path)
            raise LndUnavailable("Délai d'attente LND dépassé.") from exc
        except httpx.HTTPError as exc:
            logger.warning("lnd_http_error method=%s path=%s", method, path)
            raise LndUnavailable("Nœud LND injoignable.") from exc

        if response.status_code >= 500:
            logger.warning("lnd_status=%s path=%s", response.status_code, path)
            raise LndUnavailable(f"LND HTTP {response.status_code}.")
        try:
            payload = response.json() if response.content else {}
        except ValueError as exc:
            raise LndError("Réponse LND non JSON.") from exc
        if response.status_code >= 400:
            message = payload.get("message") or payload.get("error") or f"LND HTTP {response.status_code}"
            logger.info("lnd_client_error path=%s message=%s", path, message)
            raise LndError(str(message))
        return payload if isinstance(payload, dict) else {}

    def getinfo(self) -> dict:
        return self.request("GET", "/v1/getinfo")

    def channel_balance(self) -> dict:
        return self.request("GET", "/v1/balance/channels")

    def add_invoice(self, *, amount_sats: int, memo: str, expiry_seconds: int) -> dict:
        return self.request(
            "POST",
            "/v1/invoices",
            json={"value": str(amount_sats), "memo": memo, "expiry": str(expiry_seconds)},
        )

    def lookup_invoice(self, payment_hash_hex: str) -> dict:
        digest = payment_hash_to_hex(payment_hash_hex)
        return self.request("GET", f"/v1/invoice/{digest}")

    def decode_pay_req(self, encoded_invoice: str) -> dict:
        return self.request("GET", f"/v1/payreq/{encoded_invoice}")

    def estimate_route_fee(self, encoded_invoice: str) -> dict:
        decoded = self.decode_pay_req(encoded_invoice)
        dest = decoded.get("destination") or ""
        amount = int(decoded.get("num_satoshis") or 0)
        if not dest or amount < 1:
            return {"routing_fee_msat": "0"}
        try:
            return self.request(
                "POST",
                "/v2/router/route/estimatefee",
                json={"dest": dest, "amt_sat": str(amount)},
            )
        except LndError:
            logger.info("lnd_fee_estimate_unavailable dest_len=%s", len(dest))
            return {"routing_fee_msat": "0", "unavailable": True}

    def send_payment_sync(self, *, encoded_invoice: str, timeout_seconds: int, fee_limit_sats: int) -> dict:
        payload = self.request(
            "POST",
            "/v1/channels/transactions",
            json={
                "payment_request": encoded_invoice,
                "timeout_seconds": timeout_seconds,
                "fee_limit": {"fixed": str(max(fee_limit_sats, 1))},
            },
        )
        logger.info("lnd_send_http_ok keys=%s", sorted(_redact(payload).keys()))
        return payload

    def lookup_payment(self, payment_hash_hex: str) -> dict:
        digest = payment_hash_to_hex(payment_hash_hex)
        try:
            return self.request("GET", f"/v1/payment/{digest}")
        except LndError:
            listed = self.request("GET", "/v1/payments?include_incomplete=true")
            payments = listed.get("payments") or []
            for item in payments:
                item_hash = payment_hash_to_hex(item.get("payment_hash") or "")
                if item_hash == digest:
                    return item
            return {}
