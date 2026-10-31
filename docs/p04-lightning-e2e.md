# P04 — Lightning Regtest end-to-end et consolidation mobile

Aucun commit, aucun déploiement, aucun Mainnet. Volumes PostgreSQL et Lightning conservés.

## A. Architecture Docker et réseau

Deux projets Compose distincts, un réseau partagé :

| Projet | Conteneurs | Réseau | Ports hôte |
| --- | --- | --- | --- |
| `smartpay-africa` | `smartpay-postgres`, `smartpay-api` | `smartpay-africa_smartpay` | Postgres **5433**, API **8000** |
| `smartpay-lightning-regtest` | bitcoind, `lnd-alice`, `lnd-bob` | `smartpay-lightning` | REST Alice **127.0.0.1:8081**, Bob **127.0.0.1:8082** |

Overlay P04 : `compose.regtest.yaml`

- attache `smartpay-api` à `smartpay-lightning` **en plus** du réseau applicatif
- DNS interne : `https://lnd-alice:8080` (payeur) et `https://lnd-bob:8080` (contrepartie lab)
- secrets montés **lecture seule** : `/run/lnd/alice`, `/run/lnd/bob`
- TLS vérifié (certificat LND, `tlsextradomain=lnd-alice` / `lnd-bob`)
- gRPC LND et RPC Bitcoin **non** publiés publiquement

```
docker compose -f compose.yaml -f compose.regtest.yaml up -d api
```

Retour Mock explicite (sans overlay) :

```
PAYMENT_PROVIDER=mock docker compose up -d api
```

Le portefeuille utilisateur reste **Alice**. Bob n'est jamais substitué silencieusement.

## B. Fichiers créés ou modifiés

Créés :

- `compose.regtest.yaml`
- `apps/api/smartpay/payments/lab.py`
- `apps/api/smartpay/payments/management/commands/lab_bob_invoice.py`
- `docs/p04-lightning-e2e.md`

Modifiés (principaux) : `compose.yaml`, settings Django, factory LND, `lnd_client.send_payment_sync`, `services.py` (anti Alice→Alice, retry lookup), health, contrats OpenAPI, mobile (polling, timeout confirm, erreurs réseau, carte lab M20), `.env.example`, tests.

Secrets `*.macaroon` / `tls.cert` : gitignorés, jamais renvoyés à l'API client.

## C. Configuration Mock / Regtest

| Mode | Comment | Effet |
| --- | --- | --- |
| Mock | Compose sans overlay, `PAYMENT_PROVIDER=mock` | `mockln1`, `is_lightning_settled=false` toujours |
| Regtest P04 | Overlay + `PAYMENT_PROVIDER=lnd_regtest` | Alice paie des `lnbcrt`, settled **uniquement** après lookup LND |

`GET /api/v1/health/` (lab P04) :

```json
{
  "status": "ok",
  "payment_provider": "lnd_regtest",
  "lightning": "regtest",
  "lab_counterparty": true,
  "database": "up"
}
```

`POST /api/v1/lab/counterparty-invoice/` émet une facture **Bob**. Réponse : `is_user_wallet=false`. M20 QR utilisateur reste une facture Alice.

## D. Preuves Alice SUCCEEDED / Bob SETTLED

Paiement réel 2 500 sats, facture Bob `p04-e2e-retry`, payée par Django via Alice.

| | |
| --- | --- |
| Payment id | `ae323515-f491-47c2-9169-be6e65d45013` |
| payment_hash | `b4033f69daf04a8f02e6f42010ecc6382f9cb42115e14152eaf6af2f7ac668c5` |
| Destination | pubkey Bob `0393311a…834960` (canal Alice–Bob) |
| Preview | `is_lightning_settled=false` (HTTP 200 preview ≠ règlement) |
| Django | `status=confirmed`, `is_lightning_settled=true`, `lightning_status=settled` |
| Alice `listpayments` | **SUCCEEDED**, value 2500, `FAILURE_REASON_NONE` |
| Bob `lookupinvoice` | `settled=true`, `state=SETTLED`, `amt_paid_sat=2500` |

La préimage n'est pas journalisée par l'API et n'est pas recopiée ici.

Un premier essai (`2be712ea-…`) a échoué : LND 0.20 refuse le champ REST `timeout_seconds` sur `SendPaymentSync`. Corrigé dans `lnd_client.py`. Ce paiement reste `failed` / `is_lightning_settled=false` (comportement voulu).

Canal conservé, actif, ~591k sats Alice avant ce paiement.

## E. PostgreSQL et idempotence

Après `docker restart smartpay-api` (volumes intacts) :

- `ae323515-…` toujours `confirmed` + `is_lightning_settled=true`
- rejeu `Idempotency-Key` : HTTP **200**, même `id`, **un seul** envoi LND
- contrainte `mock_cannot_be_lightning_settled` inchangée
- paiement Alice→Alice rejeté avant `send_payment`

Aucun volume `smartpay_pgdata` / `lnd-*-data` recréé.

## F. Tests exécutés

Audit de clôture du 31 octobre 2026 — **aucun nouveau paiement** pendant les vérifications (`-m "not lnd"`, `RUN_LND_E2E` non défini).

| Commande | Résultat |
| --- | --- |
| `npm run typecheck` (`apps/mobile`) | OK |
| `npm test` (`apps/mobile`) | **169 passed** |
| `docker exec -e DJANGO_SETTINGS_MODULE=config.settings.test smartpay-api python -m pytest -m "not lnd"` | **181 passed** |
| `GET /api/v1/health/` | 200, `lnd_regtest` / `regtest`, `lab_counterparty: true` |
| Paiement HTTP lab Alice → Bob | confirmé, voir D (`ae323515-…`) |
| Paiement Android Alice → Bob | confirmé, voir I (`1a6bf944-…`) |
| Secrets Git | aucun `*.macaroon` / `tls.cert` suivi ; `secrets/**` ignoré sauf `secrets/README.md` |

Les tests `@pytest.mark.lnd` n'ont **pas** été relancés à la clôture : `test_alice_pays_bob_on_regtest` appelle `lncli payinvoice`.

**Android manuel (exécuté)** :

1. Login JWT, M08 Regtest, Lightning connecté.
2. M20 : **Montant libre** 2500, carte **Laboratoire Alice → Bob**, pas le QR Alice.
3. M13 : coller la facture, contrôler le `lnbcrt`, **Valider** (plus de navigation automatique au collage).
4. M15 : 2500 sats, destinataire Bob, mémo **Facture SmartPay Africa**, confirmer une fois.
5. Message : « Règlement Lightning Regtest confirmé par lookup LND côté serveur ».
6. Bouton de confirmation désactivé après règlement.
7. Historique : première ligne sortante réelle `-2 500` · REGTEST.
8. Contrôle négatif déjà constaté : une facture Alice désactive Confirmer.

Polling Mock : arrêt immédiat (`shouldStopPolling`). LND : arrêt sur confirmed / failed / expired / settled. Timeout confirm 90 s. Erreur réseau (`ApiError` 0) ≠ paiement refusé ; la clé d'idempotence est conservée.

## G. Limitations

- Une instance API = un nœud payeur (Alice). Réception « vraie » de l'utilisateur = facture Alice ; l'E2E Alice→Bob passe par la contrepartie lab Bob.
- `estimatefee` LND Router répond parfois HTTP 500 : preview continue avec frais 0.
- JWT HMAC local 24 octets : warning PyJWT, hors périmètre P04.
- Warning Django « wallets unmigrated » préexistant, aucune migration créée.
- Pytest dans le conteneur **doit** forcer `DJANGO_SETTINGS_MODULE=config.settings.test` (sinon l'env Regtest est utilisée).
- Import galerie, LNURL, FCFA réel : toujours hors scope.
- Premier paiement lab `2be712ea` reste en `failed` (payload LND corrigé ensuite).

## H. Recommandations P05 (non commencée)

1. Parcours inverse documenté : Bob paie une facture Alice (réception M20 réelle).
2. Allonger `JWT_SIGNING_KEY` (warning HMAC 24 octets, hors clôture P04), basculer l'API lab vers gunicorn.
3. Remplacer `SendPaymentSync` par Router `SendPaymentV2` + suivi `IN_FLIGHT`.
4. File d'attente de réconciliation (interruption au milieu d'un HTLC).
5. Ne pas migrer Expo / Next ; rester Regtest.

## I. Clôture Android — 31 octobre 2026

Paiement réel 2 500 sats depuis Expo Go / Android, facture Bob lab, mémo `Facture SmartPay Africa`. Lecture seule : PostgreSQL, `listpayments` Alice, `lookupinvoice` Bob. Aucune préimage recopiée.

| | |
| --- | --- |
| Payment id | `1a6bf944-e26c-4692-bcfd-4a3e440892f8` |
| payment_hash | `c4500794ecf5cc1861b340a5e87e676568830e5b6cada632fb19cce101686a40` |
| Montant | 2500 sats |
| Direction | `outgoing` |
| Créé | 2026-10-31T10:39:19Z |
| Django | `status=confirmed`, `is_lightning_settled=true`, `settlement_mode=lightning_regtest` |
| Mémo | `Facture SmartPay Africa` (pas « P03 ») |
| Alice `listpayments` | **1** occurrence, **SUCCEEDED**, `value_sat=2500`, `FAILURE_REASON_NONE` |
| Destination | pubkey Bob `0393311a…834960` |
| Bob `lookupinvoice` | `settled=true`, `state=SETTLED`, `amt_paid_sat=2500` |
| Doublons | 1 seule ligne PG pour ce hash / cette facture ; 1 seul paiement Alice |
| Historique | première ligne `GET /payments/` du compte : sortant 2500, confirmé, settled |

Autres sortants 2500 du même compte (factures **distinctes**, hors de ce règlement Android) :

- `ae323515-…` — lab HTTP `p04-e2e-retry`, confirmed / settled (voir D)
- `1536ed31-…` — `p02-alice-to-bob`, confirmed / settled
- `2be712ea-…` — échec `timeout_seconds`, `failed` / non settled (conservé)

Factures Alice entrantes encore titrées « Facture SmartPay Africa P03 » : anciennes lignes, **non** réécrites.

### Verdict

**P04 validée.** Le parcours Android Alice → Bob est prouvé de bout en bout (Django + Alice SUCCEEDED + Bob SETTLED), sans doublon, sans secret LND dans Git, sans nouveau paiement lors de l'audit.

P05 non commencée. Aucun commit de clôture. Volumes PostgreSQL et Lightning intacts.
