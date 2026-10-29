# P03 — Intégration mobile M08 / M13 / M15 / M20

Phase mobile Stitch. Aucun commit, aucun déploiement, aucun Mainnet.

## A. Arborescence mobile

```
apps/mobile/
  App.tsx
  index.ts
  app.json
  babel.config.js
  metro.config.js
  assets/README.md
  src/
    theme/index.ts
    lib/          env, invoice, format, paymentStatus, confirmLock + tests
    services/     api, auth, wallet, payments, storage, errors + tests
    hooks/useAuth.tsx
    navigation/   RootNavigator, TabNavigator, types
    components/ui.tsx
    screens/      Login, Dashboard (M08), Scanner (M13), Confirm (M15),
                  Receive (M20), Activity, Services, Profile
```

Contrats : `packages/contracts`. Couleurs : `packages/design-tokens` (Navy #101828, Orange #F7931A, Vert #12B76A, Gris #F4F6F8, Blanc #FFFFFF).

## B. Écrans

| Code | Fichier | Fidélité Stitch |
| --- | --- | --- |
| Auth | `LoginScreen.tsx` | Hors maquette, requis pour JWT |
| M08 | `DashboardScreen.tsx` | Accueil, carte solde, actions, historique réel |
| M13 | `ScannerScreen.tsx` | Caméra, collage, saisie manuelle. Pas de paiement au scan |
| M15 | `ConfirmScreen.tsx` | Preview puis confirm explicite |
| M20 | `ReceiveScreen.tsx` | Facture API + QR de la vraie chaîne BOLT11/Mock |
| Nav | Tabs ACCUEIL / ACTIVITÉ / SCANNER / SERVICES / PROFIL | |

Écarts volontaires :

- Transactions Stitch (Café Baobab, etc.) remplacées par GET `/payments/`.
- FCFA Stitch non recopié comme taux de marché.
- Congo affiché CG Brazzaville (produit), pas 🇨🇩.
- LNURL / adresse permanente : badge « non implémenté P03 ».
- Logo officiel local **absent** (voir `apps/mobile/assets/README.md`).

## C. Endpoints connectés

| Écran | Appels |
| --- | --- |
| Login | `POST /api/v1/auth/token/` |
| Session | `POST /api/v1/auth/token/refresh/`, `GET /api/v1/me/` |
| M08 | `GET /api/v1/health/`, `GET /api/v1/wallet/`, `GET /api/v1/payments/` |
| M13 | `POST /api/v1/payments/preview/` uniquement |
| M15 | preview déjà obtenu, puis `POST /api/v1/payments/` (`confirm=true`, `Idempotency-Key`) et `GET /api/v1/payments/{id}/` |
| M20 | `POST /api/v1/payments/invoices/` puis polling `GET /api/v1/payments/{id}/` |

Aucun secret LND, macaroon ou certificat n'est lu par le mobile.

## D. Commandes exécutées

```
node -v                                          # v22.14.0 (Herd nvm)
npm install --workspace=@smartpay/mobile
npm run typecheck -w @smartpay/mobile            # OK
npm test -w @smartpay/mobile                     # 25/25
docker exec smartpay-api python -m pytest        # 46 passed, 1 skipped
npx expo start --localhost                       # Node 22, Metro sur :8081
npm audit                                        # 29 alertes, --force NON appliqué
```

Expo signale `react-native@0.76.6` vs 0.76.9 attendu (SDK 52). Non migré.

Pas d'émulateur Android (`adb` absent) ni iOS. Test device réel **à faire**.

## E. Vérification visuelle

Maquettes : `docs/stitch/interface01/*.png` + `*_code.html`.

Sur Expo : login seed → Accueil → Scanner (aperçu) → Confirmer → Recevoir (QR).

## F. npm audit (29 : 2 low, 10 moderate, 15 high, 2 critical)

Portée réelle : principalement la **chaîne d'outils Expo CLI / Next.js**, pas le runtime paiement.

| Paquet | Sévérité | Où | Impact mobile |
| --- | --- | --- | --- |
| `tar` | critical | `@expo/cli` → `cacache` | Extraction de paquets npm CLI, pas le flux Lightning |
| `@xmldom/xmldom` | high | `@expo/plist` | Config native / prebuild |
| `postcss` | high | Next.js admin + metro-config | Build CSS, XSS stringify |
| `lodash.pick` | high | `@expo/vector-icons` 12 | Prototype pollution tooling |
| `node-fetch` < 2.6.7 | high | `fbjs` / `fbemitter` Expo | Transitif CLI |
| `image-size` | high | tooling | DoS parse image |
| `uuid` / `xml2js` / `semver` | moderate | Expo config | CLI |
| `deepmerge` | moderate | `@expo/config` | Prototype pollution config |

`npm audit fix --force` installerait **Expo 58** et **Next 16** : rupture SDK 52, non maîtrisée. Non exécuté.

## G. Limitations

- Docker API reste Mock tant que `PAYMENT_PROVIDER=mock` dans `.env`.
- Pour LND : API **hôte** avec `PAYMENT_PROVIDER=lnd_regtest` (macaroons fichiers, jamais dans le frontend).
- Émulateur Android : `http://10.0.2.2:8000`. Téléphone : IP LAN + `DJANGO_ALLOWED_HOSTS`.
- Import QR depuis galerie non implémenté.
- Test device réel à confirmer si aucun émulateur n'était disponible.

## H. Proposition P04

1. Brancher un backend Docker `lnd_regtest` (volume secrets, pas d'exposition REST).
2. Écrans Activité / Profil Stitch restants, assistant IA, marchand.
3. Ne toujours pas activer Mainnet, Wave, OM, MTN, FCFA réel.
4. Logo officiel versionné une fois le PNG fourni.
5. Tests E2E Maestro/Detox du cycle facture Alice → scan Bob → règlement.
