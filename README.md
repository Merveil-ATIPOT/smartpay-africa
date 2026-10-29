# SmartPay Africa

Application de paiement et de transfert Bitcoin Lightning pour le Sénégal, le Congo-Brazzaville et la Côte d'Ivoire.

**Phase P01** : initialisation du monorepo et du backend. MVP hackathon exclusivement en **Bitcoin Regtest**. Aucun argent réel, aucun dépôt FCFA, aucun Wave / Orange Money / MTN réel.

## Stack

| Couche | Choix P01 |
| --- | --- |
| Monorepo | npm workspaces |
| Mobile | React Native, Expo 52, TypeScript |
| Admin web | Next.js 15, React 19, Tailwind CSS |
| API | Python 3.13, Django 5.2, DRF 3.16 |
| Base | PostgreSQL 16 (Docker) / 18 (local détecté) |
| Tests | pytest, pytest-django |
| Contrats | OpenAPI 3 + types `@smartpay/contracts` |

Node.js 22 LTS est recommandé (`.nvmrc`). Node 25 est installé sur la machine de développement mais n'est pas la cible officielle d'Expo.

## Démarrage

```powershell
copy .env.example .env
python -m venv apps\api\.venv
.\apps\api\.venv\Scripts\python.exe -m pip install -r apps\api\requirements\development.txt
```

### Tests backend (SQLite en mémoire, sans Docker)

```powershell
.\scripts\test-api.ps1
```

### PostgreSQL + API via Docker Compose

Le PostgreSQL local Windows écoute déjà sur `5432`. Compose publie donc Postgres sur **5433**.

```powershell
docker compose up --build
```

Puis, dans un autre terminal, migrations dans le conteneur API :

```powershell
docker compose exec api python manage.py migrate
docker compose exec api python manage.py seed_dev
```

Santé : [http://localhost:8000/api/v1/health/](http://localhost:8000/api/v1/health/)  
Schéma : [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)  
Admin Django : [http://localhost:8000/admin/](http://localhost:8000/admin/)

### PostgreSQL local (service Windows) sans Docker API

Créer la base `smartpay` puis, dans `.env` :

```
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
```

```powershell
.\scripts\migrate-api.ps1
```

### Frontends (squelettes, hors Stitch)

```powershell
npm install
npm run dev:admin
npm run dev:mobile
```

## Règles P01

- Montants en satoshis entiers.
- Fournisseur Mock uniquement. `is_lightning_settled` reste `false`.
- L'adaptateur LND Regtest existe mais n'est pas implémenté.
- Aucune clé privée / macaroon / seed en base.
- Pas de commit automatique : demander avant toute publication git.

## Documentation

- [Architecture](docs/architecture/overview.md)
- [API](docs/api/endpoints.md)
- [Sécurité](docs/security/overview.md)
- [Stitch (hors scope)](docs/stitch/README.md)
