"""Engenharia de features offline para o experimento XGBoost demonstrativo."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.scoring import calcular_sinal_texto

TARGET = "dissimulador"
FORBIDDEN_COLUMNS = frozenset(
    {
        "id_sintetico",
        "ghe_codigo",
        "ghe_nome",
        "setor",
        "theta_verdadeiro",
        "nivel_verdadeiro",
        "dissimulador",
        "aquiescencia",
        "itens_em_branco",
        "texto_com_pii",
        "escreveu_texto",
    }
)


def carregar_instrumento(caminho: Path) -> dict[str, Any]:
    """Carrega a declaração de itens e polaridades usada no treinamento."""
    with caminho.open(encoding="utf-8") as arquivo:
        return json.load(arquivo)


def _especificacao_itens(
    instrumento: dict[str, Any],
) -> list[tuple[str, str, bool]]:
    itens: list[tuple[str, str, bool]] = []
    for bloco in instrumento["blocos"]:
        codigo = str(bloco["codigo"])
        reverso_bloco = bool(bloco.get("reverso", False))
        for indice, item in enumerate(bloco["itens"], start=1):
            coluna = f"{codigo}{indice}"
            reverso = (
                bool(item.get("reverso", reverso_bloco))
                if isinstance(item, dict)
                else reverso_bloco
            )
            itens.append((coluna, codigo, reverso))
    return itens


def construir_features(
    respostas: pd.DataFrame,
    instrumento: dict[str, Any],
) -> tuple[pd.DataFrame, dict[str, str]]:
    """Cria 46 itens orientados a risco, 10 blocos e dois sinais de texto."""
    especificacao = _especificacao_itens(instrumento)
    ausentes = sorted({coluna for coluna, _, _ in especificacao} - set(respostas))
    if ausentes:
        raise ValueError(f"itens Likert ausentes no CSV: {', '.join(ausentes)}")

    features: dict[str, pd.Series] = {}
    grupos: dict[str, str] = {}
    itens_por_bloco: dict[str, list[str]] = {}

    for coluna, bloco, reverso in especificacao:
        valor = pd.to_numeric(respostas[coluna], errors="coerce")
        nome = f"item_{coluna}_risco"
        features[nome] = 6.0 - valor if reverso else valor
        grupos[nome] = bloco
        itens_por_bloco.setdefault(bloco, []).append(nome)

    quadro = pd.DataFrame(features, index=respostas.index, dtype=float)
    pesos: dict[str, float] = {}
    for bloco in instrumento["blocos"]:
        codigo = str(bloco["codigo"])
        nome = f"bloco_{codigo}_media_risco"
        quadro[nome] = quadro[itens_por_bloco[codigo]].mean(axis=1)
        grupos[nome] = codigo
        pesos[codigo] = float(bloco.get("peso", 1.0))

    numerador = sum(
        ((quadro[f"bloco_{codigo}_media_risco"] - 1.0) / 4.0 * 100.0) * peso
        for codigo, peso in pesos.items()
    )
    denominador = sum(pesos.values())
    indice_likert = numerador / denominador

    textos = respostas.get("texto_livre", pd.Series(index=respostas.index, dtype=object))
    quadro["texto_sinal_risco"] = textos.apply(
        lambda texto: calcular_sinal_texto(texto) if isinstance(texto, str) else None
    )
    quadro["divergencia_texto_likert"] = quadro["texto_sinal_risco"] - indice_likert
    grupos["texto_sinal_risco"] = "TEXTO"
    grupos["divergencia_texto_likert"] = "DIVERGENCIA"

    if FORBIDDEN_COLUMNS.intersection(quadro.columns):
        raise AssertionError("feature proibida incluída no modelo")
    return quadro, grupos


def carregar_dados_treino(
    respostas_csv: Path,
    gabarito_csv: Path,
    instrumento_json: Path,
) -> tuple[pd.DataFrame, pd.Series, dict[str, str], dict[str, Any]]:
    """Une os CSVs por ID e devolve matriz, alvo e metadados auditáveis."""
    respostas = pd.read_csv(respostas_csv)
    gabarito = pd.read_csv(gabarito_csv)
    if respostas["id_sintetico"].duplicated().any():
        raise ValueError("id_sintetico duplicado nas respostas")
    if gabarito["id_sintetico"].duplicated().any():
        raise ValueError("id_sintetico duplicado no gabarito")

    colunas_gabarito = ["id_sintetico", "ghe_codigo", TARGET]
    dados = respostas.merge(
        gabarito[colunas_gabarito],
        on="id_sintetico",
        how="inner",
        validate="one_to_one",
        suffixes=("", "_gabarito"),
    )
    if len(dados) != len(respostas) or len(dados) != len(gabarito):
        raise ValueError("respostas e gabarito não possuem correspondência integral")
    if not (
        dados["ghe_codigo"].astype(str) == dados["ghe_codigo_gabarito"].astype(str)
    ).all():
        raise ValueError("GHE divergente entre respostas e gabarito")

    instrumento = carregar_instrumento(instrumento_json)
    matriz, grupos = construir_features(dados, instrumento)
    alvo = pd.to_numeric(dados[TARGET], errors="raise").astype(int)
    if set(alvo.unique()) != {0, 1}:
        raise ValueError("dissimulador deve ser um alvo binário 0/1")

    metadados = {
        "n_amostras": int(len(dados)),
        "n_positivos": int(alvo.sum()),
        "prevalencia": float(alvo.mean()),
        "instrumento_codigo": instrumento["codigo"],
        "instrumento_versao": instrumento["versao"],
        "n_features": int(matriz.shape[1]),
        "n_ausentes": int(np.isnan(matriz.to_numpy()).sum()),
    }
    return matriz, alvo, grupos, metadados
