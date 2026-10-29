from django.urls import path

from smartpay.transfers.views import (
    DestinationListView,
    DestinationOperatorsView,
    StandaloneQuoteView,
    TransferBeneficiaryView,
    TransferConfirmView,
    TransferDetailView,
    TransferListCreateView,
    TransferPaymentPreviewView,
    TransferQuoteView,
    TransferReadyView,
    TransferReconcileView,
    TransferResultView,
    TransferSimulationListView,
    TransferStatusView,
)

urlpatterns = [
    path("transfers/simulations/", TransferSimulationListView.as_view(), name="transfer-simulations"),
    path("transfers/destinations/", DestinationListView.as_view(), name="transfer-destinations"),
    path(
        "transfers/destinations/<str:code>/operators/",
        DestinationOperatorsView.as_view(),
        name="transfer-destination-operators",
    ),
    path("transfers/quotes/", StandaloneQuoteView.as_view(), name="transfer-quotes"),
    path("transfers/", TransferListCreateView.as_view(), name="transfer-list"),
    path("transfers/<uuid:transfer_id>/", TransferDetailView.as_view(), name="transfer-detail"),
    path("transfers/<uuid:transfer_id>/status/", TransferStatusView.as_view(), name="transfer-status"),
    path(
        "transfers/<uuid:transfer_id>/beneficiary/",
        TransferBeneficiaryView.as_view(),
        name="transfer-beneficiary",
    ),
    path("transfers/<uuid:transfer_id>/quote/", TransferQuoteView.as_view(), name="transfer-quote"),
    path("transfers/<uuid:transfer_id>/ready/", TransferReadyView.as_view(), name="transfer-ready"),
    path(
        "transfers/<uuid:transfer_id>/preview-payment/",
        TransferPaymentPreviewView.as_view(),
        name="transfer-preview-payment",
    ),
    path("transfers/<uuid:transfer_id>/confirm/", TransferConfirmView.as_view(), name="transfer-confirm"),
    path("transfers/<uuid:transfer_id>/result/", TransferResultView.as_view(), name="transfer-result"),
    path("transfers/<uuid:transfer_id>/reconcile/", TransferReconcileView.as_view(), name="transfer-reconcile"),
]
