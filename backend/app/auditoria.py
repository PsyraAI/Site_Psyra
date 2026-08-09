"""Trilha de auditoria encadeada. Sprint: S6 | Risco: R2 (LGPD Art. 37).

Cada registro guarda o hash do anterior; adulterar uma linha quebra a cadeia
inteira e a verificação acusa. Nenhum conteúdo de resposta entra no log — só
metadados de operação.
"""

from __future__ import annotations

import hashlib
import logging
import sqlite3
import uuid
from datetime import UTC, datetime

from .db import buscar_todos, buscar_um, executar

logger = logging.getLogger(__name__)
HASH_GENESE = "0" * 64


def _calcular_hash(anterior: str, ator: str, acao: str, entidade: str, ts: str) -> str:
    base = f"{anterior}|{ator}|{acao}|{entidade}|{ts}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def registrar(
    conexao: sqlite3.Connection,
    ator: str,
    acao: str,
    entidade: str,
    empresa_id: str | None = None,
) -> str:
    """Grava um evento na cadeia e devolve o hash gerado."""
    try:
        ultimo = buscar_um(
            conexao,
            "SELECT hash_atual FROM log_auditoria ORDER BY registrado_em DESC, "
            "id DESC LIMIT 1",
        )
        anterior = ultimo["hash_atual"] if ultimo else HASH_GENESE
        agora = datetime.now(UTC).isoformat()
        atual = _calcular_hash(anterior, ator, acao, entidade, agora)
        executar(
            conexao,
            "INSERT INTO log_auditoria (id, empresa_id, ator, acao, entidade, "
            "hash_anterior, hash_atual, registrado_em) VALUES (?,?,?,?,?,?,?,?)",
            (uuid.uuid4().hex, empresa_id, ator, acao, entidade, anterior, atual, agora),
        )
        return atual
    except sqlite3.Error as erro:
        logger.error("falha ao registrar auditoria (%s/%s): %s", acao, entidade, erro)
        raise


def verificar_cadeia(conexao: sqlite3.Connection) -> dict[str, object]:
    """Recalcula toda a cadeia e aponta o primeiro ponto de quebra, se houver."""
    registros = buscar_todos(
        conexao, "SELECT * FROM log_auditoria ORDER BY registrado_em ASC, id ASC"
    )
    anterior = HASH_GENESE
    for posicao, registro in enumerate(registros):
        esperado = _calcular_hash(
            anterior,
            registro["ator"],
            registro["acao"],
            registro["entidade"],
            registro["registrado_em"],
        )
        if registro["hash_anterior"] != anterior or registro["hash_atual"] != esperado:
            logger.error("cadeia de auditoria quebrada na posicao %d", posicao)
            return {"integra": False, "quebra_em": posicao, "total": len(registros)}
        anterior = registro["hash_atual"]
    return {"integra": True, "quebra_em": None, "total": len(registros)}
