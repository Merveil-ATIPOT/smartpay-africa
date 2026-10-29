from django.urls import path

from smartpay.accounts.views import MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
]
