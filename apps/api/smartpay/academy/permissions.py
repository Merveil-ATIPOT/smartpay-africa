"""Permissions Academy : owner-only, y compris pour un administrateur."""

from __future__ import annotations

from rest_framework.permissions import BasePermission


class IsAcademyOwner(BasePermission):
    """Le propriétaire seul lit ou écrit sa progression. Pas d'exception admin."""

    owner_field = "owner"

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        owner_field = getattr(view, "owner_field", self.owner_field)
        owner = getattr(obj, owner_field, None)
        return owner == request.user
