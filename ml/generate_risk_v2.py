"""Gera respostas sintéticas fiéis ao gabarito de risco do questionário."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJETO = Path(__file__).resolve().parents[1]
if str(PROJETO) not in sys.path:
    sys.path.insert(0, str(PROJETO))

from ml.risk_spec import (  # noqa: E402
    calcular_indice_risco,
    carregar_gabarito_xlsx,
    carregar_instrumento_json,
    validar_xlsx_contra_json,
)

SEMENTE = 20260806


def _sha256(caminho: Path) -> str:
    digest = hashlib.sha256()
    with caminho.open("rb") as arquivo:
        for bloco in iter(lambda: arquivo.read(1024 * 1024), b""):
            digest.update(bloco)
    return digest.hexdigest()


def gerar(
    *,
    n_amostras: int,
    n_cenarios: int,
    semente: int,
    xlsx: Path,
    instrumento_json: Path,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, object]]:
    """Gera perfis correlacionados sem dados pessoais."""
    if n_amostras < n_cenarios * 20:
        raise ValueError("cada cenário precisa de pelo menos 20 amostras")
    rng = np.random.default_rng(semente)
    itens = carregar_gabarito_xlsx(xlsx)
    instrumento = carregar_instrumento_json(instrumento_json)
    validacao = validar_xlsx_contra_json(itens, instrumento)

    codigos = [item.codigo for item in itens]
    blocos = sorted({item.bloco for item in itens})
    cenarios = np.arange(n_amostras) % n_cenarios
    rng.shuffle(cenarios)
    ids_cenario = np.array([f"CEN-{valor + 1:02d}" for valor in cenarios])
    medias_cenario = np.linspace(-1.55, 1.55, n_cenarios)
    rng.shuffle(medias_cenario)

    theta = rng.normal(medias_cenario[cenarios], 0.72, n_amostras)
    aquiescencia = rng.normal(0.0, 0.20, n_amostras)
    fatores_bloco = {
        bloco: 0.72 * theta + rng.normal(0.0, 0.62, n_amostras) for bloco in blocos
    }

    respostas_itens: dict[str, np.ndarray] = {}
    for item in itens:
        risco_continuo = (
            3.0
            + 0.78 * theta
            + 0.48 * fatores_bloco[item.bloco]
            + rng.normal(0.0, 0.72, n_amostras)
        )
        bruto_continuo = 6.0 - risco_continuo if item.reverso else risco_continuo
        bruto_continuo = bruto_continuo + aquiescencia
        bruto = np.clip(np.rint(bruto_continuo), 1, 5).astype(float)
        bruto[rng.random(n_amostras) < 0.025] = np.nan
        respostas_itens[item.codigo] = bruto

    respostas = pd.DataFrame(respostas_itens)
    respostas.insert(0, "ghe_codigo", [f"GHE-{valor % 6 + 1:02d}" for valor in cenarios])
    respostas.insert(0, "cenario_id", ids_cenario)
    respostas.insert(
        0, "id_sintetico", [f"RISK-V2-{indice + 1:06d}" for indice in range(n_amostras)]
    )
    alvo = calcular_indice_risco(respostas[codigos], itens)
    if alvo.isna().any():
        raise RuntimeError("geração produziu alvo de risco vazio")

    gabarito = pd.DataFrame(
        {
            "id_sintetico": respostas["id_sintetico"],
            "cenario_id": ids_cenario,
            "indice_risco_verdadeiro": alvo.round(8),
            "theta_latente": theta.round(8),
            "aquiescencia": aquiescencia.round(8),
            "itens_em_branco": respostas[codigos].isna().sum(axis=1),
        }
    )
    manifesto: dict[str, object] = {
        "dataset_id": "psyra_risco_sintetico_v2",
        "seed": semente,
        "n_samples": n_amostras,
        "n_scenarios": n_cenarios,
        "target": "indice_risco_verdadeiro",
        "target_formula": "media ponderada por bloco do gabarito XLSX",
        "xlsx_sha256": _sha256(xlsx),
        "instrument_sha256": _sha256(instrumento_json),
        "validation": validacao,
        "pii_generated": False,
        "clinical_validity": False,
    }
    return respostas, gabarito, manifesto


def _argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-amostras", type=int, default=24000)
    parser.add_argument("--n-cenarios", type=int, default=24)
    parser.add_argument("--semente", type=int, default=SEMENTE)
    parser.add_argument(
        "--xlsx",
        type=Path,
        default=PROJETO / "ml" / "specs" / "S6_INSTR_gabarito_polaridade_psyra_v1.xlsx",
    )
    parser.add_argument(
        "--instrumento",
        type=Path,
        default=PROJETO / "backend" / "data" / "instrumento_psyra_form_v1.json",
    )
    parser.add_argument("--saida", type=Path, default=PROJETO / "ml" / "data" / "risk_v2")
    return parser.parse_args()


def main() -> None:
    """Gera e persiste respostas, gabarito e manifesto em arquivos separados."""
    args = _argumentos()
    respostas, gabarito, manifesto = gerar(
        n_amostras=args.n_amostras,
        n_cenarios=args.n_cenarios,
        semente=args.semente,
        xlsx=args.xlsx,
        instrumento_json=args.instrumento,
    )
    args.saida.mkdir(parents=True, exist_ok=True)
    respostas.to_csv(args.saida / "responses.csv", index=False)
    gabarito.to_csv(args.saida / "labels.csv", index=False)
    (args.saida / "manifest.json").write_text(
        json.dumps(manifesto, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Base sintética v2 gerada em {args.saida}")


if __name__ == "__main__":
    main()
