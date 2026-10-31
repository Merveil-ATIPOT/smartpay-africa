# License decision (pending)

**No `LICENSE` file is created in this phase.** The owner of SmartPay Africa must choose a license explicitly.

A public GitHub repository **does not** grant reuse, modification, or commercial rights by itself. Without a license, default copyright rules apply: others may view the code if you publish it, but they should not assume they can copy it.

## This note is not a license

Nothing in this file is an offer. It only lists common options so the owner can decide later.

## Options (informative)

| Option | Typical meaning | Fit for a hackathon MVP |
| --- | --- | --- |
| **MIT** | Permissive. Keep copyright notice. Use, modify, sell allowed, no warranty. | Common for demos; easy for evaluators to fork. |
| **Apache-2.0** | Permissive + patent grant + NOTICE rules. | Useful if contributors or companies care about patents. Slightly more text. |
| **No open-source license** (copyright retained) | Source may be shown; reuse stays forbidden unless a contract says otherwise. | Possible if the team wants a public read-only showcase only. Say so clearly on the README. |

Other licenses (GPL, BUSL, …) exist. They were not selected here.

## Third-party components

Dependencies (Django, Expo, Next.js, LND, Bitcoin Core, …) have **their own** licenses. Those licenses are not the SmartPay Africa project license. Publishing this repo does not re-license Django or LND.

Do not copy a dependency's license file and present it as SmartPay Africa's license.

## When a LICENSE is added

1. Owner picks MIT, Apache-2.0, or “source available / all rights reserved”.
2. Add a root `LICENSE` (or a short copyright statement).
3. Point the README License section at that file.
4. Re-check that `.env` and macaroons are still untracked.

Until then, the README must **not** claim MIT/Apache/proprietary.
