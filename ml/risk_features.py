"""Features seguras para regressão do índice sintético de risco."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ml.risk_spec import (
    ItemRisco,
    calcular_indice_risco,
    carregar_gabarito_xlsx,
    orientar_itens_risco,
)

TARGET = "indice_risco_verdadeiro"
FORBIDDEN_COLUMNS = frozenset(
    {
        "id_sintetico",
        "cenario_id",
        "ghe_codigo",
        TARGET,
        "theta_latente",
        "aquiescencia",
        "itens_em_branco",
    }
)


def construir_features_risco(
    respostas: pd.DataFrame, itens: list[ItemRisco]
) -> tuple[pd.DataFrame, dict[str, str]]:
    """Produz itens e médias de bloco, sempre na direção de maior risco."""
    orientados = orientar_itens_risco(respostas, itens)
    matriz = orientados.rename(columns=lambda codigo: f"item_{codigo}_risco")
    grupos = {f"item_{item.codigo}_risco": item.bloco for item in itens}

    por_bloco: dict[str, list[str]] = {}
    for item in itens:
        por_bloco.setdefault(item.bloco, []).append(f"item_{item.codigo}_risco")
    for bloco, colunas in por_bloco.items():
        nome = f"bloco_{bloco}_media_risco"
        matriz[nome] = matriz[colunas].mean(axis=1)
        grupos[nome] = bloco

    if FORBIDDEN_COLUMNS.intersection(matriz.columns):
        raise AssertionError("feature proibida incluída")
    return matriz, grupos


def carregar_base_risco(
    respostas_csv: Path,
    gabarito_csv: Path,
    xlsx: Path,
) -> tuple[
    pd.DataFrame,
    pd.Series,
    pd.Series,
    pd.Series,
    dict[str, str],
    dict[str, Any],
]:
    """Une respostas e rótulos, verificando a fórmula antes do treino."""
    respostas = pd.read_csv(respostas_csv)
    gabarito = pd.read_csv(gabarito_csv)
    if respostas["id_sintetico"].duplicated().any():
        raise ValueError("IDs duplicados nas respostas")
    if gabarito["id_sintetico"].duplicated().any():
        raise ValueError("IDs duplicados no gabarito")

    dados = respostas.merge(
        gabarito[["id_sintetico", "cenario_id", TARGET]],
        on="id_sintetico",
        validate="one_to_one",
        how="inner",
        suffixes=("", "_gabarito"),
    )
    if len(dados) != len(respostas) or len(dados) != len(gabarito):
        raise ValueError("respostas e gabarito não possuem correspondência integral")
    if not (
        dados["cenario_id"].astype(str) == dados["cenario_id_gabarito"].astype(str)
    ).all():
        raise ValueError("cenário divergente entre respostas e gabarito")

    itens = carregar_gabarito_xlsx(xlsx)
    formula = calcular_indice_risco(dados, itens)
    alvo = pd.to_numeric(dados[TARGET], errors="raise")
    erro_formula = float(np.max(np.abs(formula.to_numpy() - alvo.to_numpy())))
    if erro_formula > 1e-6:
        raise ValueError(f"alvo diverge da fórmula do XLSX: erro máximo {erro_formula}")

    matriz, grupos = construir_features_risco(dados, itens)
    metadados = {
        "n_amostras": len(dados),
        "n_features": matriz.shape[1],
        "n_cenarios": dados["cenario_id"].nunique(),
        "target_min": float(alvo.min()),
        "target_mean": float(alvo.mean()),
        "target_max": float(alvo.max()),
        "formula_max_abs_error": erro_formula,
        "n_missing_features": int(matriz.isna().sum().sum()),
    }
    return (
        matriz,
        alvo,
        formula,
        dados["cenario_id"],
        grupos,
        metadados,
    )
