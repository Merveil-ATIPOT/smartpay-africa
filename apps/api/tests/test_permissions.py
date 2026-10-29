import pytest
from rest_framework import status

from smartpay.payments.models import Payment


@pytest.mark.django_db
def test_private_endpoints_require_auth(api_client):
    for url in (
        "/api/v1/me/",
        "/api/v1/wallet/",
        "/api/v1/payments/",
        "/api/v1/transfers/simulations/",
        "/api/v1/transfers/",
        "/api/v1/transfers/destinations/",
    ):
        response = api_client.get(url)
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


@pytest.mark.django_db
def test_owner_can_read_own_payment(auth_client, user):
    payment = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.PENDING,
    )
    response = auth_client.get(f"/api/v1/payments/{payment.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["id"] == str(payment.id)


@pytest.mark.django_db
def test_other_user_cannot_read_payment(api_client, user, other_user):
    payment = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.PENDING,
    )
    api_client.force_authenticate(user=other_user)
    response = api_client.get(f"/api/v1/payments/{payment.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_can_read_any_payment(admin_client, user):
    payment = Payment.objects.create(
        owner=user,
        amount_sats=1000,
        direction=Payment.Direction.OUTGOING,
        status=Payment.Status.PENDING,
    )
    response = admin_client.get(f"/api/v1/payments/{payment.id}/")
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_list_is_scoped_to_owner(auth_client, user, other_user):
    Payment.objects.create(owner=user, amount_sats=1000, direction=Payment.Direction.OUTGOING)
    Payment.objects.create(owner=other_user, amount_sats=2000, direction=Payment.Direction.OUTGOING)
    response = auth_client.get("/api/v1/payments/")
    assert response.status_code == status.HTTP_200_OK
    ids_owners_amounts = {item["amount_sats"] for item in response.data["results"]}
    assert ids_owners_amounts == {1000}
