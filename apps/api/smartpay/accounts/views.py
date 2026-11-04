from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from smartpay.accounts.admin_directory import directory_summary, filter_directory
from smartpay.accounts.models import User
from smartpay.accounts.serializers import (
    AdminUserSerializer,
    LogoutSerializer,
    MeSerializer,
    RegisterCreatedSerializer,
    RegisterSerializer,
)
from smartpay.accounts.throttling import (
    LoginRateThrottle,
    LogoutRateThrottle,
    RegisterRateThrottle,
)
from smartpay.core.pagination import SmartPayPagination
from smartpay.core.permissions import IsAdminRole


class LoginTokenObtainPairView(TokenObtainPairView):
    """Login JWT inchangé, avec quota dédié. N'applique pas le throttle au refresh."""

    throttle_classes = [LoginRateThrottle]


class LogoutView(APIView):
    """Révoque un refresh token SimpleJWT. N'invalide pas l'access déjà émis."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LogoutRateThrottle]

    @extend_schema(
        request=LogoutSerializer,
        responses={204: None, 400: None},
        auth=None,
        description=(
            "Révoque le refresh token. 204 si le champ est présent, y compris "
            "jeton déjà révoqué, expiré ou invalide. 400 si refresh absent ou vide. "
            "L'access token déjà émis reste valable jusqu'à expiration."
        ),
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw = serializer.validated_data["refresh"]
        try:
            RefreshToken(raw).blacklist()
        except TokenError:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class RegisterView(APIView):
    """Inscription publique. Aucun JWT n'est émis. Rôle forcé : individual."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RegisterRateThrottle]

    @extend_schema(
        request=RegisterSerializer,
        responses={201: RegisterCreatedSerializer},
        auth=None,
        description=(
            "Crée un compte Particulier. Aucun JWT n'est renvoyé. "
            "Le téléphone est un contact non vérifié. "
            "Le rôle et les drapeaux staff/superuser sont imposés côté serveur. "
            "MVP démo : un e-mail déjà utilisé est annoncé explicitement "
            "(risque d'énumération en production)."
        ),
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(RegisterCreatedSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserListView(APIView):
    """GET /api/v1/admin/users/ — lecture seule, administrateur uniquement."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        responses={200: AdminUserSerializer(many=True)},
        description="Annuaire PostgreSQL paginé. Aucun secret. Aucune mutation.",
    )
    def get(self, request):
        qs = filter_directory(
            User.objects.all(),
            q=request.query_params.get("q", ""),
            role=request.query_params.get("role", ""),
            country=request.query_params.get("country", ""),
            is_active=request.query_params.get("is_active", ""),
        )
        paginator = SmartPayPagination()
        page = paginator.paginate_queryset(qs, request)
        return Response(
            {
                "count": paginator.page.paginator.count,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
                "results": AdminUserSerializer(page, many=True).data,
                "summary": directory_summary(),
            }
        )


class AdminUserDetailView(APIView):
    """GET /api/v1/admin/users/{id}/ — fiche lecture seule."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        responses={200: AdminUserSerializer},
        description="Fiche d'un compte PostgreSQL. 404 si inconnu. Aucun secret.",
    )
    def get(self, request, user_id: int):
        try:
            account = User.objects.get(pk=user_id)
        except User.DoesNotExist as exc:
            raise NotFound("Utilisateur introuvable.") from exc
        return Response(AdminUserSerializer(account).data)
