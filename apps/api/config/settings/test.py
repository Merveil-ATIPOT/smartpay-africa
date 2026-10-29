"""Paramètres de test : SQLite en mémoire, hasher rapide, mock forcé."""

from .base import *  # noqa: F403

DEBUG = False
SECRET_KEY = "test-secret-key-not-for-production"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PAYMENT_PROVIDER = "mock"
BITCOIN_NETWORK = "regtest"
LAB_COUNTERPARTY_ENABLED = False
LND_LOOKUP_RETRY_ATTEMPTS = 1
LND_LOOKUP_RETRY_DELAY_SECONDS = 0
LND_REST_URL = ""
LND_MACAROON_PATH = ""
LND_TLS_CERT_PATH = ""
LND_BOB_REST_URL = ""
LND_BOB_MACAROON_PATH = ""
LND_BOB_TLS_CERT_PATH = ""
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = ()  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {}  # noqa: F405

STORAGES["staticfiles"] = {  # noqa: F405
    "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}
