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
| POST | `/api/v1/lab/counterparty-invoice/` | oui | Facture Bob laboratoire (P04). Pas le portefeuille utilisateur. 404 si désactivé |
| GET | `/api/v1/transfers/simulations/` | oui | Simulations uniquement (P01, lecture) |
| GET | `/api/v1/transfers/destinations/` | oui | Catalogue corridors de démonstration |
| GET | `/api/v1/transfers/destinations/{code}/operators/` | oui | Opérateurs simulés d'un pays |
| POST | `/api/v1/transfers/quotes/` | oui | Devis FCFA→sats calculé côté serveur (taux fictif) |
| GET | `/api/v1/transfers/` | oui | Transferts internationaux du propriétaire |
| POST | `/api/v1/transfers/` | oui | Créer un brouillon (Idempotency-Key obligatoire) |
| GET | `/api/v1/transfers/{id}/` | oui | Récapitulatif |
| PATCH | `/api/v1/transfers/{id}/` | oui | Modifier les champs de préparation |
| GET | `/api/v1/transfers/{id}/status/` | oui | Statut |
| POST | `/api/v1/transfers/{id}/beneficiary/` | oui | Valider le format du bénéficiaire |
| POST | `/api/v1/transfers/{id}/quote/` | oui | Associer un devis serveur |
| POST | `/api/v1/transfers/{id}/ready/` | oui | Marquer READY. **Aucun paiement.** |
| GET/POST | `/api/v1/transfers/{id}/preview-payment/` | oui | Conditions de paiement. **Aucun envoi LND.** |
| POST | `/api/v1/transfers/{id}/confirm/` | oui | Exécution Alice→Bob + crédit MM simulé. Idempotency-Key obligatoire. |
| GET | `/api/v1/transfers/{id}/result/` | oui | Résultat (règlement LND vs crédit fictif) |
| POST | `/api/v1/transfers/{id}/reconcile/` | admin | Rapprochement interne. Pas de nouveau paiement automatique. |

## Extension de contrat P02 (additive, documentée)

- `CreatePaymentRequest.encoded_invoice` : BOLT11 `lnbcrt…` obligatoire si `PAYMENT_PROVIDER=lnd_regtest`.
- `CreatePaymentRequest.confirm` : `true` par défaut. `false` est rejeté (confirmation explicite).
- `WalletConnection.channel_balance_sats` : solde de canal LND, 0 en Mock.
- `lightning_status` : `not_applicable` \| `pending` \| `settled` \| `failed` \| `expired`.

Les champs P01 restent valides. Les clients Mock ignorent `encoded_invoice`.

## Extension de contrat P03 (additive)

- `POST /payments/preview/` : `amount_sats` n'est plus obligatoire si `encoded_invoice` est fourni. Réponse additive : `description`, `destination`, `expiry_seconds`, `expires_at`. `is_lightning_settled` reste **toujours false**.
- Une facture BOLT11 (`lnbcrt` / `lnbc`) est rejetée lorsque `PAYMENT_PROVIDER=mock`.

## Extension de contrat P04 (additive)

- `Health.lab_counterparty` : true si une facture Bob laboratoire peut être émise.
- `Health.payment_provider` : `mock` \| `lnd_regtest`.
- `POST /lab/counterparty-invoice/` : BOLT11 `lnbcrt` émise par Bob. `is_user_wallet=false`.
- Un paiement dont la destination est la pubkey Alice est rejeté (pas un transfert Alice → Bob).

## Extension de contrat B1 (additive)

- Transfert international de **préparation** uniquement. Mode `regtest_mobile_money_simulation`.
- Devis fictif : `1 BTC = 43 300 000 FCFA`, arrondi half-up entier, frais de démo 1 sat. 50 000 FCFA → 115 473 sats, total 115 474 sats.
- Statuts publics atteignables : `draft`, `quoted`, `ready` (et `failed` en cas d'échec métier). Pas d'endpoint pour `lightning_settled` ni `simulated_credited`.
- B2 : `POST /transfers/{id}/confirm/` orchestre une facture Bob puis un paiement Alice. Le règlement n'est posé qu'après lookup Alice `SUCCEEDED` et Bob `SETTLED`.
- Le crédit Mobile Money est **simulé** après ce règlement. Aucun opérateur réel n'est contacté.
- `fee_sats` (B1) ≠ frais LND réels (`lnd_fee_sats_paid`).
- `GET /transfers/simulations/` reste la liste P01, distincte de `GET /transfers/`.

## Idempotence

`POST /api/v1/payments/` exige `Idempotency-Key` ou `idempotency_key`. Un rejeu renvoie `200` **sans renvoyer** le paiement LND.

Un même `payment_hash` Lightning n'est pas payé deux fois.

## Réconciliation

`python manage.py reconcile_payments` examine les paiements `pending`. Seul un lookup LND `SETTLED`/`SUCCEEDED` pose `is_lightning_settled=true`.
