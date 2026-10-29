# SmartPay Africa

Application de paiement et de transfert Bitcoin Lightning pour le Sénégal, le Congo-Brazzaville et la Côte d'Ivoire.

**Phase P02** : fondations P01 stabilisées + laboratoire Bitcoin Core / LND **Regtest**. Aucun argent réel, aucun dépôt FCFA, aucun Wave / Orange Money / MTN réel.

## Stack

| Couche | Choix P02 |
| --- | --- |
| Monorepo | npm workspaces |
| Node.js | **22 LTS** (`.nvmrc`). Expo 52 n'officialise pas Node 25. |
| Mobile | React Native 0.76, Expo 52, TypeScript |
| Admin web | Next.js 15, React 19, Tailwind CSS |
| API | Python 3.13, Django 5.2, DRF 3.16, httpx |
| Base | PostgreSQL 16 Docker, port hôte **5433** |
| Lightning | Bitcoin Core 29.0 + LND 0.20.6-beta (Alice, Bob) |
| Tests | pytest, pytest-django |

## Démarrage API + PostgreSQL

```powershell
copy .env.example .env
docker compose up --build -d
# l'entrypoint API attend Postgres, applique les migrations, lance runserver
```

Santé : http://localhost:8000/api/v1/health/

Tests backend (SQLite, sans LND) :

```powershell
.\scripts\test-api.ps1
```

PostgreSQL existant : ne pas lancer `docker compose down -v` sur le compose racine si vous devez conserver `smartpay_pgdata`.

## Laboratoire Lightning

```powershell
.\scripts\lightning-lab.ps1 up
.\scripts\lightning-lab.ps1 init
.\scripts\lightning-lab.ps1 demo -AmountSats 2500
.\scripts\lightning-lab.ps1 down
```

Détail : [infrastructure/lightning-regtest/README.md](infrastructure/lightning-regtest/README.md)

Pour brancher Django sur Alice : `PAYMENT_PROVIDER=lnd_regtest` (voir `.env.example`).

## Frontends (squelettes, hors Stitch)

Node 22 LTS :

```powershell
nvm use 22.14.0
npm install
npm run dev:admin
npm run dev:mobile
```

## Règles

- Montants en satoshis entiers.
- Mock et Regtest sont étiquetés séparément. Mock ≠ règlement Lightning.
- Macaroons / TLS : fichiers locaux gitignorés, jamais en base ni dans le frontend.
- Pas de Mainnet, pas de commit automatique.

## Documentation

- [Architecture](docs/architecture/overview.md)
- [API](docs/api/endpoints.md)
- [Sécurité](docs/security/overview.md)
- [Stitch (hors scope)](docs/stitch/README.md)
- [Lightning Regtest](infrastructure/lightning-regtest/README.md)
