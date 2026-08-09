import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from xgboost import XGBRegressor

from ml.generate_risk_v2 import gerar
from ml.risk_features import FORBIDDEN_COLUMNS, carregar_base_risco
from ml.risk_spec import (
    calcular_indice_risco,
    carregar_gabarito_xlsx,
    carregar_instrumento_json,
    validar_xlsx_contra_json,
)
from ml.train_risk_xgb_shap import _dividir_cenarios

PROJETO = Path(__file__).resolve().parents[2]
XLSX = PROJETO / "ml" / "specs" / "S6_INSTR_gabarito_polaridade_psyra_v1.xlsx"
INSTRUMENTO = PROJETO / "backend" / "data" / "instrumento_psyra_form_v1.json"
DADOS = PROJETO / "ml" / "data" / "risk_v2"
ARTEFATOS = (
    PROJETO
    / "backend"
    / "models"
    / "experimental"
    / "xgb_risco_questionario_sintetico_v1"
)


def test_xlsx_corresponde_integralmente_ao_instrumento() -> None:
    itens = carregar_gabarito_xlsx(XLSX)
    instrumento = carregar_instrumento_json(INSTRUMENTO)
    resultado = validar_xlsx_contra_json(itens, instrumento)

    assert resultado == {
        "n_itens": 46,
        "n_protetores": 33,
        "n_risco": 13,
        "n_validacoes_crp": 0,
        "blocos": list("ABCDEFGHIJ"),
    }


def test_formula_respeita_extremos_de_polaridade() -> None:
    itens = carregar_gabarito_xlsx(XLSX)
    minimo = {item.codigo: 5 if item.reverso else 1 for item in itens}
    maximo = {item.codigo: 1 if item.reverso else 5 for item in itens}
    respostas = pd.DataFrame([minimo, maximo])

    resultado = calcular_indice_risco(respostas, itens)

    assert np.allclose(resultado.to_numpy(), [0.0, 100.0])


def test_gerador_e_reprodutivel_e_sem_pii() -> None:
    argumentos: dict[str, Any] = {
        "n_amostras": 480,
        "n_cenarios": 24,
        "semente": 20260806,
        "xlsx": XLSX,
        "instrumento_json": INSTRUMENTO,
    }
    respostas_a, gabarito_a, manifesto_a = gerar(**argumentos)
    respostas_b, gabarito_b, manifesto_b = gerar(**argumentos)

    assert respostas_a.equals(respostas_b)
    assert gabarito_a.equals(gabarito_b)
    assert manifesto_a == manifesto_b
    assert manifesto_a["pii_generated"] is False
    assert "nome" not in respostas_a.columns
    assert "email" not in respostas_a.columns


def test_base_features_splits_e_artefato_sao_validos() -> None:
    x, y, formula, cenarios, grupos, metadados = carregar_base_risco(
        DADOS / "responses.csv", DADOS / "labels.csv", XLSX
    )
    treino, validacao, teste, nomes = _dividir_cenarios(cenarios)

    assert x.shape == (24000, 56)
    assert not FORBIDDEN_COLUMNS.intersection(x.columns)
    assert set(grupos) == set(x.columns)
    assert metadados["formula_max_abs_error"] < 1e-6
    assert np.max(np.abs(y.to_numpy() - formula.to_numpy())) < 1e-6
    assert set(nomes["train"]).isdisjoint(nomes["validation"])
    assert set(nomes["train"]).isdisjoint(nomes["test"])
    assert set(nomes["validation"]).isdisjoint(nomes["test"])
    assert (int(treino.sum()), int(validacao.sum()), int(teste.sum())) == (
        16000,
        4000,
        4000,
    )

    manifesto = json.loads((ARTEFATOS / "manifest.json").read_text(encoding="utf-8"))
    assert manifesto["runtime_activation"] is False
    modelo = XGBRegressor()
    modelo.load_model(ARTEFATOS / "model.json")
    predicao = modelo.predict(x.iloc[:10])
    assert predicao.shape == (10,)
    assert np.isfinite(predicao).all()
