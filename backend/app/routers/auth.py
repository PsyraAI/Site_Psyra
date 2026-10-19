"""Login e sessão do gestor. Sprint: S6 | Risco: R2."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..auditoria import registrar
from ..config import config
from ..db import buscar_um, executar
from ..deps import Conexao, Usuario, UsuarioTrocaSenha
from ..rate_limit import limitar
from ..schemas import ContaAtualizacao, LoginEntrada, LoginSaida, TrocaSenhaEntrada
from ..security import (
    criar_token,
    gerar_hash_senha,
    validar_politica_senha,
    verificar_senha,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/auth", tags=["auth"])


SESSAO_LEMBRAR_MIN = 7 * 24 * 60  # "manter conectado": 7 dias


def _token(usuario: dict[str, Any], lembrar: bool) -> str:
    return criar_token(
        {
            "sub": usuario["id"],
            "emp": usuario["empresa_id"],
            "sv": int(usuario.get("sessao_versao") or 0),
        },
        expira_min=SESSAO_LEMBRAR_MIN if lembrar else None,
    )


def _saida(usuario: dict[str, Any], token: str, lembrar: bool) -> LoginSaida:
    return LoginSaida(
        access_token=token,
        nome=usuario["nome"],
        papel=usuario["papel"],
        empresa_id=usuario["empresa_id"],
        empresa_nome=usuario["razao_social"],
        plano=str(usuario.get("plano") or "starter"),
        email=usuario["email"],
        trocar_senha=bool(int(usuario.get("trocar_senha") or 0)),
        lembrar=lembrar,
    )


@router.post(
    "/login",
    response_model=LoginSaida,
    dependencies=[Depends(limitar(config.RATE_LOGIN))],
)
def login(dados: LoginEntrada, conexao: Conexao) -> LoginSaida:
    """Autentica o gestor e devolve um JWT de curta duração."""
    usuario = buscar_um(
        conexao,
        "SELECT u.*, e.razao_social, e.plano AS plano, e.porte AS porte, e.atuacao AS atuacao "
        "FROM usuario_empresa u JOIN empresa e ON e.id = u.empresa_id "
        "WHERE u.email = ? AND u.ativo = 1 AND e.ativo = 1",
        (dados.email.lower(),),
    )
    if not usuario or not verificar_senha(dados.senha, usuario["senha_hash"]):
        logger.warning("login negado para %s", dados.email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos.")

    try:
        executar(
            conexao,
            "UPDATE usuario_empresa SET ultimo_acesso_em = datetime('now') WHERE id = ?",
            (usuario["id"],),
        )
    except Exception:
        # Banco antigo ainda sem a coluna: o acesso vale mesmo assim.
        logger.exception("ultimo acesso nao gravado para %s", usuario["id"])
    registrar(
        conexao,
        ator=usuario["id"],
        acao="login",
        entidade="usuario_empresa",
        empresa_id=usuario["empresa_id"],
    )
    logger.info("login ok: %s", usuario["id"])
    return _saida(usuario, _token(usuario, dados.lembrar), dados.lembrar)


@router.get("/me")
def perfil(usuario: UsuarioTrocaSenha) -> dict[str, Any]:
    """Devolve o perfil do token atual (usado para restaurar sessão no frontend)."""
    return {
        "id": usuario["id"],
        "nome": usuario["nome"],
        "email": usuario["email"],
        "papel": usuario["papel"],
        "empresa_id": usuario["empresa_id"],
        "empresa_nome": usuario["razao_social"],
        "plano": str(usuario.get("plano") or "starter"),
        "porte": str(usuario.get("porte") or "media"),
        "atuacao": str(usuario.get("atuacao") or "servicos"),
        "trocar_senha": bool(int(usuario.get("trocar_senha") or 0)),
        "ultimo_acesso_em": usuario.get("ultimo_acesso_em"),
    }


@router.post(
    "/sair-de-todos", status_code=status.HTTP_204_NO_CONTENT, response_class=Response
)
def sair_de_todos(usuario: UsuarioTrocaSenha, conexao: Conexao) -> Response:
    """Encerra todas as sessões da conta (inclusive esta): o token antigo deixa de
    valer."""
    executar(
        conexao,
        "UPDATE usuario_empresa SET sessao_versao = sessao_versao + 1 WHERE id = ?",
        (usuario["id"],),
    )
    registrar(
        conexao, usuario["id"], "sair_de_todos", "usuario_empresa", usuario["empresa_id"]
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


conta = APIRouter(prefix="/v1/conta", tags=["conta"])


@conta.put("/senha", response_model=LoginSaida)
def trocar_senha(
    dados: TrocaSenhaEntrada, usuario: UsuarioTrocaSenha, conexao: Conexao
) -> LoginSaida:
    """Troca a própria senha. Encerra as outras sessões e devolve um token novo para
    esta."""
    if not verificar_senha(dados.senha_atual, usuario["senha_hash"]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A senha atual não confere.")
    if dados.senha_nova == dados.senha_atual:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "A nova senha precisa ser diferente da atual."
        )
    problemas = validar_politica_senha(
        dados.senha_nova, usuario["email"], usuario["nome"]
    )
    if problemas:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={
                "codigo": "senha_fraca",
                "mensagem": "Senha fraca: " + "; ".join(problemas) + ".",
                "problemas": problemas,
            },
        )
    executar(
        conexao,
        "UPDATE usuario_empresa SET senha_hash = ?, trocar_senha = 0, "
        "sessao_versao = sessao_versao + 1 WHERE id = ?",
        (gerar_hash_senha(dados.senha_nova), usuario["id"]),
    )
    registrar(
        conexao, usuario["id"], "trocar_senha", "usuario_empresa", usuario["empresa_id"]
    )
    atualizado = {
        **usuario,
        "trocar_senha": 0,
        "sessao_versao": int(usuario.get("sessao_versao") or 0) + 1,
    }
    return _saida(atualizado, _token(atualizado, False), False)


@conta.patch("")
def atualizar_conta(
    dados: ContaAtualizacao, usuario: Usuario, conexao: Conexao
) -> dict[str, str]:
    """Atualiza o nome exibido. O e-mail é o login e só a equipe Psyra muda."""
    nome = dados.nome.strip()
    executar(
        conexao, "UPDATE usuario_empresa SET nome = ? WHERE id = ?", (nome, usuario["id"])
    )
    registrar(
        conexao,
        usuario["id"],
        "atualizar_conta",
        "usuario_empresa",
        usuario["empresa_id"],
    )
    return {"nome": nome}
