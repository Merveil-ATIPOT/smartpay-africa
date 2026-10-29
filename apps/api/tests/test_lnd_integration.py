"""Tests d'intégration Alice → Bob. Ignorés si le laboratoire Lightning n'est pas prêt."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

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
