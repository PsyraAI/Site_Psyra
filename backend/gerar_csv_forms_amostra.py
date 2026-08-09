"""Gera CSV de amostra no formato do export do Google Forms (49 colunas).

Uso (a partir de backend/):
    python gerar_csv_forms_amostra.py --saida data/amostra_forms_respostas.csv --n 30
"""

from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path

from converter_formulario import ROTULOS, SETORES
from app.instrumento import carregar_instrumento


def gerar(saida: Path, n: int = 30, semente: int = 7) -> Path:
    instrumento = carregar_instrumento("psyra_form_v1")
    aleatorio = random.Random(semente)

    cabecalho = ["Timestamp", "Qual o seu setor dentro da Empresa?"]
    for bloco in instrumento["blocos"]:
        for item in bloco["itens"]:
            cabecalho.append(item["texto"])
    cabecalho.append(instrumento["bloco_texto_livre"]["pergunta"])

    assert len(cabecalho) == 49, len(cabecalho)

    textos = [
        "A rotina esta pesada e o cansaco acumula no fim da semana.",
        "Tenho apoio do time e consigo organizar meu tempo.",
        "Volume de demanda cresceu e falta gente no setor.",
        "",
    ]

    linhas: list[list[str]] = []
    for i in range(n):
        setor = SETORES[i % len(SETORES)]
        linha = [f"2026-08-0{(i % 6) + 1} 10:{i % 60:02d}:00", setor]
        for _ in range(46):
            linha.append(aleatorio.choice(ROTULOS))
        linha.append(aleatorio.choice(textos))
        linhas.append(linha)

    saida.parent.mkdir(parents=True, exist_ok=True)
    with saida.open("w", encoding="utf-8-sig", newline="") as arquivo:
        escritor = csv.writer(arquivo)
        escritor.writerow(cabecalho)
        escritor.writerows(linhas)
    return saida


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--saida", type=Path, default=Path("data/amostra_forms_respostas.csv"))
    parser.add_argument("--n", type=int, default=30)
    args = parser.parse_args()
    caminho = gerar(args.saida, args.n)
    print(f"CSV gerado: {caminho} ({args.n} respostas)")
