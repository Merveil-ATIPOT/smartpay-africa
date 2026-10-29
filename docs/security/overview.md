# Sécurité — P02

## Principes

- Aucun secret Lightning (macaroon, seed, clé privée, préimage) n'est stocké en base applicative ni renvoyé au mobile / navigateur.
- `LND_MACAROON_PATH` et `LND_TLS_CERT_PATH` désignent des **fichiers** sous `infrastructure/lightning-regtest/secrets/` (gitignoré).
- REST LND Alice/Bob est publié uniquement sur `127.0.0.1`. RPC Bitcoin et gRPC LND ne sont pas exposés.
- JWT + permissions DRF inchangées : authentifié, propriétaire, rôle admin.
- Journalisation sans macaroon ni `r_preimage` / `payment_preimage`.
- Réseau Bitcoin forcé à `regtest`. Un paiement Mock ne peut pas être `is_lightning_settled=true`.
- Un HTTP 200 LND n'est jamais traité comme un règlement.

## Laboratoire

Les mots de passe RPC/wallet `changeme-regtest-*` sont des placeholders de labo, pas des secrets d'exploitation. Ils ne doivent jamais servir hors Regtest.

`scripts/lightning-lab.ps1 reset` exige `-Confirm` et **ne touche pas** au volume PostgreSQL `smartpay_pgdata`.

## Contrôles d'accès

- Endpoints privés : `IsAuthenticated`.
- Détail paiement : `IsOwnerOrAdmin` puis réconciliation.
- Liste filtrée sur le propriétaire, sauf admin.

## Audit npm (P02)

20 vulnérabilités détectées, presque toutes transitives **Expo 52** (`tar` critique via `@expo/cli`). Le correctif amont proposé est Expo 57 (majeur). Non appliqué en aveugle. `npm audit fix` sans `--force` uniquement.

## Restes

- Pas de WAF, HSM, MFA, rotation automatique des macaroons.
- Certificats TLS LND auto-signés du laboratoire.
- Rate limiting DRF simple hors tests.
