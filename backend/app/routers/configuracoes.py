"""Configurações da empresa e equipe com acesso ao painel. Sprint: S10 | Risco: R2.

- Qualquer pessoa da empresa vê as configurações; só gestor e admin alteram.
- Convite e nova senha geram senha temporária mostrada UMA vez; a pessoa cria a própria senha no
  primeiro acesso (sem e-mail transacional por enquanto, então não há link de recuperação).
- Nenhuma rota aqui toca em resposta de colaborador.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..auditoria import registrar
from ..config import config
from ..db import buscar_todos, buscar_um, executar
from ..deps import Conexao, Usuario, exigir_empresa, exigir_gestao
from ..schemas import (
    AtivacaoAdminEntrada,
    ConfigEmpresaAtualizacao,
    ConfigEmpresaSaida,
    ConviteEntrada,
    SenhaTemporariaSaida,
    UsuarioEquipeSaida,
)
from ..security import gerar_hash_senha, gerar_senha_temporaria

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/empresas", tags=["configuracoes"])

_CAMPOS_USUARIO = "id, nome, email, papel, ativo, trocar_senha, ultimo_acesso_em"


def _usuario_saida(linha: dict[str, Any], eu: str) -> UsuarioEquipeSaida:
    return UsuarioEquipeSaida(
        id=linha["id"],
        nome=linha["nome"],
        email=linha["email"],
        papel=linha["papel"],
        ativo=bool(int(linha["ativo"])),
        voce=linha["id"] == eu,
        trocar_senha=bool(int(linha.get("trocar_senha") or 0)),
        ultimo_acesso_em=linha.get("ultimo_acesso_em"),
    )


def _config(conexao: Any, empresa_id: str, usuario: dict[str, Any]) -> ConfigEmpresaSaida:
    empresa = buscar_um(
        conexao,
        "SELECT razao_social, plano, porte, atuacao, excluir_sinalizadas FROM empresa WHERE id = ?",
        (empresa_id,),
    )
    if not empresa:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa nao encontrada")
    return ConfigEmpresaSaida(
        razao_social=empresa["razao_social"],
        plano=str(empresa["plano"]),
        porte=str(empresa["porte"]),
        atuacao=str(empresa["atuacao"]),
        excluir_sinalizadas=bool(int(empresa.get("excluir_sinalizadas", 1) or 0)),
        n_minimo=int(config.N_MINIMO_GHE),
        pode_editar=usuario.get("papel") in ("gestor", "admin"),
    )


@router.get("/{empresa_id}/configuracoes", response_model=ConfigEmpresaSaida)
def obter_configuracoes(empresa_id: str, usuario: Usuario, conexao: Conexao) -> ConfigEmpresaSaida:
    """Configurações da empresa visíveis para todo o time. Sprint: S10 | Risco: R2"""
    exigir_empresa(usuario, empresa_id)
    return _config(conexao, empresa_id, usuario)


@router.patch("/{empresa_id}/configuracoes", response_model=ConfigEmpresaSaida)
def atualizar_configuracoes(
    empresa_id: str, dados: ConfigEmpresaAtualizacao, usuario: Usuario, conexao: Conexao
) -> ConfigEmpresaSaida:
    """Porte e atuação (capital em risco) e a política de respostas sinalizadas. Sprint: S10 | Risco: R1/R2"""
    exigir_empresa(usuario, empresa_id)
    exigir_gestao(usuario)
    campos: dict[str, Any] = {}
    if dados.porte is not None:
        campos["porte"] = dados.porte
    if dados.atuacao is not None:
        campos["atuacao"] = dados.atuacao
    if dados.excluir_sinalizadas is not None:
        campos["excluir_sinalizadas"] = 1 if dados.excluir_sinalizadas else 0
    if campos:
        sets = ", ".join(f"{c} = ?" for c in campos)
        executar(conexao, f"UPDATE empresa SET {sets} WHERE id = ?", (*campos.values(), empresa_id))
        registrar(conexao, usuario["id"], "atualizar_configuracoes", f"empresa:{empresa_id}", empresa_id)
    return _config(conexao, empresa_id, usuario)


@router.get("/{empresa_id}/usuarios", response_model=list[UsuarioEquipeSaida])
def listar_equipe(empresa_id: str, usuario: Usuario, conexao: Conexao) -> list[UsuarioEquipeSaida]:
    """Quem tem acesso ao painel da empresa. Sprint: S10 | Risco: R2"""
    exigir_empresa(usuario, empresa_id)
    exigir_gestao(usuario)
    linhas = buscar_todos(
        conexao,
        f"SELECT {_CAMPOS_USUARIO} FROM usuario_empresa WHERE empresa_id = ? ORDER BY ativo DESC, nome",
        (empresa_id,),
    )
    return [_usuario_saida(linha, usuario["id"]) for linha in linhas]


@router.post(
    "/{empresa_id}/usuarios",
    response_model=SenhaTemporariaSaida,
    status_code=status.HTTP_201_CREATED,
)
def convidar(empresa_id: str, dados: ConviteEntrada, usuario: Usuario, conexao: Conexao) -> SenhaTemporariaSaida:
    """Dá acesso a uma pessoa com senha temporária (troca obrigatória no 1º acesso). Sprint: S10 | Risco: R2"""
    exigir_empresa(usuario, empresa_id)
    exigir_gestao(usuario)
    email = dados.email.lower()
    if buscar_um(conexao, "SELECT id FROM usuario_empresa WHERE email = ?", (email,)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Este e-mail já tem acesso.")
    senha = gerar_senha_temporaria()
    novo_id = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO usuario_empresa (id, empresa_id, nome, email, senha_hash, papel, ativo, trocar_senha) "
        "VALUES (?,?,?,?,?,?,1,1)",
        (novo_id, empresa_id, dados.nome.strip(), email, gerar_hash_senha(senha), dados.papel),
    )
    registrar(conexao, usuario["id"], "convidar_usuario", f"usuario_empresa:{novo_id}", empresa_id)
    linha = buscar_um(conexao, f"SELECT {_CAMPOS_USUARIO} FROM usuario_empresa WHERE id = ?", (novo_id,))
    assert linha is not None
    return SenhaTemporariaSaida(usuario=_usuario_saida(linha, usuario["id"]), senha_temporaria=senha)


def _usuario_da_empresa(conexao: Any, empresa_id: str, usuario_id: str) -> dict[str, Any]:
    alvo = buscar_um(
        conexao,
        f"SELECT {_CAMPOS_USUARIO} FROM usuario_empresa WHERE id = ? AND empresa_id = ?",
        (usuario_id, empresa_id),
    )
    if not alvo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "usuario nao encontrado")
    return alvo


@router.patch("/{empresa_id}/usuarios/{usuario_id}/status", response_model=UsuarioEquipeSaida)
def alterar_acesso(
    empresa_id: str, usuario_id: str, dados: AtivacaoAdminEntrada, usuario: Usuario, conexao: Conexao
) -> UsuarioEquipeSaida:
    """Ativa ou desativa o acesso de alguém do time (nunca o próprio). Sprint: S10 | Risco: R2"""
    exigir_empresa(usuario, empresa_id)
    exigir_gestao(usuario)
    if usuario_id == usuario["id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Você não pode desativar o próprio acesso.")
    _usuario_da_empresa(conexao, empresa_id, usuario_id)
    ativo = bool(dados.ativo)
    executar(
        conexao,
        "UPDATE usuario_empresa SET ativo = ?, sessao_versao = sessao_versao + 1 WHERE id = ?",
        (1 if ativo else 0, usuario_id),
    )
    registrar(
        conexao, usuario["id"], "ativar_usuario" if ativo else "desativar_usuario",
        f"usuario_empresa:{usuario_id}", empresa_id,
    )
    return _usuario_saida(_usuario_da_empresa(conexao, empresa_id, usuario_id), usuario["id"])


@router.post("/{empresa_id}/usuarios/{usuario_id}/senha-temporaria", response_model=SenhaTemporariaSaida)
def nova_senha_temporaria(
    empresa_id: str, usuario_id: str, usuario: Usuario, conexao: Conexao
) -> SenhaTemporariaSaida:
    """"Esqueci minha senha": quem administra gera uma senha temporária. Sprint: S10 | Risco: R2"""
    exigir_empresa(usuario, empresa_id)
    exigir_gestao(usuario)
    if usuario_id == usuario["id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Para a sua conta, use Trocar senha.")
    _usuario_da_empresa(conexao, empresa_id, usuario_id)
    senha = gerar_senha_temporaria()
    executar(
        conexao,
        "UPDATE usuario_empresa SET senha_hash = ?, trocar_senha = 1, sessao_versao = sessao_versao + 1 "
        "WHERE id = ?",
        (gerar_hash_senha(senha), usuario_id),
    )
    registrar(conexao, usuario["id"], "senha_temporaria", f"usuario_empresa:{usuario_id}", empresa_id)
    return SenhaTemporariaSaida(
        usuario=_usuario_saida(_usuario_da_empresa(conexao, empresa_id, usuario_id), usuario["id"]),
        senha_temporaria=senha,
    )
