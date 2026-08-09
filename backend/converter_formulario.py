"""Converte o export do Formulário Psyra em instrumento. Sprint: S6 | Risco: R1.

Lê o CSV exportado do Google Forms e emite `instrumento_psyra_form_v1.json`.
Os textos dos 46 itens vêm do arquivo, nunca digitados à mão — transcrição
manual de instrumento é fonte clássica de erro silencioso.

⚠️ DUAS COISAS AQUI SÃO INFERÊNCIA MINHA, NÃO DO FORMULÁRIO:

1. O AGRUPAMENTO EM BLOCOS. O formulário do Pedro tem uma única seção
   declarada ("Setor Atuante dentro da Corporação"); os 46 itens vêm numa
   lista plana, sem cabeçalho de dimensão. Agrupei por leitura do conteúdo e
   por ordem de apresentação. **Precisa de validação da psicóloga CRP** antes
   de virar dimensão de laudo — o agrupamento define o que o PGR vai chamar de
   "fator dominante".

2. A POLARIDADE DE CADA ITEM. Marquei item a item se concordar indica proteção
   ou risco. Errar isso inverte o score e ninguém percebe, então a lista está
   explícita abaixo para conferência linha a linha.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

# Índice da coluna no CSV -> (bloco, protetor?)
# protetor=True  → concordar indica MENOS risco (item reverso)
# protetor=False → concordar indica MAIS risco (item direto)
POLARIDADE: dict[int, tuple[str, bool]] = {
    # A — Apoio social e liderança
    2: ("A", True),
    3: ("A", True),
    4: ("A", True),
    5: ("A", True),
    6: ("A", True),
    # B — Autonomia e controle
    7: ("B", True),
    8: ("B", True),
    9: ("B", True),
    # C — Clareza de papel e metas
    10: ("C", True),
    11: ("C", True),
    12: ("C", True),
    13: ("C", True),
    # D — Carga de trabalho  (POLARIDADE MISTA — ver nota no README)
    14: ("D", True),  # quantidade compatível com o tempo
    15: ("D", False),  # frequentemente sobrecarregado
    16: ("D", True),  # desafia de forma saudável, sem esgotamento
    17: ("D", False),  # tarefas insuficientes (subcarga também é risco)
    # E — Reconhecimento e recompensa
    18: ("E", True),
    19: ("E", True),
    20: ("E", True),
    # F — Relações interpessoais e assédio
    21: ("F", True),
    22: ("F", True),
    23: ("F", True),
    24: ("F", True),
    # G — Justiça organizacional
    25: ("G", True),
    26: ("G", True),
    27: ("G", True),
    # H — Comunicação e recursos
    28: ("H", True),
    29: ("H", True),
    30: ("H", True),
    # I — Equilíbrio trabalho-vida  (POLARIDADE MISTA)
    31: ("I", True),
    32: ("I", False),  # demandas influenciam negativamente a vida pessoal
    33: ("I", True),
    34: ("I", False),  # atendo demandas fora da jornada
    35: ("I", True),
    36: ("I", False),  # exigências prejudicam a qualidade de vida
    37: ("I", True),
    38: ("I", True),
    39: ("I", True),
    # J — Sinais de saúde e esgotamento (todos diretos: são sintomas)
    40: ("J", False),
    41: ("J", False),
    42: ("J", False),
    43: ("J", False),
    44: ("J", False),
    45: ("J", False),
    46: ("J", False),
    47: ("J", False),
}

DIMENSOES: dict[str, tuple[str, float]] = {
    "A": ("Apoio social e liderança", 1.2),
    "B": ("Autonomia e controle", 1.0),
    "C": ("Clareza de papel e metas", 1.0),
    "D": ("Carga de trabalho", 1.2),
    "E": ("Reconhecimento e recompensa", 1.0),
    "F": ("Relações interpessoais e assédio", 1.4),
    "G": ("Justiça organizacional", 1.1),
    "H": ("Comunicação e recursos", 0.9),
    "I": ("Equilíbrio trabalho-vida", 1.1),
    "J": ("Sinais de saúde e esgotamento", 1.3),
}

ACOES: dict[str, str] = {
    "A": "Capacitar lideranças em escuta e criar canal de reporte sem retaliação.",
    "B": "Ampliar margem de decisão do grupo sobre método e ritmo de trabalho.",
    "C": "Publicar descrição de papel e critérios de avaliação por função.",
    "D": "Revisar dimensionamento de equipe e distribuição de metas do grupo.",
    "E": "Revisar política de reconhecimento e trilha de desenvolvimento.",
    "F": "Acionar comitê de ética; reforçar canal de denúncia e protocolo antiassédio.",
    "G": "Tornar públicos os critérios de promoção e a aplicação das políticas.",
    "H": "Revisar ferramentas e fluxo de informação necessários à operação.",
    "I": "Definir política de desconexão e limites de acionamento fora da jornada.",
    "J": "Encaminhar avaliação clínica coletiva com a psicóloga responsável (CRP).",
}

SETORES = [
    "Administrativo",
    "Financeiro",
    "Recursos Humanos (RH)",
    "Comercial e Vendas",
    "Marketing",
    "Operacional",
    "Tecnologia da Informação (TI)",
    "Outro",
]

ROTULOS = [
    "Discordo totalmente",
    "Discordo parcialmente",
    "Nem concordo nem discordo",
    "Concordo parcialmente",
    "Concordo totalmente",
]


def construir(caminho_csv: Path) -> dict:
    """Monta a estrutura do instrumento a partir do cabeçalho do CSV."""
    with caminho_csv.open(encoding="utf-8-sig", newline="") as arquivo:
        cabecalho = next(csv.reader(arquivo))

    if len(cabecalho) != 49:
        raise ValueError(f"esperava 49 colunas no export, vieram {len(cabecalho)}")

    blocos: dict[str, list[dict]] = {codigo: [] for codigo in DIMENSOES}
    for indice, (codigo, protetor) in POLARIDADE.items():
        blocos[codigo].append(
            {
                "texto": re.sub(r"\s+", " ", cabecalho[indice]).strip(),
                "reverso": protetor,
                "coluna_csv": indice,
            }
        )

    total = sum(len(itens) for itens in blocos.values())
    if total != 46:
        raise ValueError(f"esperava 46 itens mapeados, foram {total}")

    return {
        "codigo": "psyra_form_v1",
        "versao": "1.0",
        "origem": (
            "Google Forms 'Formulário Psyra' (Pedro Octávio) — export de 31/07/2026"
        ),
        "aviso": (
            "Itens transcritos automaticamente do export do formulário. O AGRUPAMENTO "
            "em blocos e a POLARIDADE de cada item são inferência técnica e precisam de "
            "validação da psicóloga CRP antes de qualquer uso em laudo ou PGR. "
            "Os itens do bloco J tocam sinais de saúde — coleta real exige CEP."
        ),
        "escala": {"tipo": "likert_5", "rotulos": ROTULOS},
        "consentimento": (
            "Participação voluntária e anônima. Os resultados são apresentados apenas "
            "por grupo (mínimo de 5 respostas), nunca individualmente. Ao continuar, "
            "você concorda com a participação."
        ),
        "campo_grupo": {
            "pergunta": "Qual o seu setor dentro da Empresa?",
            "opcoes": SETORES,
        },
        "blocos": [
            {
                "codigo": codigo,
                "dimensao": DIMENSOES[codigo][0],
                "peso": DIMENSOES[codigo][1],
                "reverso": False,
                "polaridade_mista": len({i["reverso"] for i in itens}) > 1,
                "acao_sugerida": ACOES[codigo],
                "itens": itens,
            }
            for codigo, itens in blocos.items()
        ],
        "bloco_texto_livre": {
            "codigo": "K",
            "pergunta": re.sub(r"\s+", " ", cabecalho[48]).strip(),
            "obrigatorio": False,
            "aviso": (
                "Não escreva nomes, CPF, e-mail ou telefone. O texto passa por "
                "anonimização automática antes de ser armazenado."
            ),
        },
    }


if __name__ == "__main__":
    import sys

    origem = Path(sys.argv[1])
    destino = Path(__file__).resolve().parent / "data" / "instrumento_psyra_form_v1.json"
    instrumento = construir(origem)
    destino.write_text(
        json.dumps(instrumento, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    mistos = [b["codigo"] for b in instrumento["blocos"] if b["polaridade_mista"]]
    print(f"instrumento gravado: {destino.name}")
    print(f"blocos: {len(instrumento['blocos'])} | itens: 46")
    print(f"blocos com polaridade mista: {mistos}")
