"""Qualidade das respostas: pressa, linha reta e incoerência. Sprint: S10 | Risco: R1 + R2.

Responde à pergunta da banca: "o modelo considera o cansaço de quem responde, a evasão e se a
pessoa responde com sinceridade?". Cada resposta recebe três verificações, calculadas só com o
que a própria pessoa marcou (nada de identificação):

- rápida: partes respondidas a menos de 2 segundos por item (Huang et al., 2012; validado por
  Bowling et al., 2023, Organizational Research Methods) ou o questionário inteiro abaixo disso;
- linha reta: 70% ou mais das respostas com o mesmo número (Meade e Craig, 2012);
- incoerente: as respostas recodificadas para "mais = mais risco" variam demais dentro do mesmo
  bloco, o que acontece quando a pessoa marca sem ler frases de direções opostas.

Os limiares de linha reta e incoerência foram escolhidos na validação da base simulada v6
(scripts/S10_ML_qualidade_respostas_v6_v1.py): no máximo 3% dos atentos sinalizados; no teste
(26 empresas simuladas), 95% dos descuidados detectados com 2,5% dos atentos sinalizados.

A resposta sinalizada NUNCA é apagada e NUNCA aparece individualmente: o painel mostra só a
contagem por grupo com 5+ respostas. Se a empresa escolher, ela sai do cálculo do índice do
grupo desde que o grupo continue com 5+ respostas válidas (k-anonimato preservado).
"""

from __future__ import annotations

import logging
import statistics
from typing import Any

from .instrumento import carregar_instrumento

logger = logging.getLogger(__name__)

VERSAO = "qualidade-v1"
SEG_POR_ITEM_MIN = 2.0  # Huang et al. (2012)
PARTES_RAPIDAS_MIN = 3  # 3 de 10 partes abaixo de 2 s/item já é pressa repetida, não um deslize
LIMIAR_IGUAL = 0.70  # escolhido na validação v6
LIMIAR_INCOERENCIA = 0.872  # escolhido na validação v6 (desvio-padrão médio por bloco)
TEMPO_MAX_PARTE_S = 3600


def _itens_por_bloco(instrumento: dict[str, Any]) -> list[tuple[str, list[tuple[str, bool]]]]:
    """[(bloco, [(codigo_item, reverso), ...]), ...] no formato do instrumento. Sprint: S10 | Risco: R1"""
    saida = []
    for bloco in instrumento["blocos"]:
        reverso_bloco = bool(bloco.get("reverso", False))
        itens = []
        for i, item in enumerate(bloco["itens"], start=1):
            reverso = bool(item.get("reverso", reverso_bloco)) if isinstance(item, dict) else reverso_bloco
            itens.append((f"{bloco['codigo']}{i}", reverso))
        saida.append((str(bloco["codigo"]), itens))
    return saida


def tempos_validos(tempos: list[int] | None, n_partes: int) -> list[int] | None:
    """Normaliza os segundos por parte vindos do navegador (ou None se não vieram). Sprint: S10 | Risco: R2"""
    if not tempos or len(tempos) != n_partes:
        return None
    return [max(0, min(TEMPO_MAX_PARTE_S, int(t))) for t in tempos]


def avaliar(
    likert: dict[str, int], instrumento_codigo: str, tempos_partes: list[int] | None = None
) -> dict[str, Any]:
    """Calcula as verificações de qualidade de UMA resposta (uso interno; nunca exibido sozinho).

    Sprint: S10 | Risco: R1/R2
    """
    logger_local = logging.getLogger(__name__)
    try:
        blocos = _itens_por_bloco(carregar_instrumento(instrumento_codigo))
        valores = [int(likert[c]) for _, itens in blocos for c, _ in itens if c in likert]
        if not valores:
            raise ValueError("resposta sem itens do instrumento")
        mais_comum = max(valores.count(v) for v in set(valores))
        igual = mais_comum / len(valores)

        desvios = []
        for _, itens in blocos:
            risco = [6 - int(likert[c]) if rev else int(likert[c]) for c, rev in itens if c in likert]
            if len(itens) >= 3 and len(risco) >= 2:
                desvios.append(statistics.pstdev(risco))
        incoerencia = sum(desvios) / len(desvios) if desvios else 0.0

        tempos = tempos_validos(tempos_partes, len(blocos))
        partes_rapidas = 0
        total_s = None
        if tempos is not None:
            total_s = sum(tempos)
            partes_rapidas = sum(
                1 for (_, itens), seg in zip(blocos, tempos) if seg < SEG_POR_ITEM_MIN * len(itens)
            )
        rapida = tempos is not None and (
            partes_rapidas >= PARTES_RAPIDAS_MIN or (total_s or 0) < SEG_POR_ITEM_MIN * len(valores)
        )
        linha_reta = igual >= LIMIAR_IGUAL
        incoerente = incoerencia >= LIMIAR_INCOERENCIA
        motivos = [m for m, ok in (("rapida", rapida), ("linha_reta", linha_reta), ("incoerente", incoerente)) if ok]
        resultado = {
            "versao": VERSAO,
            "igual_frac": round(igual, 3),
            "incoerencia": round(incoerencia, 3),
            "partes_rapidas": partes_rapidas,
            "com_tempo": tempos is not None,
            "rapida": rapida,
            "linha_reta": linha_reta,
            "incoerente": incoerente,
            "motivos": motivos,
            "sinalizada": bool(motivos),
        }
        logger_local.info("qualidade calculada: %s", motivos or "ok")
        return resultado
    except Exception as erro:
        logger_local.error("falha na qualidade da resposta: %s", erro)
        raise


def ritmo_por_parte(lista_tempos: list[list[int]], instrumento_codigo: str) -> list[dict[str, Any]]:
    """Segundos por item (mediana) em cada parte — mostra se o ritmo acelera no fim (cansaço).

    Só agregado; quem chama garante n ≥ 5. Sprint: S10 | Risco: R2
    """
    blocos = _itens_por_bloco(carregar_instrumento(instrumento_codigo))
    saida = []
    for j, (codigo, itens) in enumerate(blocos):
        por_item = [t[j] / len(itens) for t in lista_tempos if len(t) == len(blocos)]
        if por_item:
            saida.append({"parte": j + 1, "bloco": codigo, "seg_por_item": round(statistics.median(por_item), 1)})
    return saida
