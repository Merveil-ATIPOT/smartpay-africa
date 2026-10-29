#!/usr/bin/env python
"""Point d'entrée Django de SmartPay Africa."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django n'est pas disponible. Activez le virtualenv de apps/api."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    ROOT = Path(__file__).resolve().parent
    sys.path.insert(0, str(ROOT))
    main()
