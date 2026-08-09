"""Gerador de base sintética psicossocial. Sprint: S6 | Risco: R1 (CRÍTICO).

⚠️ POR QUE ESTE GERADOR NÃO COPIA A FÓRMULA DO MOTOR DE SCORE
Se eu gerasse as respostas com a mesma média ponderada que o `scoring.py` usa
para lê-las, medir "acerto" seria medir a identidade: o motor recuperaria 100%
do que eu plantei e o F1 daria 1,0. Isso é exatamente o R1 — e seria um número
sem significado nenhum.

Então o caminho aqui é outro, e de propósito:

    θ latente (traço não observável)
        → viés de resposta do indivíduo (aquiescência, extremidade)
        → dificuldade do item
        → ruído
        → resposta observada 1–5

O motor tenta recuperar θ a partir das respostas observadas, sem nunca ver θ.
A concordância entre os dois é uma checagem de SANIDADE DO MOTOR (ele ordena os
grupos na direção certa?), NÃO desempenho de modelo. Desempenho de modelo só
existe em validação OOD com dado real anotado por CRP, pós-CEP.

O gabarito (θ verdadeiro) sai em arquivo SEPARADO e nunca é carregado na tabela
`resposta` — senão viraria leakage na primeira vez que alguém treinasse algo.

Uso:
    python gerar_base_sintetica.py --n 5000 --instrumento nr1_v2_demo --saida ./out
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import math
import random
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.instrumento import carregar_instrumento  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("gerador")

SEMENTE_PADRAO = 2026

# Limiares que convertem z contínuo em nota 1–5. Assimétricos de propósito:
# em instrumento psicossocial as pontas extremas são menos usadas.
_LIMIARES = (-1.15, -0.35, 0.45, 1.25)

# GHEs do cenário. Os dois últimos são pequenos DE PROPÓSITO, para exercitar a
# supressão n≥5 — coisa que o dataset de healthcare não conseguia testar.
GHES: list[tuple[str, str, str, float, float]] = [
    # (código, nome, setor, média latente do grupo, proporção do total)
    ("GHE-01", "Teleatendimento", "Operações", 0.85, 0.26),
    ("GHE-02", "Enfermagem assistencial", "Assistência", 0.60, 0.18),
    ("GHE-03", "Logística e expedição", "Operações", 0.30, 0.16),
    ("GHE-04", "Atendimento ao público", "Comercial", 0.45, 0.14),
    ("GHE-05", "Tecnologia e produto", "Tecnologia", -0.35, 0.12),
    ("GHE-06", "Administrativo", "Corporativo", -0.10, 0.09),
    ("GHE-07", "Manutenção predial", "Infraestrutura", 0.20, 0.03),
    ("GHE-08", "Jurídico", "Corporativo", -0.50, 0.015),
    ("GHE-09", "Diretoria", "Corporativo", -0.20, 0.004),
    ("GHE-10", "Comitê de ética", "Corporativo", 0.05, 0.001),
]

# Frases por dimensão e intensidade. O texto NÃO é gerado a partir das notas
# Likert: ele vem do estado emocional latente, que é correlacionado mas não
# idêntico. É essa folga que cria o caso do Revelador.
_FRASES: dict[str, dict[str, list[str]]] = {
    "carga": {
        "alta": [
            "a demanda não cabe no expediente, viro a noite pensando no que ficou",
            "trabalho em ritmo que não consigo sustentar, sinto que vou quebrar",
            "acumulo função de duas pessoas desde que cortaram a equipe",
        ],
        "media": [
            "tem semana pesada e semana tranquila, depende do volume",
            "o volume cresceu mas ainda dá para organizar",
        ],
        "baixa": [
            "consigo organizar minhas entregas dentro do horário",
            "a carga está equilibrada no meu setor",
        ],
    },
    "lideranca": {
        "alta": [
            "a cobrança vem em tom agressivo e ninguém fala nada",
            "quando levanto problema sou tratado como se fosse o problema",
            "não existe abertura, a liderança só aparece para cobrar meta",
        ],
        "media": [
            "a liderança ajuda quando procuro, mas raramente procura antes",
            "o retorno sobre o trabalho vem, só que atrasado",
        ],
        "baixa": [
            "tenho apoio da minha liderança quando preciso",
            "me sinto à vontade para levantar problemas aqui",
        ],
    },
    "saude": {
        "alta": [
            "não durmo direito há semanas e acordo já cansado",
            "tenho chorado antes de entrar no turno",
            "o cansaço não passa nem depois da folga",
            "ando com ansiedade constante e já pensei em pedir demissão",
        ],
        "media": [
            "sinto cansaço no fim da semana, nada fora do comum",
            "às vezes bate um desânimo, mas passa",
        ],
        "baixa": [
            "tenho conseguido descansar e me desligar do trabalho",
            "estou bem, com energia para a rotina",
        ],
    },
    "reconhecimento": {
        "alta": [
            "entrego muito e isso passa despercebido",
            "não vejo perspectiva nenhuma de crescer aqui",
        ],
        "media": [
            "o reconhecimento existe mas é irregular",
        ],
        "baixa": [
            "sinto que meu trabalho tem valor para a empresa",
        ],
    },
}

# ~8% dos textos recebem PII, para exercitar o anonimizador na carga.
_INJECOES_PII = [
    "Sou o {nome} do setor.",
    "Meu nome é {nome}, pode me chamar.",
    "Falei com a gerente {nome} sobre isso.",
    "Se precisar meu contato é {email}.",
    "Meu telefone é (11) 9{d4}-{d4b}.",
]
_NOMES = [
    "Carlos Andrade",
    "Ana Beatriz",
    "Marcos Vinícius",
    "Juliana Prado",
    "Rafael Moreira",
    "Patrícia Lopes",
    "Bruno Tavares",
    "Camila Nunes",
]


def _nota_de_z(z: float, reverso: bool) -> int:
    """Converte z contínuo em nota 1–5, invertendo se o bloco for protetor."""
    nota = 1
    for limiar in _LIMIARES:
        if z > limiar:
            nota += 1
    return 6 - nota if reverso else nota


def _intensidade(theta: float) -> str:
    """Faixa qualitativa do estado emocional latente."""
    if theta > 0.55:
        return "alta"
    if theta > -0.30:
        return "media"
    return "baixa"


def gerar_texto(
    theta_emocional: float, aleatorio: random.Random
) -> tuple[str | None, bool]:
    """Monta o texto do Bloco K a partir do estado emocional latente.

    Devolve (texto, contem_pii). Cerca de 30% dos respondentes não escrevem
    nada — que é o comportamento real em questionário com campo opcional.
    """
    if aleatorio.random() < 0.30:
        return None, False

    faixa = _intensidade(theta_emocional)
    temas = aleatorio.sample(list(_FRASES), k=aleatorio.choice((1, 1, 2)))
    partes = [aleatorio.choice(_FRASES[tema][faixa]) for tema in temas]
    texto = "; ".join(partes).capitalize() + "."

    contem_pii = aleatorio.random() < 0.08
    if contem_pii:
        molde = aleatorio.choice(_INJECOES_PII)
        texto = (
            molde.format(
                nome=aleatorio.choice(_NOMES),
                email=f"{aleatorio.choice(['ana','carlos','jp','bruno'])}@empresa.com.br",
                d4=aleatorio.randint(1000, 9999),
                d4b=aleatorio.randint(1000, 9999),
            )
            + " "
            + texto
        )
    return texto, contem_pii


def gerar(
    quantidade: int, instrumento_codigo: str, semente: int = SEMENTE_PADRAO
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Gera respostas observadas e o gabarito latente correspondente.

    Sprint: S6 | Risco: R1. Devolve (respostas, gabarito) como listas de dicts.
    O gabarito NUNCA pode ser gravado junto das respostas.
    """
    instrumento = carregar_instrumento(instrumento_codigo)
    aleatorio = random.Random(semente)

    pesos = [g[4] for g in GHES]
    respostas: list[dict[str, Any]] = []
    gabarito: list[dict[str, Any]] = []

    for indice in range(quantidade):
        codigo_ghe, nome_ghe, setor, media_grupo, _ = aleatorio.choices(
            GHES, weights=pesos, k=1
        )[0]

        # 1) traço latente do indivíduo: efeito do grupo + desvio pessoal
        theta = aleatorio.gauss(media_grupo, 0.62)

        # 2) estilo de resposta — ruído que o motor NÃO conhece
        aquiescencia = aleatorio.gauss(0.0, 0.28)  # tendência a concordar
        extremidade = aleatorio.choice((0.85, 1.0, 1.0, 1.15))  # usa ou não as pontas

        # 3) dissimulação: responde a escala melhor do que está, mas o texto
        #    entrega. É o caso que dá origem ao Revelador.
        dissimula = aleatorio.random() < 0.12
        desconto = aleatorio.uniform(0.7, 1.3) if dissimula else 0.0

        itens: dict[str, int] = {}
        for bloco in instrumento["blocos"]:
            # cada dimensão desvia um pouco do traço geral da pessoa
            theta_dim = theta + aleatorio.gauss(0.0, 0.35) - desconto
            padrao = bool(bloco.get("reverso", False))
            for posicao, item in enumerate(bloco["itens"], start=1):
                dificuldade = aleatorio.gauss(0.0, 0.30)
                z = (theta_dim + aquiescencia + dificuldade) * extremidade
                z += aleatorio.gauss(0.0, 0.45)  # ruído do item
                # 3% de itens em branco, como em questionário de campo
                if aleatorio.random() < 0.03:
                    continue
                reverso = (
                    bool(item.get("reverso", padrao))
                    if isinstance(item, dict)
                    else padrao
                )
                itens[f"{bloco['codigo']}{posicao}"] = _nota_de_z(z, reverso)

        if not itens:  # respondente que não marcou nada é descartado
            continue

        # o texto reflete o traço VERDADEIRO, sem o desconto da dissimulação
        texto, contem_pii = gerar_texto(theta + aleatorio.gauss(0.0, 0.30), aleatorio)

        identificador = f"SYN-{indice + 1:05d}"
        respostas.append(
            {
                "id_sintetico": identificador,
                "ghe_codigo": codigo_ghe,
                "ghe_nome": nome_ghe,
                "setor": setor,
                "texto_livre": texto or "",
                **itens,
            }
        )
        gabarito.append(
            {
                "id_sintetico": identificador,
                "ghe_codigo": codigo_ghe,
                "theta_verdadeiro": round(theta, 4),
                "nivel_verdadeiro": (
                    "alto" if theta > 0.60 else "moderado" if theta > -0.10 else "baixo"
                ),
                "dissimulador": int(dissimula),
                "aquiescencia": round(aquiescencia, 4),
                "itens_em_branco": sum(len(b["itens"]) for b in instrumento["blocos"])
                - len(itens),
                "texto_com_pii": int(contem_pii),
                "escreveu_texto": int(texto is not None),
            }
        )

    return respostas, gabarito


def salvar(
    respostas: list[dict[str, Any]], gabarito: list[dict[str, Any]], destino: Path
) -> dict[str, Path]:
    """Grava respostas e gabarito em CSVs separados, com aviso no gabarito."""
    destino.mkdir(parents=True, exist_ok=True)
    caminho_respostas = destino / "S6_DADOS_base_sintetica_respostas_v1.csv"
    caminho_gabarito = destino / "S6_DADOS_base_sintetica_gabarito_v1.csv"

    # As colunas vêm da UNIÃO de todas as linhas: cada respondente deixa itens
    # diferentes em branco, então a primeira linha não representa o cabeçalho.
    fixas = ["id_sintetico", "ghe_codigo", "ghe_nome", "setor", "texto_livre"]
    itens = sorted(
        {chave for linha in respostas for chave in linha if chave not in fixas},
        key=lambda chave: (chave[0], int(chave[1:])),
    )
    colunas = fixas + itens

    with caminho_respostas.open("w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=colunas, restval="")
        escritor.writeheader()
        escritor.writerows(respostas)

    with caminho_gabarito.open("w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=list(gabarito[0].keys()))
        escritor.writeheader()
        escritor.writerows(gabarito)

    logger.info("respostas: %s (%d linhas)", caminho_respostas.name, len(respostas))
    logger.info("gabarito:  %s (NÃO carregar no banco)", caminho_gabarito.name)
    return {"respostas": caminho_respostas, "gabarito": caminho_gabarito}


def conferir(
    respostas: list[dict[str, Any]], gabarito: list[dict[str, Any]], instrumento: str
) -> dict[str, Any]:
    """Sanidade do gerador: correlação θ × índice do motor, por indivíduo.

    Sprint: S6 | Risco: R1. Correlação ALTA DEMAIS (> 0,95) indicaria que o
    gerador virou espelho do motor — o gerador estaria errado, não o motor bom.
    """
    from app.scoring import calcular_indice_likert

    pares: list[tuple[float, float]] = []
    mapa = {g["id_sintetico"]: g for g in gabarito}
    for linha in respostas:
        itens = {
            chave: int(valor)
            for chave, valor in linha.items()
            if chave[0].isalpha() and chave[1:].isdigit() and chave[0].isupper()
        }
        try:
            indice, _ = calcular_indice_likert(itens, instrumento)
        except ValueError:
            continue
        pares.append((mapa[linha["id_sintetico"]]["theta_verdadeiro"], indice))

    n = len(pares)
    media_x = sum(p[0] for p in pares) / n
    media_y = sum(p[1] for p in pares) / n
    cov = sum((x - media_x) * (y - media_y) for x, y in pares) / n
    dp_x = math.sqrt(sum((x - media_x) ** 2 for x, y in pares) / n)
    dp_y = math.sqrt(sum((y - media_y) ** 2 for x, y in pares) / n)
    return {
        "n": n,
        "correlacao_theta_indice": round(cov / (dp_x * dp_y), 3),
        "indice_medio": round(media_y, 1),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gerador de base sintética Psyra")
    parser.add_argument("--n", type=int, default=5000)
    parser.add_argument("--instrumento", default="nr1_v2_demo")
    parser.add_argument("--semente", type=int, default=SEMENTE_PADRAO)
    parser.add_argument("--saida", type=Path, default=Path("./base_sintetica"))
    args = parser.parse_args()

    dados, verdade = gerar(args.n, args.instrumento, args.semente)
    salvar(dados, verdade, args.saida)
    print(json.dumps(conferir(dados, verdade, args.instrumento), ensure_ascii=False))
