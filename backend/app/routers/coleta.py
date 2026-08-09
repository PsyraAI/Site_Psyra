"""Coleta pública (respondente anônimo). Sprint: S6 | Risco: R2.

Fluxo: GET /v1/coletas/{token}/formulario -> POST /v1/coleta
O respondente não tem login, não informa nome e não recebe resultado individual.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from ..anonimizador import FalhaAnonimizacao
from ..auditoria import registrar
from ..config import config
from ..db import buscar_todos, buscar_um
from ..deps import Conexao
from ..instrumento import carregar_instrumento
from ..rate_limit import limitar
from ..schemas import RespostaEntrada, RespostaSaida
from ..servico_respostas import gravar_resposta_anonima

logger = logging.getLogger(__name__)
router = APIRouter(tags=["coleta"])


@router.get("/v1/coletas/{token}/formulario")
def obter_formulario(token: str, conexao: Conexao) -> dict[str, object]:
    """Entrega instrumento, consentimento e GHEs para o formulário público."""
    coleta = buscar_um(
        conexao,
        "SELECT c.id, c.titulo, c.status, c.instrumento, c.empresa_id, e.razao_social "
        "FROM coleta c JOIN empresa e ON e.id = c.empresa_id WHERE c.token_publico = ?",
        (token,),
    )
    if not coleta:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "coleta nao encontrada")
    if coleta["status"] != "aberta":
        raise HTTPException(status.HTTP_410_GONE, "coleta encerrada")

    instrumento = carregar_instrumento(coleta["instrumento"])
    ghes = buscar_todos(
        conexao,
        "SELECT codigo, nome, setor FROM ghe WHERE empresa_id = ? ORDER BY codigo",
        (coleta["empresa_id"],),
    )
    return {
        "coleta": {"titulo": coleta["titulo"], "empresa": coleta["razao_social"]},
        "instrumento": instrumento,
        "ghes": ghes,
    }


@router.post(
    "/v1/coleta",
    response_model=RespostaSaida,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limitar(config.RATE_COLETA))],
)
def receber_resposta(dados: RespostaEntrada, conexao: Conexao) -> RespostaSaida:
    """Recebe uma resposta anônima, anonimiza o Bloco K e grava.

    Risco: R2 — fail-closed: se a anonimização falhar, devolve 422 e NADA é
    persistido. Nenhum identificador do respondente é aceito ou registrado.
    """
    coleta = buscar_um(
        conexao,
        "SELECT id, empresa_id, status, instrumento FROM coleta WHERE token_publico = ?",
        (dados.token_coleta,),
    )
    if not coleta:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "coleta nao encontrada")
    if coleta["status"] != "aberta":
        raise HTTPException(status.HTTP_410_GONE, "coleta encerrada")

    ghe = buscar_um(
        conexao,
        "SELECT id FROM ghe WHERE empresa_id = ? AND codigo = ?",
        (coleta["empresa_id"], dados.ghe_codigo),
    )
    if not ghe:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "GHE invalido para a empresa")

    try:
        resposta = gravar_resposta_anonima(
            conexao,
            coleta=coleta,
            ghe_id=ghe["id"],
            likert=dados.likert,
            texto_livre=dados.texto_livre,
        )
    except ValueError as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(erro)) from erro
    except FalhaAnonimizacao as erro:
        logger.error("resposta recusada por falha de anonimizacao: %s", erro)
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "texto livre nao pode ser anonimizado; resposta nao registrada",
        ) from erro

    registrar(
        conexao,
        ator="anonimo",
        acao="receber_resposta",
        entidade=f"coleta:{coleta['id']}",
        empresa_id=coleta["empresa_id"],
    )
    logger.info(
        "resposta registrada (protocolo %s, motor %s)",
        resposta.protocolo,
        resposta.anonimizacao["motor"],
    )
    return resposta
