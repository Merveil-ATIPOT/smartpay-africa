from django.urls import path

from smartpay.transfers.views import TransferSimulationListView

urlpatterns = [
    path("transfers/simulations/", TransferSimulationListView.as_view(), name="transfer-simulations"),
]
