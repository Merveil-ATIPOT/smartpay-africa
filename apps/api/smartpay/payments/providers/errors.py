from __future__ import annotations

from smartpay.core.exceptions import DomainError


class LndError(DomainError):
    """Erreur générique de communication LND."""


class LndUnavailable(LndError):
    """Nœud injoignable, timeout réseau ou TLS/macaroon invalide."""


class LndInvoiceError(LndError):
    """Facture invalide, expirée ou incohérente."""


class LndPaymentError(LndError):
    """Échec d'envoi (hors règlement non confirmé)."""
