"""Gestão de GHEs e coletas. Sprint: S6 | Risco: R2 (isolamento por empresa)."""

from __future__ import annotations

import logging
import secrets
import uuid

from fastapi import APIRouter, HTTPException, status

from ..auditoria import registrar, verificar_cadeia
from ..config import config
from ..db import buscar_todos, executar
from ..deps import Conexao, Usuario, exigir_empresa
from ..instrumento import carregar_instrumento
from ..schemas import (
    ColetaEntrada,
    ColetaSaida,
    GHESaida,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/empresas", tags=["empresas"])


@router.get("/{empresa_id}/ghes", response_model=list[GHESaida])
def listar_ghes(empresa_id: str, usuario: Usuario, conexao: Conexao) -> list[GHESaida]:
    """Lista os Grupos Homogêneos de Exposição da empresa (NR-1)."""
    exigir_empresa(usuario, empresa_id)
    linhas = buscar_todos(
        conexao,
        "SELECT id, codigo, nome, setor, efetivo FROM ghe WHERE empresa_id = ? "
        "ORDER BY codigo",
        (empresa_id,),
    )
    return [GHESaida(**linha) for linha in linhas]


@router.get("/{empresa_id}/coletas", response_model=list[ColetaSaida])
def listar_coletas(
    empresa_id: str, usuario: Usuario, conexao: Conexao
) -> list[ColetaSaida]:
    """Lista as coletas da empresa com a contagem agregada de respostas."""
    exigir_empresa(usuario, empresa_id)
    linhas = buscar_todos(
        conexao,
        "SELECT c.id, c.titulo, c.status, c.origem_dados, c.instrumento, "
        "c.token_publico, "
        "c.aberta_em, COUNT(r.id) AS total_respostas "
        "FROM coleta c LEFT JOIN resposta r ON r.coleta_id = c.id "
        "WHERE c.empresa_id = ? GROUP BY c.id ORDER BY c.aberta_em DESC",
        (empresa_id,),
    )
    return [ColetaSaida(**linha) for linha in linhas]


@router.post(
    "/{empresa_id}/coletas",
    response_model=ColetaSaida,
    status_code=status.HTTP_201_CREATED,
)
def criar_coleta(
    empresa_id: str, dados: ColetaEntrada, usuario: Usuario, conexao: Conexao
) -> ColetaSaida:
    """Abre uma coleta e gera o token público do formulário.

    Risco: R2 — origem 'real' exige CEP aprovado (flag PSYRA_CEP_APROVADO).
    """
    exigir_empresa(usuario, empresa_id)
    if dados.origem_dados == "real" and not config.CEP_APROVADO:
        logger.warning(
            "tentativa de coleta real sem CEP aprovado (empresa %s)", empresa_id
        )
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "coleta com dado real bloqueada: aprovacao do CEP nao registrada",
        )

    try:  # instrumento inexistente vira 400, não 500 na primeira resposta
        carregar_instrumento(dados.instrumento)
    except (OSError, KeyError, ValueError) as erro:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"instrumento desconhecido: {dados.instrumento}",
        ) from erro

    coleta_id = uuid.uuid4().hex
    token = secrets.token_urlsafe(12)
    executar(
        conexao,
        "INSERT INTO coleta (id, empresa_id, titulo, instrumento, origem_dados, "
        "token_publico, status) VALUES (?,?,?,?,?,?, 'aberta')",
        (
            coleta_id,
            empresa_id,
            dados.titulo,
            dados.instrumento,
            dados.origem_dados,
            token,
        ),
    )
    registrar(conexao, usuario["id"], "criar_coleta", f"coleta:{coleta_id}", empresa_id)
    linha = buscar_todos(
        conexao,
        "SELECT id, titulo, status, origem_dados, instrumento, token_publico, aberta_em "
        "FROM coleta WHERE id = ?",
        (coleta_id,),
    )[0]
    logger.info("coleta criada: %s (%s)", coleta_id, dados.origem_dados)
    return ColetaSaida(**linha, total_respostas=0)


@router.post("/{empresa_id}/coletas/{coleta_id}/encerrar", response_model=ColetaSaida)
def encerrar_coleta(
    empresa_id: str, coleta_id: str, usuario: Usuario, conexao: Conexao
) -> ColetaSaida:
    """Encerra a coleta — o formulário público passa a recusar novas respostas."""
    exigir_empresa(usuario, empresa_id)
    executar(
        conexao,
        "UPDATE coleta SET status = 'encerrada', encerrada_em = datetime('now') "
        "WHERE id = ? AND empresa_id = ?",
        (coleta_id, empresa_id),
    )
    registrar(
        conexao, usuario["id"], "encerrar_coleta", f"coleta:{coleta_id}", empresa_id
    )
    linhas = buscar_todos(
        conexao,
        "SELECT c.id, c.titulo, c.status, c.origem_dados, c.instrumento, "
        "c.token_publico, c.aberta_em, "
        "COUNT(r.id) AS total_respostas FROM coleta c "
        "LEFT JOIN resposta r ON r.coleta_id = c.id WHERE c.id = ? GROUP BY c.id",
        (coleta_id,),
    )
    if not linhas:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "coleta nao encontrada")
    return ColetaSaida(**linhas[0])


@router.get("/{empresa_id}/auditoria")
def consultar_auditoria(
    empresa_id: str, usuario: Usuario, conexao: Conexao, limite: int = 50
) -> dict[str, object]:
    """Últimos eventos + verificação de integridade da cadeia (LGPD Art. 37)."""
    exigir_empresa(usuario, empresa_id)
    eventos = buscar_todos(
        conexao,
        "SELECT acao, entidade, hash_atual, registrado_em FROM log_auditoria "
        "WHERE empresa_id = ? ORDER BY registrado_em DESC LIMIT ?",
        (empresa_id, min(limite, 200)),
    )
    return {"integridade": verificar_cadeia(conexao), "eventos": eventos}
