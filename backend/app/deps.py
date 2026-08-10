"""Dependências de autorização. Sprint: S6 | Risco: R2 (isolamento por empresa)."""

from __future__ import annotations

import logging
import sqlite3
from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, status

from .db import buscar_um, obter_conexao
from .security import TokenInvalido, validar_token

logger = logging.getLogger(__name__)

Conexao = Annotated[sqlite3.Connection, Depends(obter_conexao)]


def _payload_bearer(authorization: str) -> dict[str, Any]:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token ausente")
    try:
        return validar_token(authorization.split(" ", 1)[1])
    except TokenInvalido as erro:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(erro)) from erro


def usuario_atual(
    conexao: Conexao, authorization: str = Header(default="")
) -> dict[str, Any]:
    """Extrai e valida o JWT do header Authorization; devolve o usuário."""
    payload = _payload_bearer(authorization)
    if payload.get("scope") == "superadmin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "token fora do escopo")
    usuario = buscar_um(
        conexao,
        "SELECT u.*, e.razao_social, e.plano AS plano, e.porte AS porte, "
        "e.atuacao AS atuacao FROM usuario_empresa u "
        "JOIN empresa e ON e.id = u.empresa_id "
        "WHERE u.id = ? AND u.ativo = 1 AND e.ativo = 1",
        (payload.get("sub"),),
    )
    if not usuario:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "usuario inativo ou inexistente"
        )
    return usuario


Usuario = Annotated[dict[str, Any], Depends(usuario_atual)]


def superadmin_atual(
    conexao: Conexao, authorization: str = Header(default="")
) -> dict[str, Any]:
    """Autoriza exclusivamente operadores globais ativos."""
    payload = _payload_bearer(authorization)
    if payload.get("scope") != "superadmin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "escopo superadmin obrigatorio")
    administrador = buscar_um(
        conexao,
        "SELECT id, nome, email, ativo FROM superadmin WHERE id = ? AND ativo = 1",
        (payload.get("sub"),),
    )
    if not administrador:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "superadmin inativo ou inexistente"
        )
    return administrador


Superadmin = Annotated[dict[str, Any], Depends(superadmin_atual)]


def exigir_empresa(usuario: dict[str, Any], empresa_id: str) -> None:
    """Bloqueia acesso a dados de outra empresa (equivalente ao RLS do Supabase)."""
    if usuario["empresa_id"] != empresa_id:
        logger.warning(
            "acesso negado: usuario %s tentou empresa %s", usuario["id"], empresa_id
        )
        raise HTTPException(status.HTTP_403_FORBIDDEN, "empresa fora do seu escopo")
