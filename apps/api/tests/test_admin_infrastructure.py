from __future__ import annotations

import threading
import time

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

from smartpay.audit.models import AuditLog
from smartpay.infrastructure.snapshot import reset_infrastructure_cache
from smartpay.payments.models import Payment
from smartpay.payments.providers.errors import LndUnavailable
from smartpay.wallets.models import WalletConnection

User = get_user_model()

URL = "/api/v1/admin/infrastructure/"

FORBIDDEN_KEYS = {
    "macaroon",
    "admin.macaroon",
    "seed",
    "private_key",
    "jwt",
    "password",
    "rpcuser",
    "rpcpassword",
    "identity_pubkey",
    "uris",
    "encoded_invoice",
    "pubkey",
}

ALLOWED_TOP_KEYS = {
    "checked_at",
    "cache_hit",
    "network",
    "payment_provider",
    "warnings",
    "alice",
    "bob",
    "bitcoin_core",
    "django",
    "postgres",
    "payments",
}

NODE_KEYS = {
    "alias",
    "connected",
    "synced_to_chain",
    "block_height",
    "num_active_channels",
    "num_peers",
    "channel_balance_sats",
    "status",
}

ALICE_INFO = {
    "alias": "alice",
    "identity_pubkey": "02" + "ab" * 32,
    "synced_to_chain": True,
    "block_height": 57,
    "num_active_channels": 1,
    "num_peers": 1,
    "uris": ["02abcd@lnd-alice:9735"],
}


@pytest.fixture(autouse=True)
def _clear_cache():
    reset_infrastructure_cache()
    yield
    reset_infrastructure_cache()


class FakeClient:
    def __init__(self, info=None, error=None, delay=0.0, gate=None, calls=None):
        self.info = info or {}
        self.error = error
        self.delay = delay
        self.gate = gate
        self.calls = calls if calls is not None else []

    def getinfo(self):
        self.calls.append(("GET", "/v1/getinfo"))
        if self.gate is not None:
            self.gate.wait(timeout=5)
        if self.delay:
            time.sleep(self.delay)
        if self.error:
            raise self.error
        return dict(self.info)

    def channel_balance(self):
        self.calls.append(("GET", "/v1/balance/channels"))
        return {"local_balance": {"sat": "0"}}

    def add_invoice(self, **kwargs):
        self.calls.append(("POST", "/v1/invoices"))
        raise AssertionError("POST LND interdit")

    def send_payment_sync(self, **kwargs):
        self.calls.append(("POST", "/v1/channels/transactions"))
        raise AssertionError("POST LND interdit")


class FakeProvider:
    def __init__(self, client: FakeClient, balance: int = 2500):
        self.client = client
        self.balance = balance
        self.create_invoice_calls = 0

    def get_channel_balance_sats(self) -> int:
        self.client.calls.append(("GET", "channel_balance_sats"))
        if isinstance(self.balance, BaseException):
            raise self.balance
        return int(self.balance)

    def create_invoice(self, **kwargs):
        self.create_invoice_calls += 1
        raise AssertionError("create_invoice interdit")

    def send_payment(self, **kwargs):
        raise AssertionError("send_payment interdit")


def _patch_nodes(monkeypatch, alice, bob):
    monkeypatch.setattr("smartpay.infrastructure.snapshot.get_payment_provider", lambda: alice)
    monkeypatch.setattr("smartpay.infrastructure.snapshot.get_lab_counterparty_provider", lambda: bob)


def _walk_keys(value):
    if isinstance(value, dict):
        for key, item in value.items():
            yield str(key)
            yield from _walk_keys(item)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_keys(item)


def _assert_no_secrets(payload: dict):
    keys = set(_walk_keys(payload))
    assert FORBIDDEN_KEYS.isdisjoint(keys)
    blob = str(payload)
    assert "/run/lnd" not in blob
    assert "eyJ" not in blob
    assert ALICE_INFO["identity_pubkey"] not in blob
    assert "lnd-alice:9735" not in blob
    assert set(payload.keys()) == ALLOWED_TOP_KEYS
    assert set(payload["alice"].keys()) == NODE_KEYS
    assert set(payload["bob"].keys()) == NODE_KEYS


@pytest.fixture
def merchant_user(db):
    return User.objects.create_user(
        email="shop@smartpay.test",
        password="test-pass-123",
        role=User.Role.MERCHANT,
        country=User.Country.SN,
    )


def test_requires_auth(api_client):
    response = api_client.get(URL)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_rejects_individual_student_merchant(api_client, user, other_user, merchant_user):
    for account in (user, other_user, merchant_user):
        api_client.force_authenticate(user=account)
        response = api_client.get(URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN, account.role


@pytest.mark.django_db
def test_admin_ok_whitelist_and_no_mutation(admin_client, admin_user, monkeypatch):
    calls: list[tuple[str, str]] = []
    alice = FakeProvider(FakeClient(info=ALICE_INFO, calls=calls), balance=4200)
    bob = FakeProvider(
        FakeClient(info={"alias": "bob", "synced_to_chain": True, "block_height": 57, "num_active_channels": 1, "num_peers": 1}, calls=calls),
        balance=1800,
    )
    _patch_nodes(monkeypatch, alice, bob)
    monkeypatch.setattr(
        "smartpay.payments.reconciliation.reconcile_payment",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("reconcile interdit")),
    )

    Payment.objects.create(
        owner=admin_user,
        amount_sats=1000,
        direction=Payment.Direction.INCOMING,
        status=Payment.Status.PENDING,
        settlement_mode=Payment.SettlementMode.LIGHTNING_REGTEST,
        is_lightning_settled=True,
    )
    Payment.objects.create(
        owner=admin_user,
        amount_sats=500,
        direction=Payment.Direction.INCOMING,
        status=Payment.Status.PENDING,
        settlement_mode=Payment.SettlementMode.MOCK,
        is_lightning_settled=False,
    )

    before = (
        Payment.objects.count(),
        WalletConnection.objects.count(),
        AuditLog.objects.count(),
    )
    response = admin_client.get(URL)
    assert response.status_code == status.HTTP_200_OK
    assert "private" in response["Cache-Control"]
    assert "no-store" in response["Cache-Control"]
    body = response.data
    _assert_no_secrets(body)
    assert body["cache_hit"] is False
    assert body["network"] == "regtest"
    assert body["alice"]["status"] == "connected"
    assert body["alice"]["alias"] == "alice"
    assert body["alice"]["block_height"] == 57
    assert body["alice"]["num_active_channels"] == 1
    assert body["alice"]["num_peers"] == 1
    assert body["alice"]["channel_balance_sats"] == 4200
    assert body["alice"]["synced_to_chain"] is True
    assert body["bob"]["alias"] == "bob"
    assert body["bitcoin_core"]["status"] == "not_verified"
    assert body["bitcoin_core"]["verified"] is False
    assert body["django"]["status"] == "ok"
    assert body["django"]["version"] == "0.4.0"
    assert body["postgres"]["status"] == "up"
    assert body["payments"]["recorded_count"] == 2
    assert body["payments"]["lightning_settled_count"] == 1
    assert "statut métier" in body["payments"]["note"]
    assert all(method == "GET" for method, _path in calls)
    assert alice.create_invoice_calls == 0
    assert bob.create_invoice_calls == 0
    assert (
        Payment.objects.count(),
        WalletConnection.objects.count(),
        AuditLog.objects.count(),
    ) == before


@pytest.mark.django_db
def test_mutations_not_allowed(admin_client):
    assert admin_client.post(URL, {}, format="json").status_code == 405
    assert admin_client.patch(URL, {}, format="json").status_code == 405
    assert admin_client.put(URL, {}, format="json").status_code == 405
    assert admin_client.delete(URL).status_code == 405


@pytest.mark.django_db
def test_alice_unavailable_still_returns_django(admin_client, monkeypatch):
    alice = FakeProvider(FakeClient(error=LndUnavailable("Nœud LND injoignable.")))
    _patch_nodes(monkeypatch, alice, None)
    response = admin_client.get(URL)
    assert response.status_code == status.HTTP_200_OK
    body = response.data
    assert body["alice"]["status"] == "unavailable"
    assert body["alice"]["connected"] is False
    assert body["alice"]["block_height"] is None
    assert body["bob"]["status"] == "not_configured"
    assert body["django"]["status"] == "ok"
    assert body["postgres"]["status"] == "up"


@pytest.mark.django_db
def test_bob_unavailable_does_not_fail_alice(admin_client, monkeypatch):
    alice = FakeProvider(FakeClient(info=ALICE_INFO), balance=9)
    bob = FakeProvider(FakeClient(error=LndUnavailable("Nœud LND injoignable.")))
    _patch_nodes(monkeypatch, alice, bob)
    response = admin_client.get(URL)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["alice"]["status"] == "connected"
    assert response.data["alice"]["alias"] == "alice"
    assert response.data["bob"]["status"] == "unavailable"
    assert response.data["postgres"]["status"] == "up"


@pytest.mark.django_db
def test_lnd_timeout_is_explicit(admin_client, monkeypatch):
    alice = FakeProvider(FakeClient(error=LndUnavailable("Délai d'attente LND dépassé.")))
    _patch_nodes(monkeypatch, alice, None)
    response = admin_client.get(URL)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["alice"]["status"] == "timeout"
    assert response.data["alice"]["connected"] is False
    assert "Traceback" not in str(response.data)


@pytest.mark.django_db
def test_cache_reuses_probe_without_second_lnd_call(admin_client, monkeypatch):
    calls: list[tuple[str, str]] = []
    alice = FakeProvider(FakeClient(info=ALICE_INFO, calls=calls), balance=1)
    _patch_nodes(monkeypatch, alice, None)
    first = admin_client.get(URL).data
    second = admin_client.get(URL).data
    assert first["cache_hit"] is False
    assert second["cache_hit"] is True
    assert second["alice"]["alias"] == first["alice"]["alias"]
    assert [item for item in calls if item == ("GET", "/v1/getinfo")] == [("GET", "/v1/getinfo")]


def test_concurrent_calls_share_one_probe(monkeypatch):
    from smartpay.infrastructure.snapshot import get_infrastructure_snapshot

    calls: list[tuple[str, str]] = []
    alice = FakeProvider(FakeClient(info=ALICE_INFO, delay=0.2, calls=calls), balance=1)
    _patch_nodes(monkeypatch, alice, None)
    monkeypatch.setattr(
        "smartpay.infrastructure.snapshot._payments_counts",
        lambda: {"recorded_count": 0, "lightning_settled_count": 0, "note": "test"},
    )
    monkeypatch.setattr("smartpay.infrastructure.snapshot._postgres_status", lambda: "up")
    results: list[dict] = []

    def worker():
        results.append(get_infrastructure_snapshot())

    threads = [threading.Thread(target=worker), threading.Thread(target=worker)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=5)
    assert len(results) == 2
    assert [item for item in calls if item == ("GET", "/v1/getinfo")] == [("GET", "/v1/getinfo")]
