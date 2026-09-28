"""Autenticação de gestor/RH. Sprint: S6 | Risco: R2."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..auditoria import registrar
from ..config import config
from ..db import buscar_todos, buscar_um, executar
from ..deps import Conexao, Usuario
from ..rate_limit import limitar
from ..schemas import AlterarSenhaEntrada, LoginEntrada, LoginSaida
from ..security import criar_token, gerar_hash_senha, verificar_senha

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
        "SELECT u.*, e.razao_social, e.plano AS plano, e.porte AS porte, "
        "e.atuacao AS atuacao FROM usuario_empresa u "
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
        plano=str(usuario.get("plano") or "starter"),
    )


def _iso(valor: object) -> str:
    """Normaliza data do SQLite (texto) ou do Postgres (datetime) para ISO 8601."""
    formatar = getattr(valor, "isoformat", None)
    return formatar() if callable(formatar) else str(valor)


def _acessos_recentes(conexao: Conexao, usuario_id: str) -> list[str]:
    """Últimos logins do próprio usuário, lidos da trilha de auditoria."""
    linhas = buscar_todos(
        conexao,
        "SELECT registrado_em FROM log_auditoria WHERE ator = ? AND acao = 'login' "
        "ORDER BY registrado_em DESC LIMIT 5",
        (usuario_id,),
    )
    return [_iso(linha["registrado_em"]) for linha in linhas]


@router.get("/me")
def perfil(usuario: Usuario, conexao: Conexao) -> dict[str, object]:
    """Devolve o perfil do token atual (usado para restaurar sessão no frontend)."""
    return {
        "id": usuario["id"],
        "nome": usuario["nome"],
        "email": usuario["email"],
        "acessos_recentes": _acessos_recentes(conexao, usuario["id"]),
        "papel": usuario["papel"],
        "empresa_id": usuario["empresa_id"],
        "empresa_nome": usuario["razao_social"],
        "plano": str(usuario.get("plano") or "starter"),
        "porte": str(usuario.get("porte") or "media"),
        "atuacao": str(usuario.get("atuacao") or "servicos"),
    }


@router.post(
    "/senha",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(limitar(config.RATE_LOGIN))],
)
def alterar_senha(
    dados: AlterarSenhaEntrada, usuario: Usuario, conexao: Conexao
) -> Response:
    """Troca a senha do próprio usuário. Sprint: S7 | Risco: R2.

    Exige a senha atual; responde 400 (e não 401) para não derrubar a sessão.
    """
    if not verificar_senha(dados.senha_atual, usuario["senha_hash"]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "senha atual incorreta")
    if dados.nova_senha == dados.senha_atual:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "a nova senha deve ser diferente da atual"
        )
    executar(
        conexao,
        "UPDATE usuario_empresa SET senha_hash = ? WHERE id = ?",
        (gerar_hash_senha(dados.nova_senha), usuario["id"]),
    )
    registrar(
        conexao,
        ator=usuario["id"],
        acao="alterar_senha",
        entidade=f"usuario_empresa:{usuario['id']}",
        empresa_id=usuario["empresa_id"],
    )
    logger.info("senha alterada: %s", usuario["id"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)
