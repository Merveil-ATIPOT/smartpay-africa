from django.urls import path

from smartpay.wallets.views import WalletView

urlpatterns = [
    path("wallet/", WalletView.as_view(), name="wallet"),
]
