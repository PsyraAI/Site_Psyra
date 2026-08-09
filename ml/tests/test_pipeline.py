from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from xgboost import XGBClassifier

from ml.features import FORBIDDEN_COLUMNS, carregar_dados_treino

PROJETO = Path(__file__).resolve().parents[2]
DADOS = PROJETO.parent
RESPOSTAS = DADOS / "S6_DADOS_base_sintetica_respostas_v1.csv"
GABARITO = DADOS / "S6_DADOS_base_sintetica_gabarito_v1.csv"
INSTRUMENTO = PROJETO / "backend" / "data" / "instrumento_psyra_form_v1.json"


def _dados() -> tuple[pd.DataFrame, pd.Series, dict[str, str], dict[str, Any]]:
    return carregar_dados_treino(RESPOSTAS, GABARITO, INSTRUMENTO)


def test_features_possuem_schema_seguro_e_estavel() -> None:
    x, y, grupos, metadados = _dados()

    assert x.shape == (5000, 58)
    assert len(y) == 5000
    assert int(y.sum()) == 576
    assert not FORBIDDEN_COLUMNS.intersection(x.columns)
    assert set(grupos) == set(x.columns)
    assert metadados["instrumento_codigo"] == "psyra_form_v1"


def test_engenharia_de_features_e_reprodutivel() -> None:
    x_primeiro, y_primeiro, _, _ = _dados()
    x_segundo, y_segundo, _, _ = _dados()

    assert x_primeiro.equals(x_segundo)
    assert y_primeiro.equals(y_segundo)


def test_modelo_xgboost_pode_ser_salvo_e_recarregado(tmp_path: Path) -> None:
    x, y, _, _ = _dados()
    x_amostra = x.iloc[:300]
    y_amostra = y.iloc[:300]
    modelo = XGBClassifier(
        n_estimators=8,
        max_depth=2,
        random_state=20260806,
        tree_method="hist",
        eval_metric="aucpr",
    )
    modelo.fit(x_amostra, y_amostra)
    antes = modelo.predict_proba(x_amostra)[:, 1]

    caminho = tmp_path / "model.json"
    modelo.save_model(caminho)
    recarregado = XGBClassifier()
    recarregado.load_model(caminho)
    depois = recarregado.predict_proba(x_amostra)[:, 1]

    assert np.allclose(antes, depois)
