from __future__ import annotations

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra_fields):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        email = self.normalize_email(email)
        extra_fields.setdefault("country", User.Country.SN)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", User.Role.INDIVIDUAL)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superutilisateur doit avoir is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        INDIVIDUAL = "individual", _("Particulier")
        STUDENT = "student", _("Étudiant")
        MERCHANT = "merchant", _("Commerçant")
        BUSINESS = "business", _("Entreprise")
        ADMIN = "admin", _("Administrateur")

    class Country(models.TextChoices):
        SN = "SN", _("Sénégal")
        CG = "CG", _("Congo-Brazzaville")
        CI = "CI", _("Côte d'Ivoire")

    username = None
    email = models.EmailField(_("e-mail"), unique=True)
    phone_number = models.CharField(_("téléphone"), max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.INDIVIDUAL)
    country = models.CharField(max_length=2, choices=Country.choices, default=Country.SN)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        verbose_name = _("utilisateur")
        verbose_name_plural = _("utilisateurs")

    def __str__(self) -> str:
        return self.email

    @property
    def is_admin_role(self) -> bool:
        return self.role == self.Role.ADMIN or self.is_staff or self.is_superuser
