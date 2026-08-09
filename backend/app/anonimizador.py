"""Anonimização de texto livre (Bloco K). Sprint: S6 | Risco: R2 (LGPD Art. 11).

Regra fail-closed: se a anonimização falhar, a resposta é REJEITADA — nunca se
grava texto cru. Usa Microsoft Presidio quando instalado; sem ele, cai no motor
de regex PT-BR (suficiente para dado sintético/teste, NÃO para dado real).

⚠️ Antes de coleta real (pós-CEP), o Presidio é obrigatório: instalar
`presidio-analyzer presidio-anonymizer` + modelo spaCy pt_core_news_lg.
"""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

MOTOR_REGEX = "regex-ptbr-v1"
MOTOR_PRESIDIO = "presidio-v1"

# Padrões de PII mais comuns em texto livre de colaborador brasileiro.
_PADROES: list[tuple[str, re.Pattern[str]]] = [
    ("<CPF>", re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")),
    ("<CNPJ>", re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b")),
    ("<EMAIL>", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
    (
        "<TELEFONE>",
        re.compile(r"(?<!\d)(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}(?!\d)"),
    ),
    ("<CEP>", re.compile(r"\b\d{5}-?\d{3}\b")),
    ("<MATRICULA>", re.compile(r"\bmatr[íi]cula\s*:?\s*\w+", re.IGNORECASE)),
    # Nome próprio: o gatilho é case-insensitive (`(?i:...)`) porque a frase
    # costuma abrir o período — "Sou o Joao Pereira" não casava com `sou`
    # minúsculo e o nome vazava. O grupo 1 preserva o gatilho; só o nome cai.
    (
        r"\1<NOME>",
        re.compile(
            r"((?i:meu nome (?:é|eh)|me chamo|sou (?:o|a)|eu,)\s+)"
            r"((?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú]+)"
            r"(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú]+){0,3})"
        ),
    ),
    (
        r"\1<PESSOA>",
        re.compile(
            r"((?i:gerente|supervisor(?:a)?|chefe|coordenador(?:a)?|diretor(?:a)?|"
            r"colega)\s+)([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú]+)"
        ),
    ),
]


class FalhaAnonimizacao(Exception):
    """Anonimização não pôde ser concluída — a resposta deve ser recusada."""


def _presidio_disponivel() -> bool:
    try:  # pragma: no cover - depende do ambiente
        import presidio_analyzer  # noqa: F401
        import presidio_anonymizer  # noqa: F401

        return True
    except ImportError:
        return False


def _anonimizar_regex(texto: str) -> str:
    """Substitui PII conhecida por marcadores. Determinístico e sem rede."""
    limpo = texto
    for substituicao, padrao in _PADROES:
        limpo = padrao.sub(substituicao, limpo)
    return limpo


def _anonimizar_presidio(texto: str) -> str:  # pragma: no cover - opcional
    """Anonimiza com Presidio (PT), preservando o marcador por tipo de entidade."""
    from presidio_analyzer import AnalyzerEngine
    from presidio_anonymizer import AnonymizerEngine

    analisador = AnalyzerEngine()
    anonimizador = AnonymizerEngine()
    achados = analisador.analyze(text=texto, language="pt")
    return anonimizador.anonymize(text=texto, analyzer_results=achados).text


def anonimizar(texto: str | None) -> tuple[str | None, str]:
    """Anonimiza o texto livre. Retorna (texto_anonimizado, motor_usado).

    Sprint: S6 | Risco: R2. Levanta FalhaAnonimizacao em qualquer erro
    (fail-closed) — o chamador deve devolver 422 e não gravar nada.
    """
    if texto is None or not texto.strip():
        return None, MOTOR_REGEX

    try:
        if _presidio_disponivel():
            limpo = _anonimizar_presidio(texto)
            motor = MOTOR_PRESIDIO
        else:
            limpo = _anonimizar_regex(texto)
            motor = MOTOR_REGEX
            logger.warning(
                "Presidio ausente — usando %s. Não usar em coleta real.", MOTOR_REGEX
            )
    except Exception as erro:  # fail-closed
        logger.error("falha na anonimizacao: %s", erro)
        raise FalhaAnonimizacao("nao foi possivel anonimizar o texto livre") from erro

    if not limpo.strip():
        raise FalhaAnonimizacao("texto vazio apos anonimizacao")
    logger.info("texto anonimizado com %s (%d chars)", motor, len(limpo))
    return limpo, motor
