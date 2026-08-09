"""Treina XGBoost regressivo para aproximar o índice de risco do XLSX."""

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
if str(PROJETO) not in sys.path:
    sys.path.insert(0, str(PROJETO))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import shap  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from xgboost import XGBRegressor  # noqa: E402

from ml.risk_features import carregar_base_risco  # noqa: E402

SEMENTE = 20260806
MODELO_ID = "xgb_risco_questionario_sintetico_v1"
METAS = {"r2_min": 0.98, "mae_max": 2.5, "spearman_min": 0.98}


def _sha256(caminho: Path) -> str:
    digest = hashlib.sha256()
    with caminho.open("rb") as arquivo:
        for bloco in iter(lambda: arquivo.read(1024 * 1024), b""):
            digest.update(bloco)
    return digest.hexdigest()


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


def _dividir_cenarios(
    cenarios: pd.Series,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict[str, list[str]]]:
    """Reserva 16/4/4 cenários sem consultar o alvo."""
    unicos = np.array(sorted(cenarios.astype(str).unique()))
    if len(unicos) != 24:
        raise ValueError(f"esperados 24 cenários; encontrados {len(unicos)}")
    rng = np.random.default_rng(SEMENTE)
    rng.shuffle(unicos)
    nomes = {
        "train": sorted(unicos[:16].tolist()),
        "validation": sorted(unicos[16:20].tolist()),
        "test": sorted(unicos[20:].tolist()),
    }
    treino = cenarios.astype(str).isin(nomes["train"]).to_numpy()
    validacao = cenarios.astype(str).isin(nomes["validation"]).to_numpy()
    teste = cenarios.astype(str).isin(nomes["test"]).to_numpy()
    if np.any(treino & validacao) or np.any(treino & teste) or np.any(validacao & teste):
        raise AssertionError("cenário presente em mais de um split")
    return treino, validacao, teste, nomes


def _candidatos(n_features: int) -> list[dict[str, Any]]:
    base = {
        "n_estimators": 1400,
        "learning_rate": 0.035,
        "subsample": 0.9,
        "colsample_bytree": 0.9,
        "reg_lambda": 2.0,
        "objective": "reg:squarederror",
        "eval_metric": "rmse",
        "tree_method": "hist",
        "random_state": SEMENTE,
        "n_jobs": -1,
        "early_stopping_rounds": 60,
        "monotone_constraints": tuple([1] * n_features),
    }
    return [
        {**base, "max_depth": 3, "min_child_weight": 4, "gamma": 0.0},
        {**base, "max_depth": 4, "min_child_weight": 4, "gamma": 0.0},
        {**base, "max_depth": 5, "min_child_weight": 6, "gamma": 0.0},
        {**base, "max_depth": 6, "min_child_weight": 8, "gamma": 0.05},
    ]


def _treinar(
    x_treino: pd.DataFrame,
    y_treino: pd.Series,
    x_validacao: pd.DataFrame,
    y_validacao: pd.Series,
) -> tuple[XGBRegressor, list[dict[str, Any]]]:
    melhor: XGBRegressor | None = None
    melhor_mae = float("inf")
    busca: list[dict[str, Any]] = []
    for indice, parametros in enumerate(_candidatos(x_treino.shape[1]), start=1):
        modelo = XGBRegressor(**parametros)
        modelo.fit(
            x_treino,
            y_treino,
            eval_set=[(x_validacao, y_validacao)],
            verbose=False,
        )
        predicao = modelo.predict(x_validacao)
        mae = float(mean_absolute_error(y_validacao, predicao))
        busca.append(
            {
                "candidate": indice,
                "validation_mae": mae,
                "validation_r2": float(r2_score(y_validacao, predicao)),
                "best_iteration": int(modelo.best_iteration),
                "parameters": parametros,
            }
        )
        if mae < melhor_mae:
            melhor = modelo
            melhor_mae = mae
    if melhor is None:
        raise RuntimeError("nenhum regressor foi treinado")
    return melhor, busca


def _metricas(y: pd.Series, predicao: np.ndarray) -> dict[str, Any]:
    erros = np.abs(y.to_numpy() - predicao)
    quadro = pd.DataFrame({"real": y.to_numpy(), "erro": erros})
    quadro["faixa"] = pd.cut(
        quadro["real"],
        bins=[-0.001, 20, 40, 60, 80, 100.001],
        labels=["0–20", "20–40", "40–60", "60–80", "80–100"],
        include_lowest=True,
    )
    por_faixa = [
        {
            "range": str(faixa),
            "n": int(len(grupo)),
            "mae": float(grupo["erro"].mean()),
        }
        for faixa, grupo in quadro.groupby("faixa", observed=True)
    ]
    serie_predicao = pd.Series(predicao, index=y.index)
    return {
        "mae": float(mean_absolute_error(y, predicao)),
        "rmse": float(mean_squared_error(y, predicao) ** 0.5),
        "r2": float(r2_score(y, predicao)),
        "spearman": float(y.corr(serie_predicao, method="spearman")),
        "max_absolute_error": float(erros.max()),
        "error_by_target_range": por_faixa,
    }


def _explicar(
    modelo: XGBRegressor,
    x_teste: pd.DataFrame,
    grupos: dict[str, str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], float]:
    explicador = shap.TreeExplainer(modelo)
    explicacao = explicador(x_teste)
    valores = np.asarray(explicacao.values)
    features = [
        {
            "feature": feature,
            "group": grupos[feature],
            "mean_abs_shap": float(np.abs(valores[:, indice]).mean()),
            "mean_signed_shap": float(valores[:, indice].mean()),
        }
        for indice, feature in enumerate(x_teste.columns)
    ]
    features.sort(key=lambda item: item["mean_abs_shap"], reverse=True)
    acumulado: dict[str, float] = {}
    for item in features:
        grupo = str(item["group"])
        acumulado[grupo] = acumulado.get(grupo, 0.0) + float(item["mean_abs_shap"])
    total = sum(acumulado.values()) or 1.0
    blocos = [
        {
            "group": grupo,
            "mean_abs_shap_sum": valor,
            "importance_percent": valor / total * 100.0,
        }
        for grupo, valor in acumulado.items()
    ]
    blocos.sort(key=lambda item: item["mean_abs_shap_sum"], reverse=True)
    esperado = np.asarray(explicador.expected_value).reshape(-1)
    return features, blocos, float(esperado[-1])


def _model_card(
    caminho: Path,
    metricas: dict[str, Any],
    dados: dict[str, Any],
    blocos: list[dict[str, Any]],
) -> None:
    top = "\n".join(
        f"- Bloco {item['group']}: {item['importance_percent']:.1f}%"
        for item in blocos[:5]
    )
    caminho.write_text(
        f"""# Model Card — {MODELO_ID}

## Finalidade

Aproximação experimental do índice determinístico 0–100 declarado no gabarito
XLSX. Treinado apenas em respostas sintéticas; não está ativo no produto.

## Dados e resultado

- Amostras: {dados['n_amostras']}
- Features: {dados['n_features']}
- Cenários independentes: {dados['n_cenarios']}
- MAE no teste: {metricas['mae']:.4f} pontos
- RMSE no teste: {metricas['rmse']:.4f} pontos
- R² no teste: {metricas['r2']:.6f}
- Spearman no teste: {metricas['spearman']:.6f}

## SHAP por bloco

{top}

## Limitações

- A fórmula do XLSX é a referência e calcula o alvo com erro zero; não há
  necessidade técnica de substituí-la por aprendizado de máquina.
- As 46 validações CRP do arquivo estão vazias.
- As métricas medem reprodução de uma fórmula em dados gerados, não validade
  clínica, generalização para trabalhadores reais ou causalidade.
- Proibido usar para diagnóstico ou decisão individual.
""",
        encoding="utf-8",
    )


def executar(args: argparse.Namespace) -> Path:
    """Treina na validação e consulta o conjunto de teste uma única vez."""
    x, y, formula, cenarios, grupos, dados = carregar_base_risco(
        args.respostas, args.gabarito, args.xlsx
    )
    treino, validacao, teste, nomes_splits = _dividir_cenarios(cenarios)
    modelo, busca = _treinar(
        x.loc[treino],
        y.loc[treino],
        x.loc[validacao],
        y.loc[validacao],
    )

    predicao = modelo.predict(x.loc[teste])
    metricas = _metricas(y.loc[teste], predicao)
    formula_metricas = _metricas(y.loc[teste], formula.loc[teste].to_numpy())
    metas_atingidas = {
        "r2": metricas["r2"] >= METAS["r2_min"],
        "mae": metricas["mae"] <= METAS["mae_max"],
        "spearman": metricas["spearman"] >= METAS["spearman_min"],
    }
    features_shap, blocos_shap, valor_base = _explicar(modelo, x.loc[teste], grupos)

    args.saida.mkdir(parents=True, exist_ok=True)
    modelo.save_model(args.saida / "model.json")
    schema = json.dumps(list(x.columns), ensure_ascii=False, separators=(",", ":"))
    manifesto = {
        "model_id": MODELO_ID,
        "created_at": datetime.now(UTC).isoformat(),
        "status": "experimental_offline_synthetic_only",
        "target": "indice_risco_verdadeiro",
        "random_seed": SEMENTE,
        "features": list(x.columns),
        "feature_groups": grupos,
        "feature_schema_sha256": hashlib.sha256(schema.encode()).hexdigest(),
        "files_sha256": {
            "responses": _sha256(args.respostas),
            "labels": _sha256(args.gabarito),
            "xlsx": _sha256(args.xlsx),
        },
        "split_scenarios": nomes_splits,
        "split_counts": {
            "train": int(treino.sum()),
            "validation": int(validacao.sum()),
            "test": int(teste.sum()),
        },
        "runtime_activation": False,
    }
    relatorio = {
        "model_id": MODELO_ID,
        "data": dados,
        "goals": METAS,
        "goals_met": metas_atingidas,
        "all_goals_met": all(metas_atingidas.values()),
        "test_metrics": metricas,
        "deterministic_formula_test_metrics": formula_metricas,
        "validation_search": busca,
        "selected_parameters": modelo.get_params(),
        "shap_expected_value": valor_base,
        "warning": "Métrica sintética de reprodução de fórmula; sem validade clínica.",
    }
    (args.saida / "manifest.json").write_text(
        json.dumps(_serializavel(manifesto), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (args.saida / "metrics.json").write_text(
        json.dumps(_serializavel(relatorio), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (args.saida / "shap_importance.json").write_text(
        json.dumps(
            _serializavel({"features": features_shap, "groups": blocos_shap}),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    _model_card(args.saida / "MODEL_CARD.md", metricas, dados, blocos_shap)
    return args.saida


def _argumentos() -> argparse.Namespace:
    dados = PROJETO / "ml" / "data" / "risk_v2"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--respostas", type=Path, default=dados / "responses.csv")
    parser.add_argument("--gabarito", type=Path, default=dados / "labels.csv")
    parser.add_argument(
        "--xlsx",
        type=Path,
        default=PROJETO / "ml" / "specs" / "S6_INSTR_gabarito_polaridade_psyra_v1.xlsx",
    )
    parser.add_argument(
        "--saida",
        type=Path,
        default=PROJETO / "backend" / "models" / "experimental" / MODELO_ID,
    )
    return parser.parse_args()


if __name__ == "__main__":
    saida = executar(_argumentos())
    print(f"Treino de risco concluído. Artefatos: {saida}")
