from django.urls import path

from smartpay.merchants.views import AdminMerchantDetailView, AdminMerchantListView

urlpatterns = [
    path("admin/merchants/", AdminMerchantListView.as_view(), name="admin-merchants"),
    path("admin/merchants/<int:merchant_id>/", AdminMerchantDetailView.as_view(), name="admin-merchant-detail"),
]
