"""Motor de risco psicossocial. Sprint: S6 | Risco: R1 (validade técnica).

⚠️ LEIA ANTES DE USAR ESTES NÚMEROS EM QUALQUER LUGAR
Este é um motor DETERMINÍSTICO DE REGRA, não um modelo treinado. Ele existe
para que o produto rode ponta a ponta antes da aprovação do CEP. Nenhuma saída
daqui é métrica de modelo (F1, AUC, etc.) e nada aqui pode ser apresentado como
resultado de IA no artigo ou em material comercial.

Substituições previstas:
- `indice_likert`  -> XGBoost calibrado (62 features), validação OOD em dado real
- `sinal_texto`    -> MentalBERT-PT (BERTimbau fine-tuned)
- `fatores`        -> SHAP (Art. 20 LGPD), obrigatório para explicabilidade real

Convenção de escala: 0 a 100, onde 100 = maior exposição a risco.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

from .config import config
from .instrumento import carregar_instrumento

logger = logging.getLogger(__name__)

LIMIAR_MODERADO = 40.0
LIMIAR_ALTO = 60.0
LIMIAR_DIVERGENCIA = 12.0  # |texto - likert| acima disso aciona "O Revelador"

# Léxico provisório PT-BR. Pesos empíricos de placeholder, sem validação clínica.
_LEXICO_RISCO: dict[str, float] = {
    "exausto": 3.0,
    "exaustao": 3.0,
    "esgotado": 3.0,
    "esgotamento": 3.0,
    "burnout": 3.5,
    "sobrecarga": 2.5,
    "sobrecarregado": 2.5,
    "acumulo": 2.0,
    "insonia": 3.0,
    "nao durmo": 3.0,
    "sem dormir": 2.5,
    "ansiedade": 3.0,
    "ansioso": 2.5,
    "panico": 3.5,
    "choro": 3.0,
    "chorando": 3.0,
    "medo": 2.5,
    "assedio": 4.0,
    "humilhacao": 4.0,
    "humilhado": 4.0,
    "gritam": 3.0,
    "grita": 3.0,
    "ofensa": 3.0,
    "constrangido": 3.0,
    "pressao": 2.0,
    "cobranca": 2.0,
    "prazo impossivel": 2.5,
    "hora extra": 2.0,
    "fim de semana": 1.5,
    "ferias": 1.0,
    "desanimado": 2.5,
    "sem sentido": 2.5,
    "adoecendo": 3.5,
    "afastamento": 3.0,
    "pedir demissao": 3.5,
    "quero sair": 3.0,
    "nao aguento": 3.5,
    "sozinho": 2.0,
    "sem apoio": 3.0,
    "ignorado": 2.5,
    "injusto": 2.0,
    "cansado": 2.0,
    "cansaco": 2.0,
    "estresse": 2.5,
    "estressado": 2.5,
    "irritado": 2.0,
    "no limite": 3.0,
    "nao consigo dormir": 3.0,
    "dificuldade para dormir": 3.0,
    "nao consigo desconectar": 2.5,
    "desconectar": 1.5,
    "silenciosa": 1.5,
    "clima tenso": 2.5,
    "tenso": 1.5,
    "ninguem escuta": 2.5,
    "falta gente": 2.0,
    "prazo apertado": 2.0,
    "meta inatingivel": 2.5,
    "retaliacao": 3.0,
    "sem reconhecimento": 2.5,
}
_LEXICO_PROTECAO: dict[str, float] = {
    "tranquilo": 2.0,
    "equilibrio": 2.0,
    "apoio": 2.0,
    "acolhido": 2.5,
    "reconhecido": 2.5,
    "satisfeito": 2.0,
    "gosto do": 2.0,
    "boa equipe": 2.5,
    "flexivel": 1.5,
    "respeito": 2.0,
    "aprendendo": 1.5,
    "orgulho": 2.0,
}
_NEGACOES = ("nao ", "nunca ", "jamais ", "sem ")


def _normalizar(texto: str) -> str:
    """Minúsculas, sem acento e sem pontuação — para casar com o léxico."""
    sem_acento = "".join(
        caractere
        for caractere in unicodedata.normalize("NFD", texto.lower())
        if unicodedata.category(caractere) != "Mn"
    )
    return re.sub(r"[^\w\s]", " ", sem_acento)


def _texto_e_reverso(item: Any, reverso_do_bloco: bool) -> tuple[str, bool]:
    """Normaliza um item do instrumento em (texto, reverso).

    Aceita duas formas. Item como string usa o `reverso` do bloco — é o formato
    dos instrumentos onde a dimensão inteira tem a mesma polaridade. Item como
    objeto traz o próprio `reverso`, necessário quando o bloco mistura frase
    protetora e frase de risco (o formulário real faz isso em Carga de trabalho
    e em Equilíbrio trabalho-vida). Errar a polaridade inverte o score em
    silêncio, então ela é declarada item a item.
    """
    if isinstance(item, dict):
        return str(item.get("texto", "")), bool(item.get("reverso", reverso_do_bloco))
    return str(item), reverso_do_bloco


def calcular_indice_likert(
    respostas: dict[str, int], instrumento_codigo: str = "nr1_v2_demo"
) -> tuple[float, dict[str, float]]:
    """Converte respostas Likert 1-5 em índice 0-100 e índice por bloco.

    Sprint: S6 | Risco: R1. Blocos marcados `reverso` são invertidos (6 - x),
    pois neles a nota alta indica proteção, não risco.
    """
    instrumento = carregar_instrumento(instrumento_codigo)
    por_bloco: dict[str, float] = {}
    soma_ponderada = 0.0
    soma_pesos = 0.0

    for bloco in instrumento["blocos"]:
        codigo = str(bloco["codigo"])
        valores: list[float] = []
        for indice, item in enumerate(bloco["itens"], start=1):
            bruto = respostas.get(f"{codigo}{indice}")
            if bruto is None:
                continue
            if not 1 <= int(bruto) <= 5:
                raise ValueError(f"item {codigo}{indice} fora da escala 1-5: {bruto}")
            _, reverso = _texto_e_reverso(item, bool(bloco.get("reverso", False)))
            valor = 6 - int(bruto) if reverso else int(bruto)
            valores.append(float(valor))

        if not valores:
            continue
        # média 1..5 -> 0..100
        indice_bloco = (sum(valores) / len(valores) - 1) / 4 * 100
        por_bloco[codigo] = round(indice_bloco, 1)
        peso = float(bloco.get("peso", 1.0))
        soma_ponderada += indice_bloco * peso
        soma_pesos += peso

    if soma_pesos == 0:
        raise ValueError("nenhum item Likert valido informado")

    return round(soma_ponderada / soma_pesos, 1), por_bloco


def calcular_sinal_texto(texto: str | None) -> float | None:
    """Sinal de risco 0-100 a partir do texto livre (heurística provisória).

    Sprint: S6 | Risco: R1 — placeholder do MentalBERT-PT, jamais reportar como
    desempenho de modelo. Retorna None quando não há texto suficiente.
    """
    if not texto or len(texto.strip()) < 15:
        return None

    normalizado = _normalizar(texto)
    pontos = 0.0

    for termo, peso in _LEXICO_RISCO.items():
        ocorrencias = normalizado.count(termo)
        if not ocorrencias:
            continue
        posicao = normalizado.find(termo)
        prefixo = normalizado[max(0, posicao - 12) : posicao]
        negado = any(negacao in prefixo for negacao in _NEGACOES)
        pontos += (-0.5 if negado else 1.0) * peso * min(ocorrencias, 3)

    for termo, peso in _LEXICO_PROTECAO.items():
        if termo in normalizado:
            pontos -= peso

    # Âncora explícita: texto neutro (0 ponto) = 50, o meio da escala de risco.
    # Assim o sinal de texto fica comparável ao índice Likert e a divergência do
    # "Revelador" tem leitura direta. Curva logística com temperatura 3,0.
    escala = 100 / (1 + pow(2.718281828, -pontos / 3.0))
    return round(max(0.0, min(100.0, escala)), 1)


def classificar_nivel(indice: float) -> str:
    """Mapeia índice 0-100 para baixo/moderado/alto (limiares do produto)."""
    if indice >= LIMIAR_ALTO:
        return "alto"
    if indice >= LIMIAR_MODERADO:
        return "moderado"
    return "baixo"


def agregar_ghe(
    respostas_do_ghe: list[dict[str, Any]], instrumento_codigo: str = "nr1_v2_demo"
) -> dict[str, Any]:
    """Agrega as respostas de um GHE em um resultado de grupo.

    Sprint: S6 | Risco: R2 — a supressão por n<5 é aplicada aqui E na view do
    banco (defesa em profundidade). Nunca devolve linha individual.
    """
    quantidade = len(respostas_do_ghe)
    if quantidade == 0:
        return {
            "n_respostas": 0,
            "indice_likert": None,
            "indice_texto": None,
            "divergencia": None,
            "nivel_risco": None,
            "fatores": [],
            "mascarado": True,
        }

    indices: list[float] = []
    blocos_acumulados: dict[str, list[float]] = {}
    sinais_texto: list[float] = []

    for resposta in respostas_do_ghe:
        try:
            indice, por_bloco = calcular_indice_likert(
                resposta["likert"], instrumento_codigo
            )
        except ValueError as erro:
            logger.error("resposta descartada na agregacao: %s", erro)
            continue
        indices.append(indice)
        for codigo, valor in por_bloco.items():
            blocos_acumulados.setdefault(codigo, []).append(valor)
        sinal = calcular_sinal_texto(resposta.get("texto"))
        if sinal is not None:
            sinais_texto.append(sinal)

    if not indices:
        raise ValueError("nenhuma resposta valida no GHE")

    indice_likert = round(sum(indices) / len(indices), 1)
    indice_texto = (
        round(sum(sinais_texto) / len(sinais_texto), 1) if sinais_texto else None
    )
    divergencia = (
        round(indice_texto - indice_likert, 1) if indice_texto is not None else None
    )

    instrumento = carregar_instrumento(instrumento_codigo)
    nomes = {b["codigo"]: b["dimensao"] for b in instrumento["blocos"]}
    fatores = sorted(
        (
            {
                "bloco": codigo,
                "dimensao": nomes.get(codigo, codigo),
                "indice": round(sum(valores) / len(valores), 1),
            }
            for codigo, valores in blocos_acumulados.items()
        ),
        key=lambda item: item["indice"],
        reverse=True,
    )

    mascarado = quantidade < config.N_MINIMO_GHE
    resultado = {
        "n_respostas": quantidade,
        "indice_likert": indice_likert,
        "indice_texto": indice_texto,
        "divergencia": divergencia,
        "nivel_risco": classificar_nivel(indice_likert),
        "fatores": fatores[:5],
        "revelador": divergencia is not None and abs(divergencia) >= LIMIAR_DIVERGENCIA,
        "mascarado": mascarado,
        "motor_versao": config.MOTOR_VERSAO,
    }
    logger.info(
        "GHE agregado: n=%d likert=%.1f texto=%s",
        quantidade,
        indice_likert,
        indice_texto,
    )
    return resultado


def mascarar(resultado: dict[str, Any]) -> dict[str, Any]:
    """Remove todo número de um GHE com n < 5 (k-anonimato). Risco: R2."""
    return {
        "n_respostas": resultado["n_respostas"],
        "indice_likert": None,
        "indice_texto": None,
        "divergencia": None,
        "nivel_risco": None,
        "fatores": [],
        "revelador": False,
        "mascarado": True,
        "motivo_mascara": f"n < {config.N_MINIMO_GHE} (k-anonimato)",
        "motor_versao": config.MOTOR_VERSAO,
    }
