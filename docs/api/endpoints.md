# API endpoints

Base URL (local lab): `http://localhost:8000`

Authentication: JWT Bearer from `POST /api/v1/auth/token/` (`email` + `password`), unless noted.

Amounts are integers in **satoshis**.

Live schema: `GET /api/schema/` and Swagger UI `GET /api/docs/` (currently public; see security).
Versioned contract `packages/contracts/openapi/openapi.yaml` is **0.7.0** and **lags** the live API (no token, admin, AI, or Academy paths). Do not treat the YAML as complete. This file lists routes found in Django `urls.py` modules.

`Health.version` JSON is still `0.4.0` while Spectacular settings say `0.7.0`.

---

## Health and schema

| Method | Path | Auth | Effect | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/health/` | No | Read provider, DB, Lightning connectivity, `lab_counterparty`. No secrets. | Operational |
| GET | `/api/schema/` | No | OpenAPI document | Operational |
| GET | `/api/docs/` | No | Swagger UI | Operational |
| — | `/admin/` | Django session | Django admin site | Operational (staff) |

---

## Auth

| Method | Path | Auth | Effect | Status |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register/` | No | Creates `individual` user. Ignores client `role` / staff flags. **No JWT.** Throttled. | Operational |
| POST | `/api/v1/auth/token/` | No | Access + refresh | Operational |
| POST | `/api/v1/auth/token/refresh/` | Refresh token | New access | Operational |
| GET | `/api/v1/me/` | JWT | Current profile | Operational |

There is no logout / blacklist route.

---

## Wallet

| Method | Path | Auth | Effect | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/wallet/` | JWT | Snapshot: Mock balance and/or Alice `channel_balance_sats` + pubkey. No macaroon. | Operational (shared Alice node in LND mode) |

---

## Payments

| Method | Path | Auth | Effect | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/payments/` | JWT | List. Owner rows; admin sees all. | Operational |
| GET | `/api/v1/payments/{id}/` | Owner or admin | Detail + **reconcile** if pending (LND lookup) | Operational |
| POST | `/api/v1/payments/preview/` | JWT | Decode / fee estimate. **Does not create** a payment. `is_lightning_settled` false. | Operational |
| POST | `/api/v1/payments/invoices/` | JWT | Incoming invoice (Mock or Alice BOLT11) | **Writes** lab / LND invoice |
| POST | `/api/v1/payments/` | JWT | Outgoing pay. Requires idempotency key. `confirm=false` rejected. Omitted `confirm` currently defaults **true**. | **STATE-CHANGING** |
| POST | `/api/v1/lab/counterparty-invoice/` | JWT | Bob invoice. 404 if lab flag off. Not a user wallet. | **STATE-CHANGING** |

Idempotent replay of the same key returns 200 and does not send LND again.

Alice → Alice is rejected on create.

A Lightning `payment_hash` already stored may be returned without an owner filter (known isolation risk; see security).

---

## Transfers

Preparation is operational. Mobile Money credit is **simulated**. Mobile app does not call confirm.

| Method | Path | Auth | Effect | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/transfers/simulations/` | JWT | Legacy P01 simulation list | Operational (read) |
| GET | `/api/v1/transfers/destinations/` | JWT | Demo corridor catalogue (SN / CG / CI) | Operational (catalogue) |
| GET | `/api/v1/transfers/destinations/{code}/operators/` | JWT | Simulated operators (Wave / Orange / MTN labels only) | Simulated catalogue |
| POST | `/api/v1/transfers/quotes/` | JWT | Server quote, fictitious FX | Simulated rate |
| GET | `/api/v1/transfers/` | JWT | Owner transfers | Operational |
| POST | `/api/v1/transfers/` | JWT | Draft. Idempotency-Key required | Writes draft |
| GET | `/api/v1/transfers/{id}/` | Owner or admin | Summary | Operational |
| PATCH | `/api/v1/transfers/{id}/` | Owner or admin | Preparation fields | Writes draft |
| GET | `/api/v1/transfers/{id}/status/` | Owner or admin | Status | Operational |
| POST | `/api/v1/transfers/{id}/beneficiary/` | Owner or admin | Validate beneficiary format | Writes |
| POST | `/api/v1/transfers/{id}/quote/` | Owner or admin | Attach server quote | Writes |
| POST | `/api/v1/transfers/{id}/ready/` | Owner or admin | Mark ready. **No Lightning.** | Writes status |
| GET/POST | `/api/v1/transfers/{id}/preview-payment/` | Owner or admin | Payment conditions. **No LND send.** | Operational |
| POST | `/api/v1/transfers/{id}/confirm/` | Owner or admin | Alice→Bob + simulated MM credit if LND up. Idempotency-Key required. | **STATE-CHANGING** / simulated credit |
| GET | `/api/v1/transfers/{id}/result/` | Owner or admin | LND vs fictitious credit | Operational |
| POST | `/api/v1/transfers/{id}/reconcile/` | Admin | Internal reconcile, no automatic new pay | Admin |

Default demo quote inputs (settings, not a market): `TRANSFER_DEMO_FCFA_PER_BTC` (example 43_300_000), `TRANSFER_DEMO_FEE_SATS` (example 1).

---

## Academy

Published catalogue only. Missing and unpublished share the same 404 message. Progress is owner-only (`IsAcademyOwner`, no admin bypass).

| Method | Path | Auth | Effect | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/academy/me/progress/` | JWT | Live progress. **GET does not write.** | Operational |
| GET | `/api/v1/academy/courses/` | JWT | Published courses | Operational |
| GET | `/api/v1/academy/courses/{course}/` | JWT | Course + published modules | Operational |
| GET | `/api/v1/academy/courses/{c}/modules/{m}/` | JWT | Module + lessons + quiz meta | Operational |
| GET | `/api/v1/academy/courses/{c}/modules/{m}/lessons/{l}/` | JWT | Lesson body | Operational |
| POST | `.../lessons/{l}/start/` | JWT | Start lesson (idempotent) | Writes progress |
| POST | `.../lessons/{l}/complete/` | JWT | Complete lesson (idempotent) | Writes progress |
| GET | `.../modules/{m}/quizzes/` | JWT | Quiz questions **without** `is_correct` | Operational |
| POST | `.../quizzes/{quiz}/attempts/` | JWT | Server-side score, snapshot, idempotency key | Writes attempt |
| GET | `.../quizzes/{quiz}/attempts/` | JWT | Owner attempts | Operational |
| GET | `.../attempts/{attempt}/` | JWT | Owner attempt + correction snapshot | Operational |

Pass mark stored on the quiz (content uses 70). Score is `floor(100 × correct / total)`.

---

## Assistant

| Method | Path | Auth | Effect | Status |
| --- | --- | --- | --- | --- |
| GET/POST | `/api/v1/ai/conversations/` | JWT | List / create. Owner only | Operational |
| GET | `/api/v1/ai/conversations/{id}/` | JWT | Owner conversation | Operational |
| GET/POST | `/api/v1/ai/conversations/{id}/messages/` | JWT | Messages. POST throttled. FAQ engine, no payment tools | Operational |

Explain-on-device uses `GET /api/v1/payments/{id}/` (already listed). There is no `/ai/explain/` route.

---

## Admin

All require JWT + admin role (`IsAdminRole`: staff or superuser or `role=admin`), except where noted.

| Method | Path | Auth | Effect | Status |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/users/` | Admin | User directory | Operational (read) |
| GET | `/api/v1/admin/users/{id}/` | Admin | User detail | Operational (read) |
| GET | `/api/v1/admin/merchants/` | Admin | Merchant directory | Operational (read) |
| GET | `/api/v1/admin/merchants/{id}/` | Admin | Merchant detail | Operational (read) |
| GET | `/api/v1/admin/infrastructure/` | Admin | LND / Django / DB snapshot, no secrets | Operational (read) |
| GET | `/api/v1/admin/audit/` | Admin | `AuditLog` page | Operational (read) |
| GET | `/api/v1/admin/corridors/` | Admin | Transfer corridor supervision | Operational (read) |

There is no merchant payment API for the mobile shop demo. That UI is local-only.

---

## OpenAPI drift (for a later technical fix)

Present in Django, **absent** from `packages/contracts/openapi/openapi.yaml`:

- `/api/v1/auth/token/` and `/refresh/`
- `/api/v1/admin/users/`, `merchants/`, `infrastructure/`, `audit/`, `corridors/`
- `/api/v1/ai/conversations…`
- `/api/v1/academy/…`

Do not “fix” the YAML in this documentation phase.
