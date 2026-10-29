"""Point d'entrée conteneur : attend PostgreSQL, applique les migrations, lance la commande."""

from __future__ import annotations

import os
import sys
import time

import psycopg


def wait_for_postgres() -> None:
    kwargs = {
        "host": os.environ.get("POSTGRES_HOST", "postgres"),
        "port": os.environ.get("POSTGRES_PORT", "5432"),
        "dbname": os.environ.get("POSTGRES_DB", "smartpay"),
        "user": os.environ.get("POSTGRES_USER", "smartpay"),
        "password": os.environ.get("POSTGRES_PASSWORD", "change-me-local-only"),
    }
    last_error: Exception | None = None
    for _ in range(30):
        try:
            with psycopg.connect(**kwargs) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
            return
        except Exception as exc:  # noqa: BLE001 — retry volontaire
            last_error = exc
            time.sleep(2)
    raise SystemExit(f"PostgreSQL indisponible: {last_error}")


def main() -> None:
    wait_for_postgres()
    from django.core.management import execute_from_command_line

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    execute_from_command_line(["manage.py", "migrate", "--noinput"])
    command = sys.argv[1:] or ["python", "manage.py", "runserver", "0.0.0.0:8000"]
    os.execvp(command[0], command)


if __name__ == "__main__":
    main()
