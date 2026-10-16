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
import unicodedata

logger = logging.getLogger(__name__)

MOTOR_REGEX = "regex-ptbr-v2"
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


# Prenomes mais comuns no Brasil (Censo IBGE 2010), sem acento e em minúsculas. Servem
# para achar nome de terceiro em qualquer posição ("falei com o Carlos Souza").
_PRENOMES = frozenset(
    """
    maria jose ana joao antonio francisco carlos paulo pedro lucas luiz marcos luis gabriel
    rafael francisca daniel marcelo bruno eduardo felipe raimundo rodrigo manoel mateus andre
    fernando fabio leonardo gustavo guilherme leandro tiago anderson ricardo marcio jorge
    sebastiao alexandre roberto edson diego vitor sergio claudio matheus thiago geraldo adriano
    luciano julio renato alex vinicius rogerio samuel ronaldo mario flavio douglas igor davi
    manuel jeferson cicero victor miguel robson mauricio danilo henrique caio reginaldo joaquim
    benedito gilberto marco alan nelson cristiano elias wilson valdir emerson luan david renan
    severino fabricio mauro jonas gilmar jean fabiano wesley diogo adilson jair alessandro
    everton osvaldo gilson willian joel silvio helio maicon reinaldo pablo artur vagner
    valter celso arthur heitor bernardo enzo murilo otavio
    antonia adriana juliana marcia fernanda patricia aline sandra camila amanda bruna jessica
    leticia julia luciana vanessa mariana gabriela vera vitoria larissa claudia beatriz luana
    rita sonia renata eliane josefa simone natalia cristiane carla debora rosangela jaqueline
    rosa daniela aparecida marlene terezinha raimunda andreia fabiana lucia raquel ivone
    tatiane thais regina sara cristina isabela rafaela priscila carolina rosana alessandra
    roberta helena valeria michele joana paula viviane laura sabrina silvia monica tania
    sueli vania lorena milena alice cecilia heloisa manuela livia sophia sofia valentina
    lara yasmin isadora clara marina giovana lais bianca debora estela gisele joice karina
    kelly luzia marta neide rose solange tereza
    """.split()
)
_PALAVRA = r"[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõçà-ÿ]+"
_SEQUENCIA = re.compile(rf"(?<![\wÀ-ÿ<])({_PALAVRA}(?:\s+(?:d[aeo]s?\s+)?{_PALAVRA}){{0,3}})")
_LUGAR_ANTES = re.compile(r"(?:S[ãa]o|Sant[ao]|Rio|Porto|Belo|Campo|Vila)\s*$")
# Começos que indicam lugar ou área da empresa, não pessoa ("São Paulo", "Recursos Humanos").
_NAO_PESSOA = frozenset(
    """
    sao santa santo rio porto belo campo campos vila nova novo minas mato espirito
    recursos departamento setor diretoria gerencia tecnologia comercial financeiro operacional
    marketing logistica atendimento juridico vendas compras seguranca qualidade producao
    engenharia administrativo administracao contabilidade suporte operacoes comite conselho
    ministerio justica governo prefeitura receita caixa banco empresa grupo psyra
    """.split()
)


def _sem_acento(palavra: str) -> str:
    return unicodedata.normalize("NFKD", palavra).encode("ascii", "ignore").decode().lower()


def _mascarar_nomes(texto: str) -> str:
    """Troca por <PESSOA> o que parece nome de pessoa em qualquer posição.

    É nome quando começa por um prenome comum ou quando são duas ou mais palavras
    com inicial maiúscula no meio da frase. Lugares ("São Paulo") ficam. Prefere
    errar para o lado de apagar: um falso positivo custa uma palavra, um falso
    negativo expõe alguém.
    """

    def trocar(achado: re.Match[str]) -> str:
        trecho = achado.group(1)
        antes = texto[: achado.start(1)]
        if _LUGAR_ANTES.search(antes):
            return trecho
        palavras = [p for p in trecho.split() if not re.fullmatch(r"d[aeo]s?", p)]
        if _sem_acento(palavras[0]) in _NAO_PESSOA:
            return trecho
        inicio_de_frase = not antes.strip() or antes.rstrip()[-1] in ".!?\n:;\"“("
        if _sem_acento(palavras[0]) in _PRENOMES:
            return "<PESSOA>"
        if len(palavras) >= 2 and not inicio_de_frase:
            return "<PESSOA>"
        return trecho

    return _SEQUENCIA.sub(trocar, texto)


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
    return _mascarar_nomes(limpo)


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
