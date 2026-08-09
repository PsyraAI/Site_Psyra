"""Webhooks externos com vínculo de empresa resolvido exclusivamente no servidor."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import ValidationError

from ..anonimizador import FalhaAnonimizacao
from ..auditoria import registrar
from ..config import config
from ..db import buscar_um, executar
from ..deps import Conexao
from ..forms_integracao import (
    assinatura_valida,
    garantir_ghe_forms,
    normalizar_resposta_forms,
)
from ..instrumento import carregar_instrumento
from ..rate_limit import limitar
from ..schemas import GoogleFormsWebhookEntrada
from ..servico_respostas import gravar_resposta_anonima

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/integracoes", tags=["integracoes"])


@router.post(
    "/google-forms/{coleta_id}",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limitar(config.RATE_WEBHOOK))],
)
async def receber_google_forms(
    coleta_id: str,
    request: Request,
    conexao: Conexao,
    assinatura: str | None = Header(default=None, alias="X-Psyra-Signature"),
) -> dict[str, object]:
    """Recebe resposta do Apps Script sem confiar em empresa enviada no payload."""
    corpo = await request.body()
    if not assinatura_valida(coleta_id, corpo, assinatura):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "assinatura invalida")

    try:
        dados = GoogleFormsWebhookEntrada.model_validate_json(corpo)
    except ValidationError as erro:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            erro.errors(include_url=False),
        ) from erro

    coleta = buscar_um(
        conexao,
        "SELECT id, empresa_id, status, instrumento, google_form_ativo "
        "FROM coleta WHERE id = ? AND google_form_id IS NOT NULL",
        (coleta_id,),
    )
    if not coleta or not coleta["google_form_ativo"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "integracao nao encontrada")
    if coleta["status"] != "aberta":
        raise HTTPException(status.HTTP_410_GONE, "coleta encerrada")

    existente = buscar_um(
        conexao,
        "SELECT protocolo FROM resposta WHERE coleta_id = ? "
        "AND origem_externa = 'google_forms' AND id_externo = ?",
        (coleta_id, dados.response_id),
    )
    if existente:
        return {
            "recebida": True,
            "duplicada": True,
            "protocolo": existente["protocolo"],
        }

    instrumento = carregar_instrumento(coleta["instrumento"])
    try:
        setor, likert, texto_livre = normalizar_resposta_forms(dados, instrumento)
        ghe_id = garantir_ghe_forms(conexao, coleta["empresa_id"], setor)
        resposta = gravar_resposta_anonima(
            conexao,
            coleta=coleta,
            ghe_id=ghe_id,
            likert=likert,
            texto_livre=texto_livre,
            origem_externa="google_forms",
            id_externo=dados.response_id,
        )
    except ValueError as erro:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(erro)) from erro
    except FalhaAnonimizacao as erro:
        logger.error("webhook Forms recusado por falha de anonimizacao: %s", erro)
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "texto livre nao pode ser anonimizado; resposta nao registrada",
        ) from erro

    executar(
        conexao,
        "UPDATE coleta SET google_form_ultima_resposta_em = datetime('now') WHERE id = ?",
        (coleta_id,),
    )
    executar(
        conexao,
        "UPDATE ghe SET efetivo = (SELECT COUNT(*) FROM resposta WHERE ghe_id = ?) "
        "WHERE id = ?",
        (ghe_id, ghe_id),
    )
    registrar(
        conexao,
        ator="google_forms",
        acao="receber_resposta_forms",
        entidade=f"coleta:{coleta_id}",
        empresa_id=coleta["empresa_id"],
    )
    logger.info("resposta Google Forms registrada na coleta %s", coleta_id)
    return {
        "recebida": True,
        "duplicada": False,
        "protocolo": resposta.protocolo,
    }
