# Sécurité — P01

## Principes

- Aucun secret Lightning (macaroon, seed, clé privée) n'est stocké en base applicative.
- Les chemins `LND_MACAROON_PATH` / `LND_TLS_CERT_PATH` sont réservés à une phase ultérieure et désignent des **fichiers**, pas des blobs.
- `.env` n'est pas versionné. `.env.example` ne contient que des placeholders `change-me-*-only`.
- JWT + permissions DRF : authentifié, propriétaire, rôle admin.
- Journalisation des créations de paiement via `AuditLog` sans secrets.
- Validation stricte des montants (entier ≥ 1, plafond configuré).
- Réseau Bitcoin forcé à `regtest` (contrainte SQL).
- Un paiement Mock ne peut pas avoir `is_lightning_settled=true` (contrainte SQL + machine à états).

## Contrôles d'accès

- Endpoints privés : `IsAuthenticated`.
- Détail paiement : `IsOwnerOrAdmin`.
- Liste paiements / simulations : filtrée sur le propriétaire, sauf rôle admin.
- Création de paiement rattaché à un commerçant : le commerçant doit appartenir à l'utilisateur.

## Ce qui n'est pas en place en P01

- WAF, rotation de secrets, HSM, durcissement réseau de production.
- Authentification multi-facteurs.
- Rate limiting avancé (un throttle DRF simple est actif hors tests).
