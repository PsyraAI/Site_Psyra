"""Coleta pública (respondente anônimo). Sprint: S6 | Risco: R2.

Fluxo: GET /v1/coletas/{token}/formulario -> POST /v1/coleta
O respondente não tem login, não informa nome e não recebe resultado individual.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..anonimizador import FalhaAnonimizacao
from ..auditoria import registrar
from ..config import config
from ..db import buscar_todos, buscar_um, executar
from ..deps import Conexao
from ..instrumento import carregar_instrumento
from ..rate_limit import limitar
from ..schemas import InicioEntrada, RespostaEntrada, RespostaSaida
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
            tempos_partes=dados.tempos_partes,
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


@router.post(
    "/v1/coletas/{token}/inicio",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(limitar(config.RATE_COLETA))],
)
def registrar_inicio(token: str, dados: InicioEntrada, conexao: Conexao) -> Response:
    """Conta quem começou o questionário, para medir a evasão (começaram × responderam).

    Risco: R2 — guarda só a coleta, o grupo (na etapa "grupo") e o DIA; sem horário,
    sem IP,
    sem identificador, para não dar para ligar o começo a uma resposta. Sprint: S10
    """
    coleta = buscar_um(
        conexao,
        "SELECT id, empresa_id, status FROM coleta WHERE token_publico = ?",
        (token,),
    )
    if not coleta or coleta["status"] != "aberta":
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    ghe_id = None
    if dados.etapa == "grupo" and dados.ghe_codigo:
        ghe = buscar_um(
            conexao,
            "SELECT id FROM ghe WHERE empresa_id = ? AND codigo = ?",
            (coleta["empresa_id"], dados.ghe_codigo),
        )
        if not ghe:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "GHE invalido para a empresa"
            )
        ghe_id = ghe["id"]
    executar(
        conexao,
        "INSERT INTO coleta_inicio (id, coleta_id, ghe_id, etapa, dia) VALUES "
        "(?,?,?,?,?)",
        (
            uuid.uuid4().hex,
            coleta["id"],
            ghe_id,
            dados.etapa,
            datetime.now(UTC).date().isoformat(),
        ),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
