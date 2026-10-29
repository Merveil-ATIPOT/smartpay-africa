from django.urls import path

from smartpay.payments.views import (
    PaymentDetailView,
    PaymentInvoiceCreateView,
    PaymentListCreateView,
    PaymentPreviewView,
)

urlpatterns = [
    path("payments/", PaymentListCreateView.as_view(), name="payment-list"),
    path("payments/invoices/", PaymentInvoiceCreateView.as_view(), name="payment-invoice-create"),
    path("payments/preview/", PaymentPreviewView.as_view(), name="payment-preview"),
    path("payments/<uuid:payment_id>/", PaymentDetailView.as_view(), name="payment-detail"),
]
