"""Paramètres de production — préparés uniquement, non déployés."""

from .base import *  # noqa: F403
from smartpay.core.security import assert_hardened_settings

DEBUG = False
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

assert_hardened_settings(
    debug=DEBUG,
    secret_key=SECRET_KEY,  # noqa: F405
    jwt_key=SIMPLE_JWT["SIGNING_KEY"],  # noqa: F405
    allowed_hosts=ALLOWED_HOSTS,  # noqa: F405
)
