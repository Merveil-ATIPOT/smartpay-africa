from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from smartpay.accounts.models import User
from smartpay.transfers.phone import normalize_e164

# MVP démo : message explicite. En production, ce libellé permet d'énumérer
# les comptes existants (tester si un e-mail est déjà inscrit).
EMAIL_ALREADY_USED = "Cet e-mail est déjà utilisé."
TERMS_REQUIRED = "Vous devez accepter les conditions d'utilisation."


def _collapse_spaces(value: str) -> str:
    return " ".join(value.split())


def normalize_register_email(value: str) -> str:
    """Espace, domaine Django, puis minuscules sur l'adresse entière."""
    return User.objects.normalize_email(_collapse_spaces(value)).lower()


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


class AdminUserSerializer(serializers.ModelSerializer):
    """Lecture administrateur. Liste blanche. Aucun secret ni last_login."""

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


class LogoutSerializer(serializers.Serializer):
    """Corps de déconnexion. Le jeton n'est jamais renvoyé ni journalisé."""

    refresh = serializers.CharField(allow_blank=False, trim_whitespace=True, write_only=True)


class RegisterCreatedSerializer(serializers.ModelSerializer):
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
        )
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    """Inscription Particulier. Champs sensibles hors du body ignorés."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)
    country = serializers.ChoiceField(choices=User.Country.choices)
    phone_number = serializers.CharField(max_length=20)
    accepted_terms = serializers.BooleanField()

    def validate_first_name(self, value: str) -> str:
        name = _collapse_spaces(value)
        if not name:
            raise serializers.ValidationError("Le prénom est obligatoire.")
        return name

    def validate_last_name(self, value: str) -> str:
        name = _collapse_spaces(value)
        if not name:
            raise serializers.ValidationError("Le nom est obligatoire.")
        return name

    def validate_email(self, value: str) -> str:
        email = normalize_register_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(EMAIL_ALREADY_USED)
        return email

    def validate_accepted_terms(self, value: bool) -> bool:
        if value is not True:
            raise serializers.ValidationError(TERMS_REQUIRED)
        return True

    def validate(self, attrs):
        raw_phone = attrs["phone_number"]
        if any(ch.isalpha() for ch in raw_phone):
            raise serializers.ValidationError(
                {
                    "phone_number": (
                        "Le numéro de téléphone ne doit contenir que des chiffres, "
                        "espaces ou un indicatif."
                    )
                }
            )
        try:
            attrs["phone_number"] = normalize_e164(attrs["country"], raw_phone)
        except ValueError as exc:
            raise serializers.ValidationError({"phone_number": str(exc)}) from exc

        candidate = User(
            email=attrs["email"],
            first_name=attrs["first_name"],
            last_name=attrs["last_name"],
            country=attrs["country"],
            phone_number=attrs["phone_number"],
        )
        try:
            validate_password(attrs["password"], candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        validated_data.pop("accepted_terms")
        password = validated_data.pop("password")
        try:
            with transaction.atomic():
                return User.objects.create_user(
                    password=password,
                    role=User.Role.INDIVIDUAL,
                    is_staff=False,
                    is_superuser=False,
                    is_active=True,
                    **validated_data,
                )
        except IntegrityError as exc:
            raise serializers.ValidationError({"email": EMAIL_ALREADY_USED}) from exc
