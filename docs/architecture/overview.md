# Architecture SmartPay Africa — P03

## Objectif

Stabiliser P01 puis opérer un laboratoire **Bitcoin Regtest** avec Bitcoin Core et deux nœuds LND (Alice, Bob). Aucun Mainnet, aucun FCFA réel.

## Découpage

| Zone | Rôle P02 |
| --- | --- |
| `apps/api` | API Django REST, Mock **et** LND Regtest |
| `apps/admin-web` | Squelette Next.js 15, hors Stitch |
| `apps/mobile` | Expo 52 — M08 Dashboard, M13 Scanner, M15 Confirm, M20 Recevoir |
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

## Client mobile (P03)

Le mobile parle **uniquement** à Django (`EXPO_PUBLIC_API_URL` ou override Profil). JWT dans Expo SecureStore. Le scan QR appelle `preview`, jamais `payments` create. Un HTTP 200 n'est jamais affiché comme règlement Lightning. Mock ≠ settled.

Pour tester LND sans changer le frontend : pointer l'API vers une instance Django `PAYMENT_PROVIDER=lnd_regtest`. Docker Compose reste Mock par défaut.

## Hors P03

- Bitcoin Mainnet
- Dépôts FCFA, Wave / Orange Money / MTN
- Assistant IA
- Déploiement
