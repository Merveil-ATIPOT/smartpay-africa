"""Sonde d'infrastructure Regtest. GET LND uniquement. Aucune mutation."""

from __future__ import annotations

import copy
import threading
import time
from typing import Any

from django.conf import settings
from django.db import connection
from django.utils import timezone

from smartpay.payments.models import Payment
from smartpay.payments.providers import get_lab_counterparty_provider, get_payment_provider
from smartpay.payments.providers.errors import LndError, LndUnavailable

CACHE_TTL_SECONDS = 20
API_VERSION = "0.4.0"

NODE_CONNECTED = "connected"
NODE_UNAVAILABLE = "unavailable"
NODE_TIMEOUT = "timeout"
NODE_NOT_CONFIGURED = "not_configured"
BITCOIN_NOT_VERIFIED = "not_verified"

PAYMENTS_COUNT_NOTE = (
    "Compteurs PostgreSQL. is_lightning_settled est un statut métier Django, "
    "pas une preuve de règlement Lightning indépendante."
)
BITCOIN_NOTE = (
    "Non vérifié directement. Aucun client RPC Bitcoin n'est branché dans cette version. "
    "La hauteur de bloc LND ne prouve pas l'état de bitcoind."
)
REGTEST_WARNING = "Réseau Bitcoin Regtest uniquement. Pas de Mainnet. Aucune valeur monétaire réelle."
SECRETS_WARNING = (
    "Les macaroons, certificats, seeds et identifiants RPC restent côté serveur. "
    "Ils ne sont pas renvoyés par cet endpoint."
)

_TIMEOUT_MARKERS = ("délai d'attente", "timeout")

_lock = threading.Lock()
_cache_payload: dict[str, Any] | None = None
_cache_deadline = 0.0
_inflight: threading.Event | None = None
_inflight_error: BaseException | None = None
_inflight_result: dict[str, Any] | None = None


def reset_infrastructure_cache() -> None:
    """Réservé aux tests."""
    global _cache_payload, _cache_deadline, _inflight, _inflight_error, _inflight_result
    with _lock:
        _cache_payload = None
        _cache_deadline = 0.0
        _inflight = None
        _inflight_error = None
        _inflight_result = None


def _is_timeout(exc: BaseException) -> bool:
    message = str(exc).lower()
    return any(marker in message for marker in _TIMEOUT_MARKERS)


def _empty_node(*, status: str, alias: str | None = None) -> dict[str, Any]:
    return {
        "alias": alias,
        "connected": False,
        "synced_to_chain": None,
        "block_height": None,
        "num_active_channels": None,
        "num_peers": None,
        "channel_balance_sats": None,
        "status": status,
    }


def _safe_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _whitelist_getinfo(raw: dict[str, Any]) -> dict[str, Any]:
    alias = str(raw.get("alias") or "").strip() or None
    return {
        "alias": alias,
        "connected": True,
        "synced_to_chain": bool(raw.get("synced_to_chain")),
        "block_height": _safe_int(raw.get("block_height")) if "block_height" in raw else 0,
        "num_active_channels": _safe_int(raw.get("num_active_channels")) or 0,
        "num_peers": _safe_int(raw.get("num_peers")) if "num_peers" in raw else None,
        "channel_balance_sats": None,
        "status": NODE_CONNECTED,
    }


def _from_node_info(node: Any) -> dict[str, Any]:
    if not getattr(node, "connected", False):
        alias = str(getattr(node, "alias", "") or "").strip() or None
        return _empty_node(status=NODE_UNAVAILABLE, alias=alias)
    alias = str(getattr(node, "alias", "") or "").strip() or None
    return {
        "alias": alias,
        "connected": True,
        "synced_to_chain": bool(getattr(node, "synced_to_chain", False)),
        "block_height": int(getattr(node, "block_height", 0) or 0),
        "num_active_channels": int(getattr(node, "num_active_channels", 0) or 0),
        "num_peers": int(getattr(node, "num_peers", 0) or 0),
        "channel_balance_sats": None,
        "status": NODE_CONNECTED,
    }


def _read_channel_balance(provider: Any) -> int | None:
    try:
        return int(provider.get_channel_balance_sats())
    except (LndUnavailable, LndError, TypeError, ValueError, AttributeError):
        return None
    except Exception:
        return None


def probe_node(provider: Any | None, *, configured: bool) -> dict[str, Any]:
    if not configured or provider is None:
        return _empty_node(status=NODE_NOT_CONFIGURED)
    try:
        client = getattr(provider, "client", None)
        if client is not None and hasattr(client, "getinfo"):
            payload = _whitelist_getinfo(client.getinfo())
        else:
            payload = _from_node_info(provider.get_node_info())
        if payload["status"] != NODE_CONNECTED:
            return payload
        payload["channel_balance_sats"] = _read_channel_balance(provider)
        return payload
    except LndUnavailable as exc:
        status = NODE_TIMEOUT if _is_timeout(exc) else NODE_UNAVAILABLE
        return _empty_node(status=status)
    except LndError:
        return _empty_node(status=NODE_UNAVAILABLE)
    except Exception:
        return _empty_node(status=NODE_UNAVAILABLE)


def _postgres_status() -> str:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return "up"
    except Exception:
        return "down"


def _payments_counts() -> dict[str, Any]:
    return {
        "recorded_count": Payment.objects.count(),
        "lightning_settled_count": Payment.objects.filter(is_lightning_settled=True).count(),
        "note": PAYMENTS_COUNT_NOTE,
    }


def build_infrastructure_snapshot() -> dict[str, Any]:
    alice = probe_node(get_payment_provider(), configured=True)
    bob_provider = get_lab_counterparty_provider()
    bob = probe_node(bob_provider, configured=bob_provider is not None)
    postgres = _postgres_status()
    return {
        "checked_at": timezone.now().isoformat(),
        "cache_hit": False,
        "network": getattr(settings, "BITCOIN_NETWORK", "regtest"),
        "payment_provider": getattr(settings, "PAYMENT_PROVIDER", "mock"),
        "warnings": [REGTEST_WARNING, SECRETS_WARNING, BITCOIN_NOTE],
        "alice": alice,
        "bob": bob,
        "bitcoin_core": {
            "status": BITCOIN_NOT_VERIFIED,
            "verified": False,
            "note": BITCOIN_NOTE,
        },
        "django": {
            "status": "ok",
            "service": "smartpay-api",
            "version": API_VERSION,
            "network": getattr(settings, "BITCOIN_NETWORK", "regtest"),
            "payment_provider": getattr(settings, "PAYMENT_PROVIDER", "mock"),
        },
        "postgres": {
            "status": postgres,
        },
        "payments": _payments_counts(),
    }


def get_infrastructure_snapshot() -> dict[str, Any]:
    """Retourne une sonde, avec cache 20 s et fusion des appels concurrents."""
    global _cache_payload, _cache_deadline, _inflight, _inflight_error, _inflight_result

    with _lock:
        now = time.monotonic()
        if _cache_payload is not None and now < _cache_deadline:
            cached = copy.deepcopy(_cache_payload)
            cached["cache_hit"] = True
            return cached
        if _inflight is not None:
            waiter = _inflight
            leader = False
        else:
            waiter = threading.Event()
            _inflight = waiter
            _inflight_error = None
            _inflight_result = None
            leader = True

    if not leader:
        waiter.wait(timeout=60)
        with _lock:
            if _inflight_error is not None:
                raise _inflight_error
            if _inflight_result is None:
                return build_infrastructure_snapshot()
            result = copy.deepcopy(_inflight_result)
            result["cache_hit"] = True
            return result

    try:
        payload = build_infrastructure_snapshot()
        payload["cache_hit"] = False
        with _lock:
            _cache_payload = copy.deepcopy(payload)
            _cache_deadline = time.monotonic() + CACHE_TTL_SECONDS
            _inflight_result = payload
            _inflight_error = None
            waiter.set()
            _inflight = None
        return copy.deepcopy(payload)
    except Exception as exc:
        with _lock:
            _inflight_error = exc
            _inflight_result = None
            waiter.set()
            _inflight = None
        raise
