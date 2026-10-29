# Développement local

Ce dossier est réservé aux données et fichiers d'aide au développement.

- PostgreSQL Docker : volume nommé `smartpay_pgdata` (voir `compose.yaml` à la racine).
- Port hôte PostgreSQL Docker : **5433** (le 5432 est souvent pris par PostgreSQL local).
- L'API écoute sur `http://localhost:8000`.

Ne pas y stocker de macaroons, seeds ou clés privées.
