"""Paramètres Django partagés — SmartPay Africa P01."""

from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
_PARENTS = list(BASE_DIR.parents)
# Sur l'hôte : .../smartpay-africa/apps/api → repo = parents[1].
# Dans l'image Docker WORKDIR=/app → un seul parent (/), on reste sur BASE_DIR.
REPO_ROOT = _PARENTS[1] if len(_PARENTS) > 1 else BASE_DIR

load_dotenv(REPO_ROOT / ".env")
load_dotenv(BASE_DIR / ".env")


def env(name: str, default: str | None = None) -> str | None:
    return os.environ.get(name, default)


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = env("DJANGO_SECRET_KEY", "insecure-dev-placeholder-not-for-production")
DEBUG = False
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
    "smartpay.core.apps.CoreConfig",
    "smartpay.accounts.apps.AccountsConfig",
    "smartpay.merchants.apps.MerchantsConfig",
    "smartpay.wallets.apps.WalletsConfig",
    "smartpay.payments.apps.PaymentsConfig",
    "smartpay.transfers.apps.TransfersConfig",
    "smartpay.exchange_rates.apps.ExchangeRatesConfig",
    "smartpay.ai_assistant.apps.AiAssistantConfig",
    "smartpay.audit.apps.AuditConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", "smartpay"),
        "USER": env("POSTGRES_USER", "smartpay"),
        "PASSWORD": env("POSTGRES_PASSWORD", "change-me-local-only"),
        "HOST": env("POSTGRES_HOST", "127.0.0.1"),
        "PORT": env("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

AUTH_USER_MODEL = "accounts.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "smartpay.core.pagination.SmartPayPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "user": "120/min",
        "anon": "30/min",
    },
    "EXCEPTION_HANDLER": "smartpay.core.exceptions.smartpay_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(env("JWT_ACCESS_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(env("JWT_REFRESH_DAYS", "7"))),
    "SIGNING_KEY": env("JWT_SIGNING_KEY", SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "SmartPay Africa API",
    "DESCRIPTION": (
        "API MVP hackathon. Bitcoin Regtest uniquement. "
        "Le fournisseur Mock ne produit jamais un règlement Lightning."
    ),
    "VERSION": "0.6.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

PAYMENT_PROVIDER = env("PAYMENT_PROVIDER", "mock")
BITCOIN_NETWORK = env("BITCOIN_NETWORK", "regtest")
MAX_PAYMENT_AMOUNT_SATS = 10_000_000_000
SUPPORTED_COUNTRIES = ("SN", "CG", "CI")

# Devis de transfert international — taux fictif, pas un cours de marché.
TRANSFER_DEMO_FCFA_PER_BTC = int(env("TRANSFER_DEMO_FCFA_PER_BTC", "43300000"))
TRANSFER_DEMO_FEE_SATS = int(env("TRANSFER_DEMO_FEE_SATS", "1"))
TRANSFER_QUOTE_TTL_SECONDS = int(env("TRANSFER_QUOTE_TTL_SECONDS", "300"))
TRANSFER_QUOTE_VERSION = env("TRANSFER_QUOTE_VERSION", "demo-b1-v1")
TRANSFER_MIN_AMOUNT_LOCAL = int(env("TRANSFER_MIN_AMOUNT_LOCAL", "100"))
TRANSFER_MAX_AMOUNT_LOCAL = int(env("TRANSFER_MAX_AMOUNT_LOCAL", "50000000"))
TRANSFER_INVOICE_EXPIRY_SECONDS = int(env("TRANSFER_INVOICE_EXPIRY_SECONDS", "600"))
TRANSFER_MAX_ROUTING_FEE_SATS = int(env("TRANSFER_MAX_ROUTING_FEE_SATS", "50"))
TRANSFER_CREDIT_DISCLAIMER = (
    "Crédit Mobile Money simulé. Aucun opérateur réel n'a été contacté. "
    "Aucun SMS n'a été envoyé. Ceci n'est pas un paiement bancaire."
)

def _abs_secret_path(raw: str | None) -> str:
    if not raw:
        return ""
    path = Path(raw)
    if path.is_absolute():
        return str(path)
    return str((REPO_ROOT / path).resolve())


# Chemins fichiers uniquement — jamais le contenu d'un macaroon ou d'une seed.
LND_REST_URL = env("LND_REST_URL", "")
LND_MACAROON_PATH = _abs_secret_path(env("LND_MACAROON_PATH", ""))
LND_TLS_CERT_PATH = _abs_secret_path(env("LND_TLS_CERT_PATH", ""))
LND_TIMEOUT_SECONDS = int(env("LND_TIMEOUT_SECONDS", "30"))
LND_LOOKUP_RETRY_ATTEMPTS = int(env("LND_LOOKUP_RETRY_ATTEMPTS", "8"))
LND_LOOKUP_RETRY_DELAY_SECONDS = float(env("LND_LOOKUP_RETRY_DELAY_SECONDS", "0.4"))

# Nœud Bob — contrepartie laboratoire uniquement, jamais le portefeuille utilisateur.
LND_BOB_REST_URL = env("LND_BOB_REST_URL", "")
LND_BOB_MACAROON_PATH = _abs_secret_path(env("LND_BOB_MACAROON_PATH", ""))
LND_BOB_TLS_CERT_PATH = _abs_secret_path(env("LND_BOB_TLS_CERT_PATH", ""))
LAB_COUNTERPARTY_ENABLED = env_bool("LAB_COUNTERPARTY_ENABLED", False)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "jsonish": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "jsonish",
        }
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "smartpay": {"level": "INFO", "propagate": True},
        "django.security": {"level": "INFO", "propagate": True},
    },
}
