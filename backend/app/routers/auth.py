"""Autenticação de gestor/RH. Sprint: S6 | Risco: R2."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from ..auditoria import registrar
from ..config import config
from ..db import buscar_um
from ..deps import Conexao, Usuario
from ..rate_limit import limitar
from ..schemas import LoginEntrada, LoginSaida
from ..security import criar_token, verificar_senha

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=LoginSaida,
    dependencies=[Depends(limitar(config.RATE_LOGIN))],
)
def login(dados: LoginEntrada, conexao: Conexao) -> LoginSaida:
    """Valida credenciais e emite JWT. Mensagem de erro genérica (anti-enumeração)."""
    usuario = buscar_um(
        conexao,
        "SELECT u.*, e.razao_social FROM usuario_empresa u "
        "JOIN empresa e ON e.id = u.empresa_id "
        "WHERE u.email = ? AND u.ativo = 1 AND e.ativo = 1",
        (dados.email.lower(),),
    )
    if not usuario or not verificar_senha(dados.senha, usuario["senha_hash"]):
        logger.warning("login negado para %s", dados.email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "credenciais invalidas")

    registrar(
        conexao,
        ator=usuario["id"],
        acao="login",
        entidade="usuario_empresa",
        empresa_id=usuario["empresa_id"],
    )
    token = criar_token({"sub": usuario["id"], "emp": usuario["empresa_id"]})
    logger.info("login ok: %s", usuario["id"])
    return LoginSaida(
        access_token=token,
        nome=usuario["nome"],
        papel=usuario["papel"],
        empresa_id=usuario["empresa_id"],
        empresa_nome=usuario["razao_social"],
    )


@router.get("/me")
def perfil(usuario: Usuario) -> dict[str, str]:
    """Devolve o perfil do token atual (usado para restaurar sessão no frontend)."""
    return {
        "id": usuario["id"],
        "nome": usuario["nome"],
        "papel": usuario["papel"],
        "empresa_id": usuario["empresa_id"],
        "empresa_nome": usuario["razao_social"],
    }
