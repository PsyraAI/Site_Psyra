"""Validação e persistência compartilhadas pelas coletas nativa e Google Forms."""

from __future__ import annotations

import json
import secrets
import uuid
from typing import Any

from .anonimizador import anonimizar
from .db import executar
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
) -> RespostaSaida:
    """Valida, anonimiza e grava sem aceitar identificadores do respondente."""
    calcular_indice_likert(likert, coleta["instrumento"])
    texto_limpo, motor = anonimizar(texto_livre)
    protocolo = secrets.token_hex(4).upper()

    executar(
        conexao,
        "INSERT INTO resposta (id, coleta_id, ghe_id, likert_json, "
        "texto_anonimizado, anonimizacao_ok, motor_anonimizacao, protocolo, "
        "origem_externa, id_externo) VALUES (?,?,?,?,?,?,?,?,?,?)",
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
        ),
    )
    return RespostaSaida(
        protocolo=protocolo,
        mensagem="Resposta registrada de forma anônima. Obrigado por participar.",
        anonimizacao={"motor": motor, "texto_recebido": texto_limpo is not None},
    )
