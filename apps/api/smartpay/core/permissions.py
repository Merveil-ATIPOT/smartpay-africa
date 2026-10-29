"""Contrôles d'accès par propriétaire et par rôle."""

from __future__ import annotations

from rest_framework.permissions import BasePermission, SAFE_METHODS


def _is_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_staff or user.is_superuser or getattr(user, "role", None) == "admin")


class IsAdminRole(BasePermission):
    def has_permission(self, request, view) -> bool:
        return _is_admin(request.user)


class IsOwnerOrAdmin(BasePermission):
    """Autorise le propriétaire de la ressource ou un administrateur."""

    owner_field = "owner"

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        if _is_admin(request.user):
            return True
        owner_field = getattr(view, "owner_field", self.owner_field)
        owner = getattr(obj, owner_field, None)
        if owner is None and hasattr(obj, "user"):
            owner = obj.user
        if owner is None and hasattr(obj, "initiator"):
            owner = obj.initiator
        return owner == request.user


class IsMerchantOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        if _is_admin(request.user):
            return True
        merchant = getattr(obj, "merchant", obj)
        owner = getattr(merchant, "owner", None)
        return owner == request.user


class ReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        return request.method in SAFE_METHODS
