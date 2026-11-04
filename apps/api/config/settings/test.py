"""Paramètres de test : SQLite en mémoire, hasher rapide, mock forcé."""

from .base import *  # noqa: F403

# Garde-fou : si base n'inclut plus token_blacklist, les tests SQLite l'ajoutent.
if "rest_framework_simplejwt.token_blacklist" not in INSTALLED_APPS:  # noqa: F405
    INSTALLED_APPS = [  # noqa: F405
        *INSTALLED_APPS,  # noqa: F405
        "rest_framework_simplejwt.token_blacklist",
    ]

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
TRANSFER_CONFIRM_ENABLED = False
LAB_COUNTERPARTY_ALLOW_EMAILS = []
LND_LOOKUP_RETRY_ATTEMPTS = 1
LND_LOOKUP_RETRY_DELAY_SECONDS = 0
LND_REST_URL = ""
LND_MACAROON_PATH = ""
LND_TLS_CERT_PATH = ""
LND_BOB_REST_URL = ""
LND_BOB_MACAROON_PATH = ""
LND_BOB_TLS_CERT_PATH = ""
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Les vues sans throttle_classes restent libres. RegisterView a un throttle dédié :
# quota élevé ici pour ne pas faire échouer la suite, testé à part avec override.
AUTH_REGISTER_THROTTLE_RATE = "1000/min"
AUTH_LOGIN_THROTTLE_RATE = "1000/min"
AUTH_LOGOUT_THROTTLE_RATE = "1000/min"
AUTH_AI_MESSAGE_THROTTLE_RATE = "1000/min"
AUTH_ACADEMY_QUIZ_THROTTLE_RATE = "1000/min"
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = ()  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "register": AUTH_REGISTER_THROTTLE_RATE,
    "login": AUTH_LOGIN_THROTTLE_RATE,
    "logout": AUTH_LOGOUT_THROTTLE_RATE,
    "ai_message": AUTH_AI_MESSAGE_THROTTLE_RATE,
    "academy_quiz": AUTH_ACADEMY_QUIZ_THROTTLE_RATE,
}

STORAGES["staticfiles"] = {  # noqa: F405
    "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}
