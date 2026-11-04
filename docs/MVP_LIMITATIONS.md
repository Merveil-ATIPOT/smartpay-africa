# MVP limitations

Honest constraints of the SmartPay Africa laboratory. None of this is a regulatory or production claim.

## Bitcoin and Lightning

- **Regtest only.** Prefix `lnbcrt`. Mainnet (`lnbc`) invoices are rejected.
- **No real bitcoin** moves. Coins are mined locally.
- **One payer node:** Django uses LND **Alice** for all users. The Home “wallet” figure is Alice's channel balance (or a labeled Mock number). Users do **not** each have an independent Lightning wallet.
- Bob is a **counterparty**, not the signed-in user's node.
- LNURL, Lightning addresses, and gallery QR import are out of scope.

## Mobile Money and transfers

- Catalogue labels (Wave, Orange Money, MTN, …) are **names in a demo list**.
- No operator API, SMS, or CFA deposit.
- FX used for quotes is a **fictitious** constant (`TRANSFER_DEMO_FCFA_PER_BTC`), not a market feed.
- Mobile **does not confirm** a transfer (`TRANSFER_CONFIRM_ENABLED = false`).
- `POST /api/v1/transfers/{id}/confirm/` can still pay Alice → Bob and write a simulated credit (`MM-SIM-…`) if someone calls it with LND up.
- `ready` ≠ paid. Preview-payment ≠ send.

## Assistant and Academy

- Assistant answers are a **deterministic FAQ**. There is no hosted LLM and no tool that pays or invoices.
- Explain uses a real `paymentId` and `GET /payments/{id}/`. It does not invent amounts.
- Academy is real pedagogy on published content. A passed quiz does not complete a module unless all published lessons are completed.
- GET catalogue / GET progress do not create progress rows.

## Administration and merchant

- Admin **home dashboard** mixes **illustrative** totals with real GET pages. Treat the big headline numbers as fixtures.
- Admin mutations (create user, edit merchant, …) are not part of the console; lists are read-only.
- Help is a static directory (no tickets).
- Merchant space is a **local in-memory demo**. QR payload `smartpay-demo:…` is not BOLT11 and is not payable on Lightning.

## Auth and sessions

- Register is always `individual`.
- Logout revokes the **refresh** token server-side (`POST /api/v1/auth/logout/` + SimpleJWT `token_blacklist`). Clients also clear local storage. Access tokens already issued remain usable until expiry (default 30 minutes).
- “Forgot password” is announced as unavailable.

## Development posture

- `DJANGO_SETTINGS_MODULE` defaults to **development**, `DEBUG` typically true.
- JWT / Django secret fallbacks exist in code for missing env (placeholders). Set real local values in `.env`.
- API and Postgres ports are published for the lab; LND REST is loopback-only.
- CI runs API pytest only. Mobile and admin tests are local npm scripts.

## Not available

| Item | Status |
| --- | --- |
| Faucet | UI: out of phase / not wired to LND |
| Pay shop (boutique) | UI: not available |
| Production deploy | `infrastructure/deployment` is a stub; `production.py` unused |
| Public landing page | Not in this repo (admin is not marketing) |
| GitHub remote | Not configured in the local clone at documentation time |
| Project LICENSE file | Not created; see [LICENSE_DECISION.md](LICENSE_DECISION.md) |

## Safety for evaluators

- Do not paste macaroons, seeds, or `.env` into issues or slides.
- Do not run `lightning-lab.ps1 reset -Confirm` or `docker compose down -v` unless you accept data loss (Postgres vs Lightning volumes are separate; reset is Lightning-only).
- Do not present Mock `confirmed` as Lightning settlement.
- Do not present a transfer result screen as a completed remittance to a real phone.
