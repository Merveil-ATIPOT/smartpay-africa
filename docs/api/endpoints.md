# Endpoints API v1

Authentification : JWT Bearer (`POST /api/v1/auth/token/` avec `email` + `password`).

Les montants sont toujours des **entiers en satoshis**.

| Méthode | Chemin | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/health/` | non | Santé API, PostgreSQL, état Lightning |
| GET | `/api/v1/me/` | oui | Profil courant |
| GET | `/api/v1/wallet/` | oui | Portefeuille Mock ou nœud LND (pubkey + solde canal, **sans** macaroon) |
| GET | `/api/v1/payments/` | oui | Liste (propriétaire ou admin) |
| GET | `/api/v1/payments/{id}/` | oui | Détail + réconciliation LND si pending |
| POST | `/api/v1/payments/invoices/` | oui | Facture Mock (`mockln1`) ou BOLT11 Regtest (`lnbcrt`) |
| POST | `/api/v1/payments/preview/` | oui | Aperçu. Champ additif `encoded_invoice` pour l'estimation LND |
| POST | `/api/v1/payments/` | oui | Paiement sortant, idempotent. Champ additif `encoded_invoice` |
| GET | `/api/v1/transfers/simulations/` | oui | Simulations uniquement |

## Extension de contrat P02 (additive, documentée)

- `CreatePaymentRequest.encoded_invoice` : BOLT11 `lnbcrt…` obligatoire si `PAYMENT_PROVIDER=lnd_regtest`.
- `CreatePaymentRequest.confirm` : `true` par défaut. `false` est rejeté (confirmation explicite).
- `WalletConnection.channel_balance_sats` : solde de canal LND, 0 en Mock.
- `lightning_status` : `not_applicable` \| `pending` \| `settled` \| `failed` \| `expired`.

Les champs P01 restent valides. Les clients Mock ignorent `encoded_invoice`.

## Idempotence

`POST /api/v1/payments/` exige `Idempotency-Key` ou `idempotency_key`. Un rejeu renvoie `200` **sans renvoyer** le paiement LND.

Un même `payment_hash` Lightning n'est pas payé deux fois.

## Réconciliation

`python manage.py reconcile_payments` examine les paiements `pending`. Seul un lookup LND `SETTLED`/`SUCCEEDED` pose `is_lightning_settled=true`.
