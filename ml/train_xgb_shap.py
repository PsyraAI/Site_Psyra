"""Treina XGBoost + SHAP para dissimulação em dados sintéticos.

Este experimento é offline e não ativa o modelo no backend da Psyra.
"""

# O bootstrap permite executar este arquivo diretamente no PowerShell.
# ruff: noqa: E402

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

PROJETO = Path(__file__).resolve().parents[1]
BACKEND = PROJETO / "backend"
for caminho in (PROJETO, BACKEND):
    if str(caminho) not in sys.path:
        sys.path.insert(0, str(caminho))

import numpy as np
import pandas as pd
import shap
from sklearn.metrics import (
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from ml.features import carregar_dados_treino

SEMENTE = 20260806
MODELO_ID = "xgb_dissimulacao_sintetico_v1"


def _hash_arquivo(caminho: Path) -> str:
    digest = hashlib.sha256()
    with caminho.open("rb") as arquivo:
        for bloco in iter(lambda: arquivo.read(1024 * 1024), b""):
            digest.update(bloco)
    return digest.hexdigest()


def _hash_features(colunas: list[str]) -> str:
    conteudo = json.dumps(colunas, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(conteudo.encode("utf-8")).hexdigest()


def _serializavel(valor: Any) -> Any:
    if isinstance(valor, dict):
        return {str(chave): _serializavel(item) for chave, item in valor.items()}
    if isinstance(valor, list | tuple):
        return [_serializavel(item) for item in valor]
    if isinstance(valor, np.integer):
        return int(valor)
    if isinstance(valor, float | np.floating):
        return float(valor) if math.isfinite(float(valor)) else None
    if isinstance(valor, np.ndarray):
        return valor.tolist()
    return valor


def _melhor_limiar(y: pd.Series, probabilidades: np.ndarray) -> float:
    precisao, recall, limiares = precision_recall_curve(y, probabilidades)
    if not len(limiares):
        return 0.5
    f1 = 2 * precisao[:-1] * recall[:-1] / np.maximum(precisao[:-1] + recall[:-1], 1e-12)
    return float(limiares[int(np.nanargmax(f1))])


def _metricas(y: pd.Series, probabilidades: np.ndarray, limiar: float) -> dict[str, Any]:
    predito = (probabilidades >= limiar).astype(int)
    matriz = confusion_matrix(y, predito, labels=[0, 1])
    return {
        "pr_auc": average_precision_score(y, probabilidades),
        "roc_auc": roc_auc_score(y, probabilidades),
        "precision": precision_score(y, predito, zero_division=0),
        "recall": recall_score(y, predito, zero_division=0),
        "f1": f1_score(y, predito, zero_division=0),
        "balanced_accuracy": balanced_accuracy_score(y, predito),
        "threshold": limiar,
        "confusion_matrix": {
            "labels": [0, 1],
            "values": matriz.tolist(),
            "tn": int(matriz[0, 0]),
            "fp": int(matriz[0, 1]),
            "fn": int(matriz[1, 0]),
            "tp": int(matriz[1, 1]),
        },
    }


def _candidatos(peso_positivo: float) -> list[dict[str, Any]]:
    base = {
        "n_estimators": 700,
        "learning_rate": 0.04,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "min_child_weight": 4,
        "reg_lambda": 2.0,
        "objective": "binary:logistic",
        "eval_metric": "aucpr",
        "tree_method": "hist",
        "random_state": SEMENTE,
        "n_jobs": -1,
        "scale_pos_weight": peso_positivo,
        "early_stopping_rounds": 40,
    }
    return [
        {**base, "max_depth": 3, "gamma": 0.0},
        {**base, "max_depth": 4, "gamma": 0.0},
        {**base, "max_depth": 3, "gamma": 0.2},
        {**base, "max_depth": 5, "gamma": 0.2},
    ]


def _treinar_modelo(
    x_treino: pd.DataFrame,
    y_treino: pd.Series,
    x_validacao: pd.DataFrame,
    y_validacao: pd.Series,
) -> tuple[XGBClassifier, list[dict[str, Any]]]:
    negativos = int((y_treino == 0).sum())
    positivos = int((y_treino == 1).sum())
    peso = negativos / positivos
    resultados: list[dict[str, Any]] = []
    melhor_modelo: XGBClassifier | None = None
    melhor_pr_auc = -1.0

    for indice, parametros in enumerate(_candidatos(peso), start=1):
        modelo = XGBClassifier(**parametros)
        modelo.fit(
            x_treino,
            y_treino,
            eval_set=[(x_validacao, y_validacao)],
            verbose=False,
        )
        probabilidades = modelo.predict_proba(x_validacao)[:, 1]
        pr_auc = float(average_precision_score(y_validacao, probabilidades))
        resultados.append(
            {
                "candidate": indice,
                "validation_pr_auc": pr_auc,
                "best_iteration": int(modelo.best_iteration),
                "parameters": parametros,
            }
        )
        if pr_auc > melhor_pr_auc:
            melhor_pr_auc = pr_auc
            melhor_modelo = modelo

    if melhor_modelo is None:
        raise RuntimeError("nenhum candidato XGBoost foi treinado")
    return melhor_modelo, resultados


def _calcular_shap(
    modelo: XGBClassifier,
    x_teste: pd.DataFrame,
    grupos: dict[str, str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], float]:
    explicador = shap.TreeExplainer(modelo)
    valores = np.asarray(explicador(x_teste).values)
    if valores.ndim == 3:
        valores = valores[:, :, 1]

    por_feature = []
    for indice, feature in enumerate(x_teste.columns):
        por_feature.append(
            {
                "feature": feature,
                "group": grupos[feature],
                "mean_abs_shap": float(np.abs(valores[:, indice]).mean()),
                "mean_signed_shap": float(valores[:, indice].mean()),
            }
        )
    por_feature.sort(key=lambda item: item["mean_abs_shap"], reverse=True)

    acumulado: dict[str, float] = {}
    for item in por_feature:
        acumulado[item["group"]] = acumulado.get(item["group"], 0.0) + float(
            item["mean_abs_shap"]
        )
    total = sum(acumulado.values()) or 1.0
    por_grupo = [
        {
            "group": grupo,
            "mean_abs_shap_sum": valor,
            "importance_percent": valor / total * 100.0,
        }
        for grupo, valor in acumulado.items()
    ]
    por_grupo.sort(key=lambda item: item["mean_abs_shap_sum"], reverse=True)
    valor_base = np.asarray(explicador.expected_value).reshape(-1)
    return por_feature, por_grupo, float(valor_base[-1])


def _salvar_model_card(
    caminho: Path,
    metricas: dict[str, Any],
    metadados: dict[str, Any],
    top_grupos: list[dict[str, Any]],
) -> None:
    grupos = "\n".join(
        f"- {item['group']}: {item['importance_percent']:.1f}% da importância SHAP"
        for item in top_grupos[:5]
    )
    caminho.write_text(
        f"""# Model Card — {MODELO_ID}

## Finalidade

Experimento offline de classificação binária de `dissimulador`. O modelo foi
treinado exclusivamente com dados sintéticos para validar o pipeline técnico.
Ele não possui validade clínica, não foi aprovado por CRP/CEP e não está ativo
no backend ou no painel da Psyra.

## Dados

- Amostras: {metadados['n_amostras']}
- Positivos: {metadados['n_positivos']}
- Prevalência: {metadados['prevalencia']:.4f}
- Features: {metadados['n_features']}
- Instrumento: {metadados['instrumento_codigo']} v{metadados['instrumento_versao']}

## Avaliação no teste intocado

- PR-AUC: {metricas['pr_auc']:.4f}
- ROC-AUC: {metricas['roc_auc']:.4f}
- Precisão: {metricas['precision']:.4f}
- Recall: {metricas['recall']:.4f}
- F1: {metricas['f1']:.4f}
- Balanced accuracy: {metricas['balanced_accuracy']:.4f}
- Limiar escolhido apenas na validação: {metricas['threshold']:.4f}

## Principais grupos segundo TreeSHAP

{grupos}

## Limitações e uso proibido

- As métricas medem recuperação do mecanismo gerador sintético, não desempenho
  em trabalhadores reais.
- Não usar para decisão individual, diagnóstico, laudo, PGR ou ação trabalhista.
- Não ativar no produto sem dados reais autorizados, validação externa, revisão
  da psicóloga responsável e aprovação ética aplicável.
- SHAP descreve o comportamento do modelo; não estabelece causalidade.
""",
        encoding="utf-8",
    )


def executar(args: argparse.Namespace) -> Path:
    """Executa treino, avaliação, SHAP e persistência dos artefatos."""
    x, y, grupos, metadados = carregar_dados_treino(
        args.respostas, args.gabarito, args.instrumento
    )
    x_treino, x_temporario, y_treino, y_temporario = train_test_split(
        x,
        y,
        test_size=0.40,
        random_state=SEMENTE,
        stratify=y,
    )
    x_validacao, x_teste, y_validacao, y_teste = train_test_split(
        x_temporario,
        y_temporario,
        test_size=0.50,
        random_state=SEMENTE,
        stratify=y_temporario,
    )

    modelo, busca = _treinar_modelo(x_treino, y_treino, x_validacao, y_validacao)
    probabilidades_validacao = modelo.predict_proba(x_validacao)[:, 1]
    limiar = _melhor_limiar(y_validacao, probabilidades_validacao)
    probabilidades_teste = modelo.predict_proba(x_teste)[:, 1]
    metricas = _metricas(y_teste, probabilidades_teste, limiar)
    metricas["baseline_pr_auc"] = float(y_teste.mean())

    shap_features, shap_grupos, valor_base = _calcular_shap(modelo, x_teste, grupos)
    saida = args.saida
    saida.mkdir(parents=True, exist_ok=True)
    modelo.save_model(saida / "model.json")

    manifesto = {
        "model_id": MODELO_ID,
        "created_at": datetime.now(UTC).isoformat(),
        "status": "experimental_offline_synthetic_only",
        "target": "dissimulador",
        "random_seed": SEMENTE,
        "instrument": {
            "code": metadados["instrumento_codigo"],
            "version": metadados["instrumento_versao"],
            "sha256": _hash_arquivo(args.instrumento),
        },
        "datasets": {
            "responses_sha256": _hash_arquivo(args.respostas),
            "labels_sha256": _hash_arquivo(args.gabarito),
        },
        "features": list(x.columns),
        "feature_groups": grupos,
        "feature_schema_sha256": _hash_features(list(x.columns)),
        "split": {
            "train": len(x_treino),
            "validation": len(x_validacao),
            "test": len(x_teste),
        },
        "artifact": "model.json",
        "runtime_activation": False,
    }
    relatorio = {
        "model_id": MODELO_ID,
        "data": metadados,
        "test_metrics": metricas,
        "validation_search": busca,
        "selected_parameters": modelo.get_params(),
        "shap_expected_value_log_odds": valor_base,
        "warning": (
            "Resultado sintético demonstrativo; não representa validade clínica "
            "nem desempenho em dados reais."
        ),
    }
    (saida / "manifest.json").write_text(
        json.dumps(_serializavel(manifesto), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (saida / "metrics.json").write_text(
        json.dumps(_serializavel(relatorio), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (saida / "shap_importance.json").write_text(
        json.dumps(
            _serializavel({"features": shap_features, "groups": shap_grupos}),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    _salvar_model_card(saida / "MODEL_CARD.md", metricas, metadados, shap_grupos)
    return saida


def _argumentos() -> argparse.Namespace:
    raiz_dados = PROJETO.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--respostas",
        type=Path,
        default=raiz_dados / "S6_DADOS_base_sintetica_respostas_v1.csv",
    )
    parser.add_argument(
        "--gabarito",
        type=Path,
        default=raiz_dados / "S6_DADOS_base_sintetica_gabarito_v1.csv",
    )
    parser.add_argument(
        "--instrumento",
        type=Path,
        default=BACKEND / "data" / "instrumento_psyra_form_v1.json",
    )
    parser.add_argument(
        "--saida",
        type=Path,
        default=BACKEND / "models" / "experimental" / MODELO_ID,
    )
    return parser.parse_args()


if __name__ == "__main__":
    diretorio = executar(_argumentos())
    print(f"Treino concluído. Artefatos: {diretorio}")
