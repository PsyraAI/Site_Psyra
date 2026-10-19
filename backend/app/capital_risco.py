"""Estimativa de capital em risco por setor, pelo método da FIEMG. Sprint: S10 | Risco:
R1.

Perda mensal do grupo = pessoas × parcela afetada pelo nível de risco × 14% de
produtividade perdida × R$ 4.997,59 de produtividade mensal por ocupado.
Fonte: FIEMG, "Os Custos Econômicos dos Transtornos Mentais" (dados de 2019):
20% dos ocupados com algum problema de saúde mental (RSPH), 51 dias de vida
saudável perdidos por ano (DALY ÷ prevalência = 0,14, GBD 2019) e produtividade
de R$ 59.971,10 por ocupado ao ano (PIB ÷ ocupações). O ajuste da parcela pelo
nível do grupo usa os multiplicadores de cenário da própria FIEMG (0,75 · 1 ·
1,25) e é adaptação da Psyra. Não é laudo financeiro nem modelo treinado.
"""

from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from typing import Any

VERSAO_ESTIMATIVA = "capital-fiemg-v2"
PRODUTIVIDADE_MENSAL = round(59971.10 / 12, 2)  # R$ 4.997,59 por ocupado (FIEMG, 2019)
PERDA_PRODUTIVIDADE = 0.14  # 51 dias de vida saudável por ano (FIEMG, GBD 2019)
# 20% afetados (RSPH via FIEMG) × multiplicadores de cenário 0,75 / 1 / 1,25
_PARCELA_AFETADA: dict[str, float] = {
    "baixo": 0.15,
    "moderado": 0.20,
    "alto": 0.25,
    "critico": 0.25,
}
METODO = (
    "Método FIEMG: pessoas × parcela afetada (15%, 20% ou 25% pelo nível) × 14% "
    "de produtividade perdida × R$ 4.997,59 de produtividade mensal (dados de 2019)"
)

PLANOS_COM_CAPITAL = frozenset({"professional", "enterprise"})

DISCLAIMER = (
    "Ordem de grandeza pelo método da FIEMG (Os Custos Econômicos dos Transtornos "
    "Mentais, dados de 2019, sem correção pela inflação). Não constitui laudo "
    "financeiro, contábil ou pericial e não substitui o PGR nem o parecer da "
    "psicóloga com CRP."
)

# Salário-base mensal (BRL) por atuação econômica.
_SALARIO_BASE_ATUACAO: dict[str, float] = {
    "saude": 4200.0,
    "industria": 3800.0,
    "servicos": 3200.0,
    "comercio": 2800.0,
    "tecnologia": 6500.0,
    "outro": 3000.0,
}

# Multiplicador por porte da empresa.
_MULT_PORTE: dict[str, float] = {
    "micro": 0.85,
    "pequena": 0.95,
    "media": 1.10,
    "grande": 1.35,
}

# Ajuste leve por setor interno (GHE).
_MULT_SETOR: dict[str, float] = {
    "ti": 1.25,
    "tecnologia": 1.25,
    "engenharia": 1.20,
    "diretoria": 1.80,
    "rh": 1.05,
    "operacional": 0.90,
    "producao": 0.90,
    "vendas": 1.00,
    "atendimento": 0.95,
    "enfermagem": 1.10,
    "clinica": 1.15,
}

_FATOR_RISCO: dict[str, float] = {
    "baixo": 0.02,
    "moderado": 0.06,
    "alto": 0.12,
    "critico": 0.20,
}


def _sem_acento(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()


def perda_mensal_fiemg(pessoas: int, nivel: str) -> float:
    """Perda mensal estimada de um grupo (R$). Sprint: S10 | Risco: R1"""
    parcela = _PARCELA_AFETADA.get(nivel, _PARCELA_AFETADA["moderado"])
    return round(pessoas * parcela * PERDA_PRODUTIVIDADE * PRODUTIVIDADE_MENSAL, 2)


# Cenário "com plano de ação": cada grupo cai um nível depois que as ações começam a
# valer.
NIVEL_ABAIXO: dict[str, str] = {
    "critico": "alto",
    "alto": "moderado",
    "moderado": "baixo",
    "baixo": "baixo",
}
MESES_PROJECAO = 12
INICIO_EFEITO, FIM_EFEITO = (
    2,
    6,
)  # efeito gradual: zero até o 2º mês, completo a partir do 6º
PREMISSAS_PROJECAO = (
    "Sem ação: a perda mensal de hoje se repete por 12 meses.",
    "Com o plano de ação: cada grupo cai um nível de risco (alto → moderado, moderado → "
    "baixo); "
    "o efeito começa no 3º mês e fica completo no 6º, porque mudanças de gestão levam "
    "tempo.",
    "É uma hipótese de planejamento para priorizar ações, não uma promessa de resultado: "
    "o efeito real é medido no ciclo seguinte do questionário.",
)


def perda_evitavel_mensal(pessoas: int, nivel: str) -> float:
    """Quanto a perda mensal cai se o grupo descer um nível de risco. Sprint: S10 |
    Risco: R1"""
    abaixo = NIVEL_ABAIXO.get(nivel, "baixo")
    return round(
        perda_mensal_fiemg(pessoas, nivel) - perda_mensal_fiemg(pessoas, abaixo), 2
    )


def _efeito_no_mes(mes: int) -> float:
    if mes <= INICIO_EFEITO:
        return 0.0
    if mes >= FIM_EFEITO:
        return 1.0
    return (mes - INICIO_EFEITO) / (FIM_EFEITO - INICIO_EFEITO)


def projetar_perda(
    detalhes_ghe: list[dict[str, Any]], meses: int = MESES_PROJECAO
) -> dict[str, Any]:
    """Perda acumulada em 12 meses sem ação e com o plano de ação. Sprint: S10 | Risco: R1

    Usa só os grupos liberados (n ≥ 5) que já entraram em `detalhes_ghe`.
    """
    atual = round(sum(d["perda_mensal"] for d in detalhes_ghe), 2)
    melhor = round(
        sum(
            perda_mensal_fiemg(d["afetados"], NIVEL_ABAIXO.get(d["nivel_risco"], "baixo"))
            for d in detalhes_ghe
        ),
        2,
    )
    linhas: list[dict[str, Any]] = []
    acum_sem = acum_com = 0.0
    for mes in range(1, meses + 1):
        com = atual - _efeito_no_mes(mes) * (atual - melhor)
        acum_sem += atual
        acum_com += com
        linhas.append(
            {
                "mes": mes,
                "sem_acao_mensal": round(atual, 2),
                "com_plano_mensal": round(com, 2),
                "sem_acao_acumulado": round(acum_sem, 2),
                "com_plano_acumulado": round(acum_com, 2),
            }
        )
    return {
        "meses": linhas,
        "perda_mensal_atual": atual,
        "perda_mensal_com_plano": melhor,
        "economia_12_meses": round(acum_sem - acum_com, 2),
        "premissas": list(PREMISSAS_PROJECAO),
    }


def plano_permite_capital(plano: str | None) -> bool:
    return (plano or "").strip().lower() in PLANOS_COM_CAPITAL


def _normalizar_chave(valor: str | None, padrao: str) -> str:
    texto = (valor or "").strip().lower()
    return texto if texto else padrao


def salario_mensal_estimado(atuacao: str, porte: str, setor: str | None) -> float:
    base = _SALARIO_BASE_ATUACAO.get(
        _normalizar_chave(atuacao, "servicos"), _SALARIO_BASE_ATUACAO["servicos"]
    )
    mult_porte = _MULT_PORTE.get(_normalizar_chave(porte, "media"), _MULT_PORTE["media"])
    # Compara palavras inteiras: antes, "ti" casava dentro de "Administrativo",
    # "Marketing" e "Logística" e dava o ajuste de TI por engano.
    palavras = set(re.findall(r"[a-z]+", _sem_acento(_normalizar_chave(setor, "geral"))))
    mult_setor = 1.0
    for chave, fator in _MULT_SETOR.items():
        if chave in palavras:
            mult_setor = fator
            break
    return round(base * mult_porte * mult_setor, 2)


def afetados_estimados(efetivo: int | None, n_respostas: int) -> int:
    efetivo_n = int(efetivo or 0)
    respostas = max(int(n_respostas or 0), 0)
    if efetivo_n <= 0:
        return respostas
    return min(efetivo_n, respostas)


def calcular_capital_risco(
    ghes: list[dict[str, Any]],
    porte: str = "media",
    atuacao: str = "servicos",
) -> dict[str, Any]:
    """Agrega perda estimada por setor a partir de GHEs não mascarados."""
    por_setor: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "setor": "",
            "ghes": 0,
            "afetados": 0,
            "perda_mensal": 0.0,
            "perda_anual": 0.0,
            "detalhes": [],
        }
    )
    detalhes_ghe: list[dict[str, Any]] = []
    omitidos_mascarados = 0

    for item in ghes:
        if item.get("mascarado"):
            omitidos_mascarados += 1
            continue
        nivel = str(item.get("nivel_risco") or "moderado").lower()
        if nivel not in _FATOR_RISCO:
            nivel = "moderado"
        setor = (item.get("setor") or "").strip() or "Geral"
        afetados = afetados_estimados(item.get("efetivo"), item.get("n_respostas", 0))
        fator = round(_PARCELA_AFETADA[nivel] * PERDA_PRODUTIVIDADE, 4)
        perda_mensal = perda_mensal_fiemg(afetados, nivel)
        perda_anual = round(perda_mensal * 12, 2)
        detalhe = {
            "ghe_codigo": item.get("codigo"),
            "ghe_nome": item.get("nome"),
            "setor": setor,
            "n_respostas": int(item.get("n_respostas") or 0),
            "efetivo": int(item.get("efetivo") or 0),
            "afetados": afetados,
            "nivel_risco": nivel,
            "produtividade_mensal_ref": PRODUTIVIDADE_MENSAL,
            "parcela_afetada": _PARCELA_AFETADA[nivel],
            "fator_risco": fator,
            "perda_mensal": perda_mensal,
            "perda_anual": perda_anual,
            "perda_evitavel_mensal": perda_evitavel_mensal(afetados, nivel),
        }
        detalhes_ghe.append(detalhe)
        bucket = por_setor[setor]
        bucket["setor"] = setor
        bucket["ghes"] += 1
        bucket["afetados"] += afetados
        bucket["perda_mensal"] = round(bucket["perda_mensal"] + perda_mensal, 2)
        bucket["perda_anual"] = round(bucket["perda_anual"] + perda_anual, 2)
        bucket["detalhes"].append(detalhe)

    setores = sorted(por_setor.values(), key=lambda s: s["perda_mensal"], reverse=True)
    total_mensal = round(sum(s["perda_mensal"] for s in setores), 2)
    total_anual = round(sum(s["perda_anual"] for s in setores), 2)
    total_afetados = sum(s["afetados"] for s in setores)

    return {
        "versao_estimativa": VERSAO_ESTIMATIVA,
        "metodo": METODO,
        "disclaimer": DISCLAIMER,
        "porte": _normalizar_chave(porte, "media"),
        "atuacao": _normalizar_chave(atuacao, "servicos"),
        "ghes_considerados": len(detalhes_ghe),
        "ghes_omitidos_mascarados": omitidos_mascarados,
        "total_afetados": total_afetados,
        "perda_mensal_total": total_mensal,
        "perda_anual_total": total_anual,
        "setores": setores,
        "ghes": detalhes_ghe,
        "projecao": projetar_perda(detalhes_ghe),
    }
