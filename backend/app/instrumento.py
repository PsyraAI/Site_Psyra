"""Carga do instrumento NR-1. Sprint: S6 | Risco: R2 (instrumento pré-CEP é DEMO)."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

from .config import DIR_DADOS

logger = logging.getLogger(__name__)


@lru_cache(maxsize=4)
def carregar_instrumento(codigo: str = "nr1_v2_demo") -> dict[str, Any]:
    """Lê o JSON do instrumento e devolve a estrutura completa (com cache)."""
    caminho = DIR_DADOS / f"instrumento_{codigo}.json"
    try:
        dados: dict[str, Any] = json.loads(caminho.read_text(encoding="utf-8"))
        logger.info("instrumento %s carregado (%d blocos)", codigo, len(dados["blocos"]))
        return dados
    except (OSError, json.JSONDecodeError, KeyError) as erro:
        logger.error("falha ao carregar instrumento %s: %s", codigo, erro)
        raise


def listar_ids_itens(codigo: str = "nr1_v2_demo") -> list[str]:
    """Devolve os identificadores esperados dos itens Likert (ex.: 'A1', 'A2')."""
    instrumento = carregar_instrumento(codigo)
    return [
        f"{bloco['codigo']}{indice}"
        for bloco in instrumento["blocos"]
        for indice, _ in enumerate(bloco["itens"], start=1)
    ]


def total_itens(codigo: str = "nr1_v2_demo") -> int:
    """Quantidade total de itens Likert do instrumento."""
    return len(listar_ids_itens(codigo))
