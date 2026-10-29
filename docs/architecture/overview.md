# Architecture SmartPay Africa — P01

## Objectif

Poser une base monorepo testable pour un MVP hackathon de paiements Bitcoin Lightning, exclusivement en **Regtest**, sans argent réel.

## Découpage

| Zone | Rôle P01 |
| --- | --- |
| `apps/api` | API Django REST, source de vérité métier |
| `apps/admin-web` | Squelette Next.js, pas d'écrans Stitch |
| `apps/mobile` | Squelette Expo, pas d'écrans Stitch |
| `packages/contracts` | OpenAPI + types TypeScript |
| `packages/design-tokens` | Couleurs et espacements partagés |
| `infrastructure/lightning-regtest` | Compose LND/bitcoind **non démarré** |

## Flux de paiement P01

1. Le client authentifié appelle `POST /api/v1/payments/preview/`.
2. Le `PaymentProvider` actif est **Mock**.
3. Une facture (`POST /api/v1/payments/invoices/`) ou un paiement sortant (`POST /api/v1/payments/`) est enregistré en satoshis entiers.
4. `settlement_mode=mock` et `is_lightning_settled=false` sont imposés.
5. Un `AuditLog` est écrit. Aucune clé privée n'est persistée.

L'adaptateur `LndRegtestPaymentProvider` existe comme interface et lève `NotImplementedError`.

## Statuts

`created` → `pending` → `confirmed` | `failed` | `expired`

`confirmed` côté Mock signifie un accusé de réception métier, **pas** un règlement Lightning.

## Pays MVP

Sénégal (`SN`), Congo-Brazzaville (`CG`), Côte d'Ivoire (`CI`).

## Hors P01

- Bitcoin Mainnet
- Dépôts FCFA réels
- Wave / Orange Money / MTN Money
- Taux de change de marché
- Assistant IA
- Interfaces Stitch
- Déploiement
