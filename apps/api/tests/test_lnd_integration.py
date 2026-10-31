"""Tests d'intégration Alice → Bob. Ignorés si le laboratoire Lightning n'est pas prêt."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from uuid import uuid4

import pytest
from django.conf import settings as django_settings

def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "infrastructure" / "lightning-regtest" / "compose.yaml").exists():
            return parent
    parents = list(here.parents)
    return parents[min(1, len(parents) - 1)]


REPO = _repo_root()
COMPOSE = REPO / "infrastructure" / "lightning-regtest" / "compose.yaml"


def _lncli(node: str, *args: str) -> dict:
    result = subprocess.run(
        ["docker", "compose", "-f", str(COMPOSE), "exec", "-T", f"lnd-{node}", "lncli", "--network=regtest", *args],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        pytest.skip(f"lncli {node} indisponible: {result.stderr[-300:]}")
    return json.loads(result.stdout)


def _lab_ready() -> bool:
    try:
        result = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Running}}", "smartpay-lnd-alice"],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return False
    return result.returncode == 0 and result.stdout.strip() == "true"


@pytest.mark.lnd
@pytest.mark.django_db
def test_alice_pays_bob_on_regtest(user):
    if not _lab_ready():
        pytest.skip("Laboratoire Lightning non démarré.")
    invoice = _lncli("bob", "addinvoice", "--amt=2500", "--memo=pytest-p02")
    pay_req = invoice["payment_request"]
    assert pay_req.startswith("lnbcrt")
    subprocess.run(
        [
            "docker",
            "compose",
            "-f",
            str(COMPOSE),
            "exec",
            "-T",
            "lnd-alice",
            "lncli",
            "--network=regtest",
            "payinvoice",
            "--force",
            pay_req,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    lookup = _lncli("bob", "lookupinvoice", invoice["r_hash"])
    assert lookup.get("settled") is True or lookup.get("state") == "SETTLED"
    from smartpay.payments.models import Payment

    payment = Payment.objects.create(
        owner=user,
        amount_sats=2500,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.PENDING,
        settlement_mode=Payment.SettlementMode.LIGHTNING_REGTEST,
        provider_reference=invoice["r_hash"],
        encoded_invoice=pay_req,
        description="pytest-p02-persisted",
    )
    payment.refresh_from_db()
    assert Payment.objects.filter(pk=payment.pk, amount_sats=2500).exists()
    assert django_settings.PAYMENT_PROVIDER in {"mock", "lnd_regtest"}


@pytest.mark.lnd
@pytest.mark.django_db
def test_django_alice_pays_bob_invoice(user, settings):
    """E2E Django : facture Bob, paiement Alice, lookup LND avant is_lightning_settled.

    Activé uniquement avec RUN_LND_E2E=1 pour ne pas payer à chaque pytest.
    """
    import os

    from smartpay.payments.providers.lnd_client import LndRestClient
    from smartpay.payments.providers.lnd_regtest import LndRegtestPaymentProvider
    from smartpay.payments.services import create_outgoing_payment

    if os.environ.get("RUN_LND_E2E") != "1":
        pytest.skip("Définir RUN_LND_E2E=1 pour le paiement Django Alice → Bob.")

    alice_mac = Path("/run/lnd/alice/admin.macaroon")
    bob_mac = Path("/run/lnd/bob/admin.macaroon")
    host_alice = REPO / "infrastructure" / "lightning-regtest" / "secrets" / "alice" / "admin.macaroon"
    host_bob = REPO / "infrastructure" / "lightning-regtest" / "secrets" / "bob" / "admin.macaroon"

    if alice_mac.is_file() and bob_mac.is_file():
        alice_url, bob_url = "https://lnd-alice:8080", "https://lnd-bob:8080"
        alice_tls = "/run/lnd/alice/tls.cert"
        bob_tls = "/run/lnd/bob/tls.cert"
        alice_macaroon, bob_macaroon = str(alice_mac), str(bob_mac)
    elif host_alice.is_file() and host_bob.is_file():
        alice_url, bob_url = "https://127.0.0.1:8081", "https://127.0.0.1:8082"
        alice_tls = str(REPO / "infrastructure" / "lightning-regtest" / "secrets" / "alice" / "tls.cert")
        bob_tls = str(REPO / "infrastructure" / "lightning-regtest" / "secrets" / "bob" / "tls.cert")
        alice_macaroon, bob_macaroon = str(host_alice), str(host_bob)
    else:
        pytest.skip("Secrets LND absents.")

    settings.PAYMENT_PROVIDER = "lnd_regtest"
    settings.LND_REST_URL = alice_url
    settings.LND_MACAROON_PATH = alice_macaroon
    settings.LND_TLS_CERT_PATH = alice_tls
    settings.LND_BOB_REST_URL = bob_url
    settings.LND_BOB_MACAROON_PATH = bob_macaroon
    settings.LND_BOB_TLS_CERT_PATH = bob_tls
    settings.LND_LOOKUP_RETRY_ATTEMPTS = 12
    settings.LND_LOOKUP_RETRY_DELAY_SECONDS = 0.5
    settings.LAB_COUNTERPARTY_ENABLED = True

    bob = LndRegtestPaymentProvider(
        client=LndRestClient(
            rest_url=bob_url,
            macaroon_path=bob_macaroon,
            tls_cert_path=bob_tls,
            timeout_seconds=30,
        )
    )
    draft = bob.create_invoice(amount_sats=1500, memo="pytest-p04-django", expiry_seconds=3600)
    assert draft.encoded_invoice.startswith("lnbcrt")
    key = f"p04-e2e-django-{uuid4().hex[:12]}"
    payment, created = create_outgoing_payment(
        user=user,
        amount_sats=1500,
        description="pytest-p04-django",
        idempotency_key=key,
        encoded_invoice=draft.encoded_invoice,
    )
    assert created is True
    assert payment.is_lightning_settled is True
    assert payment.status == "confirmed"
    replay, created_again = create_outgoing_payment(
        user=user,
        amount_sats=1500,
        description="pytest-p04-django",
        idempotency_key=key,
        encoded_invoice=draft.encoded_invoice,
    )
    assert created_again is False
    assert replay.id == payment.id
    lookup = bob.lookup_invoice(draft.payment_hash)
    assert lookup.settled is True
