# Hackathon submission draft — SmartPay Africa

Working notes for Dakar Bitcoin Hack 2026. This is **not** an official Devpost form and it does **not** list judged criteria from the organizers.

Use it to keep the public story aligned with the code.

## 1. Project name

**SmartPay Africa**

## 2. Problem

People moving value between Senegal, Congo-Brazzaville, and Côte d'Ivoire often chain several systems (banks, Mobile Money, cash). Settlement is hard to preview and hard to explain. This draft does **not** attach invented market percentages or revenue figures.

## 3. Proposed solution

A laboratory wallet that:

- pays a real BOLT11 invoice on Bitcoin **Regtest** (Alice → Bob) after an explicit confirm;
- records settlement only after LND lookup;
- teaches Lightning and Bitcoin through SmartPay Academy and a deterministic assistant;
- shows how a corridor quote could look, while labeling Mobile Money as **simulated**.

## 4. Target audience

- Hackathon evaluators and Bitcoin / Lightning developers
- Product teams exploring remittance UX for francophone Africa
- Learners using Academy (not end-customers of a live payment service)

## 5. Innovation

The interesting part is the **honest composition**:

- a working Regtest payment path with preview ≠ pay ≠ settled;
- pedagogy (Academy + FAQ + payment explain) on the same account isolation model;
- explicit “simulated” and “local demo” surfaces so Lightning is not confused with Wave/Orange/MTN or a merchant QR.

This is a product/architecture demonstration, not a new consensus protocol.

## 6. Features you can demonstrate

| Demo | Real? |
| --- | --- |
| Login / register | Yes |
| Alice channel balance labeled as lab node | Yes (shared node) |
| Bob invoice → scan → preview → confirm → history | Yes, Regtest |
| Academy modules and quizzes | Yes |
| Assistant FAQ + explain a real payment | Yes (no LLM) |
| Transfer wizard | Preparation only; confirm off in the app |
| Admin lists | Yes (GET). Home tiles illustrative |
| Merchant till | Local specimen only |

## 7. Architecture (one paragraph)

Expo talks to Django. Django stores data in PostgreSQL and, when `PAYMENT_PROVIDER=lnd_regtest`, pays through LND Alice on a Bitcoin Core Regtest network. LND Bob is the counterparty. Next.js is a read-mostly operator console. See [architecture/overview.md](architecture/overview.md).

## 8. Potential impact

If the UX holds, a later product could help people **see** a Lightning settlement and learn the vocabulary before any real-money integration. Impact on actual remittance volumes is **not measured** in this MVP and must not be claimed.

## 9. Current limits

Regtest; shared Alice wallet; simulated Mobile Money; no per-user LND; no production deploy; assistant is not generative; admin dashboard fixtures; transfer confirm blocked on mobile. Full list: [MVP_LIMITATIONS.md](MVP_LIMITATIONS.md).

## 10. Next steps

- Choose a license ([LICENSE_DECISION.md](LICENSE_DECISION.md))
- Publish a GitHub remote after a secrets review
- Optional static landing page (not in this repo)
- Optional short demo video
- Technical follow-ups: OpenAPI sync, `confirm` default, owner-scoped payment hash, transfer confirm flag on the server

## 11. Links to complete

Replace the placeholders when those assets exist. Do not invent URLs.

| Asset | Status in this repo | URL |
| --- | --- | --- |
| GitHub | No `git remote` in the documented local clone | _to add_ |
| Landing page | Not present (admin ≠ marketing) | _to add_ |
| Demo video | Not present | _to add_ |
| Live production | Not deployed | — |
| This documentation | [README](../README.md), [DEMO](DEMO.md) | relative |

## Official requirements to verify

Consult the **organizers' brief / Devpost page** before submitting. This repository does not encode official rules. Check at least:

- [ ] Submission deadline and timezone (organizers; this draft assumed a 10 November 2026 horizon)
- [ ] Whether a public GitHub URL is required
- [ ] Whether a video is required, and any duration cap
- [ ] Whether a Devpost description has a character limit
- [ ] Whether a license or demo account is required
- [ ] Whether Mainnet is forbidden or allowed (this project is Regtest-only by design)
- [ ] Team / eligibility / prize categories
- [ ] Whether screenshots must be of the running app (Stitch HTML in `docs/stitch/` is **mockup only**)

Do not paste secrets into Devpost fields.
