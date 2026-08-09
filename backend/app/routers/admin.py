"""Operação global da Psyra, isolada dos usuários de cada empresa."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..auditoria import registrar
from ..config import config
from ..db import buscar_todos, buscar_um, executar
from ..deps import Conexao, Superadmin
from ..rate_limit import limitar
from ..schemas import (
    AtivacaoAdminEntrada,
    EmpresaAdminEntrada,
    EmpresaAdminSaida,
    LoginEntrada,
    RedefinirSenhaAdminEntrada,
    SuperadminLoginSaida,
    UsuarioAdminEntrada,
    UsuarioAdminSaida,
)
from ..security import criar_token, gerar_hash_senha, verificar_senha

router = APIRouter(prefix="/v1/admin", tags=["admin"])


@router.post(
    "/auth/login",
    response_model=SuperadminLoginSaida,
    dependencies=[Depends(limitar(config.RATE_LOGIN))],
)
def login_superadmin(dados: LoginEntrada, conexao: Conexao) -> SuperadminLoginSaida:
    """Emite token de escopo global sem misturá-lo aos tenants."""
    administrador = buscar_um(
        conexao,
        "SELECT * FROM superadmin WHERE email = ? AND ativo = 1",
        (dados.email.lower(),),
    )
    if not administrador or not verificar_senha(dados.senha, administrador["senha_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "credenciais invalidas")
    registrar(
        conexao,
        ator=administrador["id"],
        acao="login_superadmin",
        entidade="superadmin",
    )
    token = criar_token({"sub": administrador["id"], "scope": "superadmin"})
    return SuperadminLoginSaida(access_token=token, nome=administrador["nome"])


@router.get("/me")
def perfil_superadmin(administrador: Superadmin) -> dict[str, str]:
    return {
        "id": administrador["id"],
        "nome": administrador["nome"],
        "email": administrador["email"],
        "escopo": "superadmin",
    }


@router.get("/empresas", response_model=list[EmpresaAdminSaida])
def listar_empresas(_: Superadmin, conexao: Conexao) -> list[dict[str, object]]:
    return buscar_todos(
        conexao,
        "SELECT e.*, COUNT(u.id) AS total_usuarios FROM empresa e "
        "LEFT JOIN usuario_empresa u ON u.empresa_id = e.id "
        "GROUP BY e.id ORDER BY e.criado_em DESC, e.id",
    )


@router.post(
    "/empresas",
    response_model=EmpresaAdminSaida,
    status_code=status.HTTP_201_CREATED,
)
def criar_empresa(
    dados: EmpresaAdminEntrada,
    administrador: Superadmin,
    conexao: Conexao,
) -> dict[str, object]:
    if buscar_um(conexao, "SELECT id FROM empresa WHERE cnpj = ?", (dados.cnpj,)):
        raise HTTPException(status.HTTP_409_CONFLICT, "CNPJ ja cadastrado")
    empresa_id = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO empresa (id, razao_social, cnpj, plano, ativo) "
        "VALUES (?,?,?,?,1)",
        (empresa_id, dados.razao_social.strip(), dados.cnpj, dados.plano),
    )
    registrar(
        conexao,
        ator=administrador["id"],
        acao="criar_empresa",
        entidade=f"empresa:{empresa_id}",
        empresa_id=empresa_id,
    )
    empresa = buscar_um(
        conexao,
        "SELECT e.*, 0 AS total_usuarios FROM empresa e WHERE e.id = ?",
        (empresa_id,),
    )
    assert empresa is not None
    return empresa


@router.patch("/empresas/{empresa_id}/status", response_model=EmpresaAdminSaida)
def alterar_empresa(
    empresa_id: str,
    dados: AtivacaoAdminEntrada,
    administrador: Superadmin,
    conexao: Conexao,
) -> dict[str, object]:
    if not buscar_um(conexao, "SELECT id FROM empresa WHERE id = ?", (empresa_id,)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa nao encontrada")
    executar(
        conexao,
        "UPDATE empresa SET ativo = ? WHERE id = ?",
        (1 if dados.ativo else 0, empresa_id),
    )
    registrar(
        conexao,
        ator=administrador["id"],
        acao="ativar_empresa" if dados.ativo else "desativar_empresa",
        entidade=f"empresa:{empresa_id}",
        empresa_id=empresa_id,
    )
    empresa = buscar_um(
        conexao,
        "SELECT e.*, COUNT(u.id) AS total_usuarios FROM empresa e "
        "LEFT JOIN usuario_empresa u ON u.empresa_id = e.id "
        "WHERE e.id = ? GROUP BY e.id",
        (empresa_id,),
    )
    assert empresa is not None
    return empresa


@router.get("/empresas/{empresa_id}/usuarios", response_model=list[UsuarioAdminSaida])
def listar_usuarios(
    empresa_id: str, _: Superadmin, conexao: Conexao
) -> list[dict[str, object]]:
    if not buscar_um(conexao, "SELECT id FROM empresa WHERE id = ?", (empresa_id,)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa nao encontrada")
    return buscar_todos(
        conexao,
        "SELECT id, empresa_id, nome, email, papel, ativo, criado_em "
        "FROM usuario_empresa WHERE empresa_id = ? ORDER BY criado_em DESC, id",
        (empresa_id,),
    )


@router.post(
    "/empresas/{empresa_id}/usuarios",
    response_model=UsuarioAdminSaida,
    status_code=status.HTTP_201_CREATED,
)
def criar_usuario(
    empresa_id: str,
    dados: UsuarioAdminEntrada,
    administrador: Superadmin,
    conexao: Conexao,
) -> dict[str, object]:
    if not buscar_um(
        conexao, "SELECT id FROM empresa WHERE id = ? AND ativo = 1", (empresa_id,)
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa ativa nao encontrada")
    email = dados.email.lower()
    if buscar_um(conexao, "SELECT id FROM usuario_empresa WHERE email = ?", (email,)):
        raise HTTPException(status.HTTP_409_CONFLICT, "e-mail ja cadastrado")
    usuario_id = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO usuario_empresa "
        "(id, empresa_id, nome, email, senha_hash, papel, ativo) "
        "VALUES (?,?,?,?,?,?,1)",
        (
            usuario_id,
            empresa_id,
            dados.nome.strip(),
            email,
            gerar_hash_senha(dados.senha),
            dados.papel,
        ),
    )
    registrar(
        conexao,
        ator=administrador["id"],
        acao="criar_usuario",
        entidade=f"usuario_empresa:{usuario_id}",
        empresa_id=empresa_id,
    )
    usuario = buscar_um(
        conexao,
        "SELECT id, empresa_id, nome, email, papel, ativo, criado_em "
        "FROM usuario_empresa WHERE id = ?",
        (usuario_id,),
    )
    assert usuario is not None
    return usuario


@router.patch("/usuarios/{usuario_id}/status", response_model=UsuarioAdminSaida)
def alterar_usuario(
    usuario_id: str,
    dados: AtivacaoAdminEntrada,
    administrador: Superadmin,
    conexao: Conexao,
) -> dict[str, object]:
    usuario = buscar_um(
        conexao, "SELECT id, empresa_id FROM usuario_empresa WHERE id = ?", (usuario_id,)
    )
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "usuario nao encontrado")
    executar(
        conexao,
        "UPDATE usuario_empresa SET ativo = ? WHERE id = ?",
        (1 if dados.ativo else 0, usuario_id),
    )
    registrar(
        conexao,
        ator=administrador["id"],
        acao="ativar_usuario" if dados.ativo else "desativar_usuario",
        entidade=f"usuario_empresa:{usuario_id}",
        empresa_id=usuario["empresa_id"],
    )
    atualizado = buscar_um(
        conexao,
        "SELECT id, empresa_id, nome, email, papel, ativo, criado_em "
        "FROM usuario_empresa WHERE id = ?",
        (usuario_id,),
    )
    assert atualizado is not None
    return atualizado


@router.post(
    "/usuarios/{usuario_id}/redefinir-senha",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def redefinir_senha(
    usuario_id: str,
    dados: RedefinirSenhaAdminEntrada,
    administrador: Superadmin,
    conexao: Conexao,
) -> Response:
    usuario = buscar_um(
        conexao, "SELECT id, empresa_id FROM usuario_empresa WHERE id = ?", (usuario_id,)
    )
    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "usuario nao encontrado")
    executar(
        conexao,
        "UPDATE usuario_empresa SET senha_hash = ? WHERE id = ?",
        (gerar_hash_senha(dados.senha), usuario_id),
    )
    registrar(
        conexao,
        ator=administrador["id"],
        acao="redefinir_senha_usuario",
        entidade=f"usuario_empresa:{usuario_id}",
        empresa_id=usuario["empresa_id"],
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
