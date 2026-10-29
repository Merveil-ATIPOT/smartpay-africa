import pytest
from django.db import IntegrityError

from smartpay.transfers.models import TRANSFER_MODE, Transfer
from smartpay.transfers.state import DRAFT


@pytest.mark.django_db
def test_create_transfer_defaults(user):
    transfer = Transfer.objects.create(
        owner=user,
        public_reference="SPA-TESTCREATE01",
        source_country="SN",
        destination_country="CI",
        currency="XOF",
    )
    assert transfer.status == DRAFT
    assert transfer.execution_mode == TRANSFER_MODE
    assert transfer.lightning_payment_id is None
    assert transfer.lightning_payment_hash == ""
    assert transfer.mobile_money_credit_status == Transfer.CreditStatus.NONE
    assert isinstance(transfer.amount_local, int)


@pytest.mark.django_db
def test_forbidden_destination_france(user):
    with pytest.raises(IntegrityError):
        Transfer.objects.create(
            owner=user,
            public_reference="SPA-TESTFRANCE01",
            destination_country="FR",
        )


@pytest.mark.django_db
def test_forbidden_source_country(user):
    with pytest.raises(IntegrityError):
        Transfer.objects.create(
            owner=user,
            public_reference="SPA-TESTSOURCE01",
            source_country="FR",
        )


@pytest.mark.django_db
def test_idempotency_unique_per_owner(user):
    Transfer.objects.create(
        owner=user,
        public_reference="SPA-TESTIDEM0001",
        idempotency_key="same-key",
    )
    with pytest.raises(IntegrityError):
        Transfer.objects.create(
            owner=user,
            public_reference="SPA-TESTIDEM0002",
            idempotency_key="same-key",
        )
