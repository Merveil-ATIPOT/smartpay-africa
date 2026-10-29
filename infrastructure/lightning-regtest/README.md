# Laboratoire Bitcoin Lightning Regtest

Images :

- `bitcoin/bitcoin:29.0` (Bitcoin Core, regtest)
- `lightninglabs/lnd:v0.20.6-beta` (Alice et Bob)

Réseau Docker isolé : `smartpay-lightning`.

## Démarrage

```powershell
cd <repo>
.\scripts\lightning-lab.ps1 up
.\scripts\lightning-lab.ps1 init
.\scripts\lightning-lab.ps1 status
```

`init` crée les wallets de test, mine 101 blocs, finance Alice, ouvre un canal Alice → Bob (push 400 000 sats), attend l'activation, exporte macaroons/TLS dans `secrets/` (gitignoré).

## Paiement Alice → Bob

```powershell
.\scripts\lightning-lab.ps1 demo -AmountSats 2500
```

Ou manuellement :

```powershell
.\scripts\lightning-lab.ps1 invoice -AmountSats 2500
.\scripts\lightning-lab.ps1 pay -PayReq lnbcrt1...
.\scripts\lightning-lab.ps1 mine
```

## Arrêt

```powershell
.\scripts\lightning-lab.ps1 down
```

Conserve les volumes Lightning.

## Nettoyage contrôlé (Lightning seulement)

```powershell
.\scripts\lightning-lab.ps1 reset
# refusé sans confirmation
.\scripts\lightning-lab.ps1 reset -Confirm
```

Ne détruit **pas** `smartpay_pgdata`.

## Django

Après `export-secrets`, dans `.env` :

```
PAYMENT_PROVIDER=lnd_regtest
LND_REST_URL=https://127.0.0.1:8081
LND_MACAROON_PATH=infrastructure/lightning-regtest/secrets/alice/admin.macaroon
LND_TLS_CERT_PATH=infrastructure/lightning-regtest/secrets/alice/tls.cert
```

Le backend parle à Alice. Bob sert de contrepartie (factures). Les clients HTTP ne reçoivent jamais le macaroon.

## Preuve Alice → Bob (P02, labo local)

- Facture Bob : préfixe `lnbcrt` (Regtest), 2500 sats, mémo `p02-alice-to-bob`
- Alice `payinvoice` : statut **SUCCEEDED**
- Bob `lookupinvoice` : `settled=true`, `state=SETTLED`, `amt_paid_sat=2500`
- Canal après paiement : Alice `total_satoshis_sent=2500`, soldes 594030 / 402500
- Enregistrement PostgreSQL : `Payment` `is_lightning_settled=true`, conservé après redémarrage API
- Canal LND conservé après `docker compose restart`

La préimage n'est jamais journalisée par l'API Django.
