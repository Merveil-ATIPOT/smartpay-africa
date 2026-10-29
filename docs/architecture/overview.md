# Architecture SmartPay Africa — P02

## Objectif

Stabiliser P01 puis opérer un laboratoire **Bitcoin Regtest** avec Bitcoin Core et deux nœuds LND (Alice, Bob). Aucun Mainnet, aucun FCFA réel.

## Découpage

| Zone | Rôle P02 |
| --- | --- |
| `apps/api` | API Django REST, Mock **et** LND Regtest |
| `apps/admin-web` | Squelette Next.js 15, hors Stitch |
| `apps/mobile` | Squelette Expo 52, hors Stitch |
| `packages/contracts` | OpenAPI 3 + types TypeScript |
| `compose.yaml` | PostgreSQL 16 (hôte **5433**) + API |
| `infrastructure/lightning-regtest` | bitcoind + LND Alice/Bob, réseau `smartpay-lightning` |

## Fournisseurs de paiement

- `MockPaymentProvider` : factures `mockln1…`, `is_lightning_settled=false` toujours.
- `LndRegtestPaymentProvider` : factures `lnbcrt…`, REST LND authentifié par macaroon **fichier**. Un HTTP 200 n'est pas une preuve de règlement : le lookup LND (`SETTLED` / `SUCCEEDED`) l'est.

`PAYMENT_PROVIDER=mock` ou `lnd_regtest`.

## Flux Lightning

1. `POST /api/v1/payments/preview/` avec `encoded_invoice` (estimation de frais si disponible).
2. `POST /api/v1/payments/` avec `encoded_invoice` + `Idempotency-Key` + `confirm=true` = confirmation explicite.
3. L'adaptateur envoie le paiement, puis **lookup**.
4. `GET /api/v1/payments/{id}/` et `manage.py reconcile_payments` réconcilient les statuts `pending`.

## Réseaux Docker

- `smartpay` : API + PostgreSQL.
- `smartpay-lightning` : bitcoind, lnd-alice, lnd-bob.
- RPC Bitcoin et gRPC LND non publiés. REST LND lié à `127.0.0.1` uniquement.

## Hors P02

- Bitcoin Mainnet
- Dépôts FCFA, Wave / Orange Money / MTN
- Assistant IA
- Écrans Stitch / M08 M13 M15 M20
- Déploiement
