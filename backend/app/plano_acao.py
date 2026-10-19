"""Plano de ação explicável por grupo (insumo do PGR). Sprint: S10 | Risco: R1/R2

Para cada grupo liberado (n ≥ 5) com risco moderado ou alto, explica:
- por que o grupo entrou no plano (índice, nível e as dimensões que mais puxam o índice);
- quanto cada dimensão contribui para o índice (decomposição aditiva exata do motor atual;
  com o modelo treinado, o mesmo campo passa a ser o valor SHAP — Art. 20 LGPD);
- o que o texto livre acrescenta (divergência do Revelador);
- até 3 ações, uma por dimensão acima do limiar moderado, com responsável, prazo e
indicador;
- o impacto financeiro estimado se o grupo cair um nível (método FIEMG), só nos planos
pagos.

Nada aqui identifica pessoas: tudo é agregado do grupo. As ações são sugestões e só viram
PGR depois da validação e assinatura da psicóloga com CRP.
"""

from __future__ import annotations

import logging
import unicodedata
from collections.abc import Callable
from typing import Any

from .capital_risco import NIVEL_ABAIXO, perda_evitavel_mensal
from .scoring import LIMIAR_ALTO, LIMIAR_DIVERGENCIA, LIMIAR_MODERADO

logger = logging.getLogger(__name__)

MAX_ACOES = 3
PRAZO_DIAS = {"alta": 30, "media": 90}

# (palavras-chave no nome da dimensão, responsável sugerido). A primeira que casar vale.
_RESPONSAVEIS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("assedio", "violencia", "interpessoa"), "Comitê de ética e RH"),
    (
        ("saude", "esgotamento", "bem-estar", "bem estar", "afastamento", "estresse"),
        "Psicóloga responsável (CRP) e SESMT",
    ),
    (("lideranca", "apoio"), "RH e lideranças do grupo"),
    (
        ("carga", "demanda", "ritmo", "plantao", "escala"),
        "Gestor da área e RH (dimensionamento)",
    ),
    (("autonomia", "controle"), "Gestor da área"),
    (("clareza", "papel", "previsibilidade", "metas"), "Gestor da área e RH"),
    (
        ("reconhecimento", "recompensa", "justica", "satisfacao"),
        "RH (remuneração e carreira)",
    ),
    (
        ("comunicacao", "mudanca", "inseguranca", "recursos"),
        "Diretoria e comunicação interna",
    ),
    (
        ("equilibrio", "conciliacao", "trabalho-vida"),
        "RH e gestores (política de jornada)",
    ),
)
REFERENCIA = (
    "NR-1 (Portaria MTE 1.419/2024): os riscos psicossociais entram no inventário do "
    "PGR e "
    "cada risco priorizado precisa de medida de prevenção com responsável e prazo."
)


def _sem_acento(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()


def responsavel_sugerido(dimensao: str) -> str:
    """Responsável sugerido pela dimensão. Sprint: S10 | Risco: None"""
    nome = _sem_acento(dimensao or "")
    for chaves, responsavel in _RESPONSAVEIS:
        if any(chave in nome for chave in chaves):
            return responsavel
    return "RH e SESMT"


def _fmt(valor: float) -> str:
    return f"{valor:.1f}".replace(".", ",")


def _int(valor: float) -> str:
    return f"{valor:.0f}"


def explicar_grupo(
    grupo: dict[str, Any],
    acao_do_bloco: Callable[[str], str],
    incluir_financeiro: bool = False,
) -> dict[str, Any] | None:
    """Monta o item do plano de ação de um grupo liberado, ou None se não precisa de ação.

    `grupo` traz nome, n_respostas, indice_likert, indice_texto, divergencia,
    nivel_risco e
    fatores (bloco, dimensao, indice, contribuicao). Sprint: S10 | Risco: R1/R2
    """
    nivel = grupo.get("nivel_risco")
    fatores = list(grupo.get("fatores") or [])
    if nivel not in ("alto", "moderado") or not fatores:
        return None
    if int(grupo.get("n_respostas") or 0) < 5:
        logger.error("grupo com n<5 chegou ao plano de ação; ignorado")
        return None

    indice = float(grupo.get("indice_likert") or 0.0)
    prioridade = "alta" if nivel == "alto" else "media"
    # ordena pelo quanto cada dimensão empurra o índice (contribuição), não só pela nota:
    # uma dimensão de peso maior (ex.: assédio, 1,4) pesa mais com nota parecida
    fatores.sort(
        key=lambda f: float(
            f.get("contribuicao")
            if f.get("contribuicao") is not None
            else f.get("indice") or 0
        ),
        reverse=True,
    )
    acima = [f for f in fatores if float(f.get("indice") or 0) >= LIMIAR_MODERADO][
        :MAX_ACOES
    ] or fatores[:1]

    principal = acima[0]
    contrib = principal.get("contribuicao")
    limiar = LIMIAR_ALTO if nivel == "alto" else LIMIAR_MODERADO
    partes = [
        f"O grupo tem índice {_fmt(indice)} de 100, nível {nivel} (a partir de "
        f"{_int(limiar)}).",
        f"A dimensão que mais empurra o índice para cima é {principal['dimensao']} "
        f"(nota {_fmt(float(principal['indice']))})"
        + (
            f": responde por +{_fmt(float(contrib))} dos {_fmt(indice - 50.0)} "
            "pontos que o grupo está "
            "acima do ponto neutro (50)."
            if contrib is not None and contrib > 0 and indice > 50
            else "."
        ),
    ]
    if len(acima) > 1:
        outras = ", ".join(
            f"{f['dimensao']} ({_fmt(float(f['indice']))})" for f in acima[1:]
        )
        partes.append(f"Também estão acima de {_int(LIMIAR_MODERADO)}: {outras}.")

    texto: dict[str, Any] | None = None
    divergencia = grupo.get("divergencia")
    if divergencia is not None and abs(float(divergencia)) >= LIMIAR_DIVERGENCIA:
        maior = float(divergencia) > 0
        texto = {
            "divergencia": float(divergencia),
            "indice_texto": grupo.get("indice_texto"),
            "leitura": (
                "Os comentários abertos mostram mais exposição do que as notas. Vale "
                "ouvir o grupo "
                "antes de fechar a ação: as notas sozinhas subestimam o problema."
                if maior
                else (
                    "As notas mostram mais exposição do que os comentários abertos. "
                    "Confirme com o grupo se o texto livre foi pouco usado antes de "
                    "concluir."
                )
            ),
        }
        partes.append(
            f"No texto livre o índice é {_fmt(float(grupo.get('indice_texto') or 0))}, "
            f"{'acima' if maior else 'abaixo'} da escala em "
            f"{_fmt(abs(float(divergencia)))} pontos."
        )

    acoes = [
        {
            "bloco": f["bloco"],
            "dimensao": f["dimensao"],
            "indice": f["indice"],
            "contribuicao": f.get("contribuicao"),
            "acao": acao_do_bloco(str(f["bloco"])),
            "responsavel": responsavel_sugerido(str(f["dimensao"])),
            "indicador": (
                f"{f['dimensao']} abaixo de {_int(LIMIAR_MODERADO)} no próximo ciclo "
                f"(hoje {_fmt(float(f['indice']))})."
            ),
        }
        for f in acima
    ]

    item: dict[str, Any] = {
        "ghe": grupo.get("nome"),
        "n_respostas": int(grupo.get("n_respostas") or 0),
        "indice": indice,
        "nivel": nivel,
        "prioridade": prioridade,
        "prazo_dias": PRAZO_DIAS[prioridade],
        "dimensao": principal["dimensao"],
        "acao_sugerida": acoes[0]["acao"],
        "por_que": " ".join(partes),
        "contribuicoes": [
            {
                "dimensao": f["dimensao"],
                "indice": f["indice"],
                "contribuicao": f.get("contribuicao"),
            }
            for f in fatores
        ],
        "texto_livre": texto,
        "acoes": acoes,
        "meta": (
            f"Levar o grupo de {nivel} para {NIVEL_ABAIXO.get(nivel, 'baixo')} "
            "no próximo ciclo."
        ),
        "referencia": REFERENCIA,
        "status": "aguardando validação CRP",
    }
    if incluir_financeiro:
        item["perda_evitavel_mensal"] = perda_evitavel_mensal(item["n_respostas"], nivel)
    return item
