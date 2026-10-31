"""Outils métier autorisés pour un futur moteur.

Aucun outil n'est branché en IA.03. Interdit : paiements mutatifs, factures,
confirm, reconcile, preview-payment, GET /payments/{id}/, RPC LND, secrets.
"""

from __future__ import annotations

from typing import Protocol


class AssistantTool(Protocol):
    name: str

    def allowed(self) -> bool:
        return False


ALLOWED_TOOL_NAMES: tuple[str, ...] = ()


def invoke_tool(name: str, **_kwargs) -> None:
    raise RuntimeError(f"Aucun outil IA n'est autorisé ({name}).")
