# SmartPay Africa — Demonstration Guide

This guide is for hackathon evaluators and developers. It describes the **laboratory** demonstration. Commands that change Lightning or payment state are marked **STATE-CHANGING**. They are documented here so you can reproduce the demo; they were **not** executed while this file was written.

Related: [architecture](architecture/overview.md), [limitations](MVP_LIMITATIONS.md), [Lightning lab](../infrastructure/lightning-regtest/README.md).

## A. Prerequisites

- Docker Desktop (or equivalent) with Compose v2
- Windows PowerShell 5.1+ for the helper scripts (`scripts/*.ps1`)
- Node.js 22 LTS (see `.nvmrc`) and npm 10+
- A clone of this repository
- A local `.env` copied from `.env.example` (never commit `.env`)
- Optional: an Android phone on the same LAN, or an emulator

You do **not** need Mainnet bitcoin, an LND cloud account, or Mobile Money credentials.

Not automated: creating a GitHub remote, seeding Academy on a fresh database, and pairing a physical phone (`EXPO_PUBLIC_API_URL` + `DJANGO_ALLOWED_HOSTS`).

## B. Laboratory architecture

```text
                    +------------------+
   Expo :8084  -->  | Django API :8000 |  -->  PostgreSQL :5433
   Next :3000  -->  |                  |  -->  LND Alice 127.0.0.1:8081
                    +------------------+         |
                                                 v
                                          Bitcoin Core Regtest
                                                 ^
                                          LND Bob 127.0.0.1:8082
```

- **Alice** is the only payer node Django uses. The wallet screen shows Alice's **channel balance**, labeled as a demonstration node. It is not a personal bank balance.
- **Bob** is a counterparty. Users do not receive Bob's wallet.
- Mock mode (`PAYMENT_PROVIDER=mock`) never sets `is_lightning_settled=true`.

## C. Start PostgreSQL and the API

From the repository root:

```powershell
copy .env.example .env
docker compose up --build -d
```

Or `.\scripts\dev-up.ps1` (foreground `docker compose up --build`; creates `.env` if missing).

Check: [http://localhost:8000/api/v1/health/](http://localhost:8000/api/v1/health/)

Expect `database: up`. With the default compose file, `payment_provider` is usually `mock` until the Regtest overlay is applied.

Do **not** run `docker compose down -v` if you must keep volume `smartpay_pgdata`.

Compose now lists Postgres as `127.0.0.1:5433:5432`. Recreating the postgres container is required before that bind takes effect. **Do not recreate it during a live demonstration.** Docker-internal `postgres:5432` does not depend on the host bind.

## D. Configure Django for Lightning

**STATE-CHANGING (containers / env only, no invoice):** attach the running API to the Lightning network without recreating PostgreSQL volumes:

```powershell
docker compose -f compose.yaml -f compose.regtest.yaml up -d api
```

The overlay:

- sets `PAYMENT_PROVIDER=lnd_regtest`
- mounts Alice/Bob secrets read-only under `/run/lnd/`
- joins external network `smartpay-lightning`
- enables `LAB_COUNTERPARTY_ENABLED`

Health should then report `payment_provider: lnd_regtest` and `lightning: regtest` once LND is up. `lab_counterparty: true` means Bob invoices can be requested.

To return to Mock (no Lightning settlement):

```powershell
# PAYMENT_PROVIDER=mock and start without the overlay
docker compose up -d api
```

Academy content, if the catalogue is empty: `docker exec smartpay-api python manage.py seed_academy` (refused when `DEBUG` is false, unless `--force`). **Do not reset** existing lesson or quiz progress.

## E. Start the Lightning Regtest network

```powershell
.\scripts\lightning-lab.ps1 up
.\scripts\lightning-lab.ps1 init
.\scripts\lightning-lab.ps1 status
```

`init` is **STATE-CHANGING**: it creates lab wallets, mines blocks, funds Alice, opens Alice → Bob (example push 400_000 sats), and exports macaroons/TLS into gitignored `infrastructure/lightning-regtest/secrets/`.

REST published on the host (loopback only):

| Node | Host URL |
| --- | --- |
| Alice | `https://127.0.0.1:8081` |
| Bob | `https://127.0.0.1:8082` |

Bitcoin RPC and LND gRPC are not published as evaluator-facing services.

**STATE-CHANGING — do not run during a documentation pass:**

```powershell
.\scripts\lightning-lab.ps1 invoice -AmountSats 2500
.\scripts\lightning-lab.ps1 pay -PayReq lnbcrt1...
.\scripts\lightning-lab.ps1 demo -AmountSats 2500
.\scripts\lightning-lab.ps1 reset -Confirm
```

`reset` destroys Lightning volumes only. It does **not** touch `smartpay_pgdata`.

## F. Configure the mobile app

Root `.env.example` documents `EXPO_PUBLIC_API_URL`.

| Device | Typical API URL |
| --- | --- |
| iOS simulator | `http://127.0.0.1:8000` |
| Android emulator | `http://10.0.2.2:8000` |
| Physical phone | `http://<LAN-IP>:8000` |

On a phone, `localhost` is the phone itself. Add the LAN host to `DJANGO_ALLOWED_HOSTS`. The app rewrites loopback to the Metro host IP when it can detect it; still set `EXPO_PUBLIC_API_URL` explicitly for demos.

JWT access/refresh tokens are stored with Expo SecureStore (in-memory fallback if SecureStore is unavailable).

## G. Start Expo on port 8084

LND Alice already uses host port **8081**. Start Metro on **8084**:

```powershell
nvm use 22
npm install
cd apps\mobile
npx expo start --port 8084
```

Do not start a second Metro instance. Scan the QR with Expo Go, or open the Android emulator.

Admin console (optional, same API):

```powershell
npm run dev:admin
```

Open [http://localhost:3000](http://localhost:3000). Sign in with a user whose `/me/` `role` is `admin`.

## H. Demonstration path

Account: use a local **individual** user (register, or the seed user named in `.env.example` as `DEV_USER_EMAIL`). Do not paste passwords into notes or slides.

### 1. Sign in

Welcome → Login → `POST /api/v1/auth/token/` then `GET /api/v1/me/`. Register creates an `individual` account and does **not** return a JWT; continue to Login.

### 2. Wallet

Home loads `GET /api/v1/wallet/` and health. With LND, the label is a **demonstration node / Regtest channel balance** (Alice). With Mock, the label says the balance is not a Lightning channel. This is not a personal custody wallet.

### 3. Create a Bob invoice

**STATE-CHANGING.** On Receive, the lab control calls `POST /api/v1/lab/counterparty-invoice/` (404 if the flag is off). The invoice is Bob's, prefix `lnbcrt`, `is_user_wallet=false`.

Alternatively create an Alice invoice (`POST /api/v1/payments/invoices/`, memo used by the app: `Facture SmartPay Africa`). Paying that invoice from the same API is **Alice → Alice** and is rejected at confirm.

### 4. Preview

Scanner: camera, paste, or type. The screen calls **only** `POST /api/v1/payments/preview/`. No `Payment` row is created. Returning from Confirm with the same QR does not auto-navigate again.

### 5. Confirm

**STATE-CHANGING.** Confirm sends `POST /api/v1/payments/` with `confirm: true` and an `Idempotency-Key`. Success means Django recorded a payment and LND lookup reported settlement (or a Mock **receipt**, which is not Lightning settled). Button **Terminé** returns to Home.

### 6. History

Activity lists `GET /api/v1/payments/`. A personal user can open **AssistantExplain** with `{ paymentId }` only. Admin rows are not opened as personal explanations.

### 7. Academy

Services → Assistant IA → SmartPay Academy, or the Academy card on the assistant home.

Expect a published catalogue (6 modules / 24 lessons / 6 quizzes when seeded). Progress is owner-scoped. Completing a quiz at 80% does **not** complete a module unless every published lesson in that module is completed and at least one attempt passed.

GET catalogue endpoints do not write progress. Lesson start/complete and quiz submit do.

### 8. Pedagogical assistant

Assistant home / chat: ` /api/v1/ai/conversations/`. Deterministic FAQ. No tool can create invoices or payments. Explain a real payment from Activity (read-only GET).

### 9. Simulated transfers

Services → Transfert Direct. The app walks destination → beneficiary → amount → review → result using Django quote/ready/preview-payment APIs. **`TRANSFER_CONFIRM_ENABLED` is false.** The app never calls `POST /transfers/{id}/confirm/`. On-screen copy states that Lightning pay is blocked for this phase and that Mobile Money is not real.

Do not present this path as an operational corridor.

### 10. Administration

`http://localhost:3000` — login as admin.

| Page | Source |
| --- | --- |
| Home | Illustrative dashboard (not live PostgreSQL totals) |
| Transactions / corridors / users / merchants / infrastructure / audit / settings | Django GET |
| Help | Static catalogue |

No LND secret is shown.

## I. Expected results

After a successful Alice → Bob confirm:

- Payment row owned by the signed-in user
- Lightning status settled only after lookup (not because HTTP was 200)
- History shows the amount in satoshis
- Health still reports Regtest and “no real Mobile Money”
- Academy progress of other users is unchanged
- Existing lab payments remain (this lab has historically kept a payment set — do not wipe Postgres to “clean” a demo)

## J. Troubleshooting

| Symptom | What to check |
| --- | --- |
| Health `database: down` | `docker compose ps` — `smartpay-postgres` healthy, host port 5433 |
| Health `lightning: not_connected` | `lightning-lab.ps1 status`; overlay `compose.regtest.yaml` applied |
| `lab_counterparty: false` | Overlay + Bob macaroon/cert mounted |
| Phone cannot reach API | LAN URL, `DJANGO_ALLOWED_HOSTS`, API bound on 8000, firewall |
| Expo fails on 8081 | Another process is LND Alice — use `--port 8084` |
| Preview works, confirm is Alice → Alice | You invoiced Alice. Use a Bob lab invoice |
| Confirm 409 / same result | Idempotency-Key replay — expected |
| Academy empty | Catalogue not seeded; unpublished modules return the same 404 as missing |
| Transfer “success” | Preparation only unless someone called API confirm outside the app |
| Admin 403 | `/me/` `role` must be `admin` |

## K. Laboratory limits

- Regtest only
- Shared Alice node
- Simulated Mobile Money
- Merchant QR is `smartpay-demo:…`, not BOLT11
- Assistant is not a large language model
- JWT logout blacklists the refresh token on the server; access tokens already issued remain valid until expiry
- PowerShell scripts are the supported automation; there is no Make/bash demo wrapper
- Live OpenAPI (`/api/schema/`) is ahead of `packages/contracts/openapi/openapi.yaml` (Academy, AI, admin, token routes missing from the YAML)

Do not expose this stack on a public IP for the hackathon story. It is a local lab.
