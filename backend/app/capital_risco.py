"""Estimativa ilustrativa de capital em risco por setor.

Não é laudo financeiro nem modelo treinado. Usado apenas em planos
professional/enterprise para apoiar conversa gerencial.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

VERSAO_ESTIMATIVA = "capital-ilustrativo-v1"

PLANOS_COM_CAPITAL = frozenset({"professional", "enterprise"})

DISCLAIMER = (
    "Estimativa ilustrativa com tabelas internas da Psyra. Não constitui laudo "
    "financeiro, contábil ou pericial. Não substitui análise de folha, PGR ou "
    "parecer CRP. Use apenas como ordem de grandeza para decisão gerencial."
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


def plano_permite_capital(plano: str | None) -> bool:
    return (plano or "").strip().lower() in PLANOS_COM_CAPITAL


def _normalizar_chave(valor: str | None, padrao: str) -> str:
    texto = (valor or "").strip().lower()
    return texto if texto else padrao


def salario_mensal_estimado(atuacao: str, porte: str, setor: str | None) -> float:
    base = _SALARIO_BASE_ATUACAO.get(
        _normalizar_chave(atuacao, "servicos"), _SALARIO_BASE_ATUACAO["servicos"]
    )
    mult_porte = _MULT_PORTE.get(
        _normalizar_chave(porte, "media"), _MULT_PORTE["media"]
    )
    setor_chave = _normalizar_chave(setor, "geral")
    mult_setor = 1.0
    for chave, fator in _MULT_SETOR.items():
        if chave in setor_chave:
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
        salario = salario_mensal_estimado(atuacao, porte, setor)
        fator = _FATOR_RISCO[nivel]
        perda_mensal = round(afetados * salario * fator, 2)
        perda_anual = round(perda_mensal * 12, 2)
        detalhe = {
            "ghe_codigo": item.get("codigo"),
            "ghe_nome": item.get("nome"),
            "setor": setor,
            "n_respostas": int(item.get("n_respostas") or 0),
            "efetivo": int(item.get("efetivo") or 0),
            "afetados": afetados,
            "nivel_risco": nivel,
            "salario_mensal_ref": salario,
            "fator_risco": fator,
            "perda_mensal": perda_mensal,
            "perda_anual": perda_anual,
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
    }
