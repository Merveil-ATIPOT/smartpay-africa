# Security — SmartPay Africa

This document describes the **laboratory** security model. It is **not** a claim of PCI, AML, or e-money compliance, and it is **not** a production hardening guide.

Secret **values** are not listed here. Configure them in a local `.env` and in gitignored LND files.

## Intended use

- Local developer machine or a trusted hackathon LAN
- Bitcoin **Regtest**
- Placeholder lab passwords in `.env.example` (`change-me-*` / `changeme-*`) — replace them locally; never reuse them outside Regtest

Do not publish the API, PostgreSQL, or LND REST on the public Internet.

## Secrets

| Item | Where it should live | Must not |
| --- | --- | --- |
| `DJANGO_SECRET_KEY`, `JWT_SIGNING_KEY` | `.env` (gitignored) | Git, mobile, admin UI |
| Postgres password | `.env` / Compose | Frontend |
| LND macaroons / TLS | `infrastructure/lightning-regtest/secrets/` (gitignored) | Database, API JSON, logs |
| Invoice preimage | LND only | Application models / clients |

`LND_MACAROON_PATH` and `LND_TLS_CERT_PATH` are **file paths**, not file contents.

`.gitignore` also excludes `*.dump`, `*.sql`, `*.bak`, `*.macaroon`, `*.pem`, `*.key`, `.env`.

Django `production.py` sets cookie/HSTS flags but is **not deployed** and does not refuse insecure placeholders. Default settings load `config.settings.development`.

## Authentication and permissions

- Default DRF permission: `IsAuthenticated` + JWT (and session for browsable admin).
- Register: public, throttled, always `individual`.
- Payments list: owner; admin may see all. Detail: `IsOwnerOrAdmin`, then reconcile.
- Academy progress: `IsAcademyOwner` — **no admin exception**.
- Assistant conversations: owner only.
- Admin JSON APIs: `IsAdminRole`.
- Health, register, token, schema/docs: unauthenticated.

Logout on mobile and admin clears client storage only. Refresh tokens remain valid until expiry (default 7 days). There is no `token_blacklist` app.

## Lightning

- Network forced to `regtest` in lab settings.
- Mock payments cannot be `is_lightning_settled=true`.
- Settlement requires LND lookup, not HTTP 200 from `sendpayment`.
- Alice → Alice invoices are rejected in `create_outgoing_payment`.
- REST LND is bound to `127.0.0.1`. Overlay mounts secrets `:ro`.

## Known laboratory risks

These are documented so they are not mistaken for production guarantees.

1. **`confirm` default `true`** on `POST /payments/` — omitting the field still pays.
2. **Duplicate `payment_hash` lookup is not owner-scoped** — a second account might retrieve another user's Lightning payment row.
3. **`POST /transfers/{id}/confirm/`** is available on the API while the mobile flag `TRANSFER_CONFIRM_ENABLED` is `false`.
4. **Lab Bob invoice** is available to any authenticated user when the flag is on.
5. **`/api/schema/` and `/api/docs/`** are public.
6. **DEBUG** defaults to true in development. Tracebacks can leak settings on the LAN.
7. **API `0.0.0.0:8000`** is required for a physical phone; **Postgres `0.0.0.0:5433`** is wider than necessary.
8. JWT signing key in a typical local lab may be shorter than SimpleJWT's recommended HMAC length — tokens still work; this is not production crypto.
9. Admin JWT sits in `sessionStorage` (readable under XSS).
10. Logging aims to redact macaroon/preimage keys; timeout paths may still include a BOLT11 in a REST path.

## Access control (product)

- Endpoints that mutate payments or progress require a user.
- GET Academy catalogue does not write.
- Assistant tools list is empty: the engine cannot call payment services.
- Seed commands (`seed_dev`, `seed_academy`) are manual and refused when `DEBUG` is false (`seed_academy` allows `--force`).

## Logging

Application logs should carry IDs, amounts, and statuses — not JWT, macaroon hex, or preimages. Review logs before sharing a terminal capture.

## Dependency note

Expo 52 pulls transitive npm advisories (including `tar` via `@expo/cli`). A jump to a newer Expo is a major upgrade and was not applied blindly. `npm audit fix` without `--force` only.

## What is out of scope

WAF, HSM, MFA, automated macaroon rotation, public TLS termination, KYC, and financial licensing.
