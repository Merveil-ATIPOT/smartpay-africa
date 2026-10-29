from rest_framework import serializers

from smartpay.accounts.models import User


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "country",
            "is_active",
            "date_joined",
        )
        read_only_fields = fields
