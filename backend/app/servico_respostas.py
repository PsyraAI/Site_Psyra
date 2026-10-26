"""Validação e persistência das respostas do questionário próprio da Psyra."""

from __future__ import annotations

import json
import secrets
import uuid
from typing import Any

from .anonimizador import anonimizar
from .db import executar
from .qualidade import avaliar, tempos_validos
from .schemas import RespostaSaida
from .scoring import calcular_indice_likert


def gravar_resposta_anonima(
    conexao: Any,
    *,
    coleta: dict[str, Any],
    ghe_id: str,
    likert: dict[str, int],
    texto_livre: str | None,
    origem_externa: str | None = None,
    id_externo: str | None = None,
    tempos_partes: list[int] | None = None,
) -> RespostaSaida:
    """Valida, anonimiza, verifica a qualidade e grava sem identificar o respondente."""
    calcular_indice_likert(likert, coleta["instrumento"])
    texto_limpo, motor = anonimizar(texto_livre)
    protocolo = secrets.token_hex(4).upper()
    qualidade = avaliar(likert, coleta["instrumento"], tempos_partes)
    tempos = (
        tempos_validos(tempos_partes, len(tempos_partes or []))
        if qualidade["com_tempo"]
        else None
    )
    duracao = int(round(sum(tempos) / 10.0) * 10) if tempos else None

    executar(
        conexao,
        "INSERT INTO resposta (id, coleta_id, ghe_id, likert_json, "
        "texto_anonimizado, anonimizacao_ok, motor_anonimizacao, protocolo, "
        "origem_externa, id_externo, duracao_s, tempos_partes_json, qualidade_json, "
        "sinalizada) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            uuid.uuid4().hex,
            coleta["id"],
            ghe_id,
            json.dumps(likert, separators=(",", ":")),
            texto_limpo,
            1 if texto_limpo else 0,
            motor,
            protocolo,
            origem_externa,
            id_externo,
            duracao,
            json.dumps(tempos) if tempos else None,
            json.dumps(qualidade, separators=(",", ":")),
            1 if qualidade["sinalizada"] else 0,
        ),
    )
    return RespostaSaida(
        protocolo=protocolo,
        mensagem="Resposta registrada de forma anônima. Obrigado por participar.",
        anonimizacao={"motor": motor, "texto_recebido": texto_limpo is not None},
    )
