# Endpoints API v1

Authentification : JWT Bearer (`POST /api/v1/auth/token/` avec `email` + `password`).

Les montants sont toujours des **entiers en satoshis**.

| Méthode | Chemin | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/health/` | non | Santé API + PostgreSQL |
| GET | `/api/v1/me/` | oui | Profil courant |
| GET | `/api/v1/wallet/` | oui | Portefeuille Mock |
| GET | `/api/v1/payments/` | oui | Liste (propriétaire ou admin) |
| GET | `/api/v1/payments/{id}/` | oui | Détail, contrôle propriétaire |
| POST | `/api/v1/payments/invoices/` | oui | Facture Mock (`mockln1…`) |
| POST | `/api/v1/payments/preview/` | oui | Aperçu, frais Mock = 0 |
| POST | `/api/v1/payments/` | oui | Paiement sortant, idempotent |
| GET | `/api/v1/transfers/simulations/` | oui | Simulations uniquement |

Contrat machine : `packages/contracts/openapi/openapi.yaml`.
Schéma généré : `GET /api/schema/` (drf-spectacular).

## Idempotence

`POST /api/v1/payments/` exige `Idempotency-Key` (en-tête) ou `idempotency_key` (corps). Un rejeu renvoie `200` avec la même ressource.
