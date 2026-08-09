"""ETL do dataset Healthcare Workforce Mental Health. Sprint: S6 | Risco: R1.

⚠️ O QUE ESTA CARGA É — E O QUE NÃO É
Isto é um TESTE DE PIPELINE, não uma medição de precisão do produto. O dataset
de origem não tem texto livre, não tem anotação clínica, não usa o instrumento
NR-1 e não é população CLT brasileira. Ele serve para responder perguntas de
engenharia ("o pipeline aguenta 5.000 linhas?", "a supressão n≥5 se comporta com
grupos grandes?", "um segundo instrumento entra sem tocar no scoring?") e não
responde nenhuma pergunta sobre desempenho de modelo.

Por isso a coleta é gravada com `origem_dados='teste'` — nem 'sintetico'
(não foi gerada por nós) nem 'real' (não passou por CEP/TCLE).

Uso:  python etl_healthcare.py --csv /caminho/arquivo.csv [--reset]
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import secrets
import sys
import uuid
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.db import buscar_um, conectar, criar_schema, executar  # noqa: E402
from app.instrumento import carregar_instrumento  # noqa: E402
from app.scoring import calcular_indice_likert  # noqa: E402
from app.security import gerar_hash_senha  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("etl")

INSTRUMENTO = "hcp_v1"
TOKEN_COLETA = "teste-hcp-2026"

# --- mapeamento coluna do CSV -> item Likert 1-5 -----------------------------
# Cada regra é explícita e auditável. Nenhuma imputação, nenhum valor default
# silencioso: linha que não mapeia é REJEITADA e contada, não "consertada".

_BURNOUT = {"Never": 1, "Occasionally": 3, "Often": 5}
_SIM_NAO = {"Yes": 5, "No": 1}


def _escala_estresse(bruto: str) -> int:
    """Stress Level (4–9 no dataset) reescalado linearmente para 1–5.

    O dataset não contém valores 1–3: a escala é truncada na origem. Reescalar
    preserva a ordem e a distribuição relativa, mas NÃO cria informação que não
    existe — grupos "muito baixo estresse" simplesmente não estão representados.
    """
    valor = int(bruto)
    if not 4 <= valor <= 9:
        raise ValueError(f"Stress Level fora da faixa observada (4-9): {valor}")
    return max(1, min(5, round((valor - 4) / 5 * 4 + 1)))


def _faixa_afastamentos(bruto: str) -> int:
    """Mental Health Absences (0–19 dias) em cinco faixas ordinais."""
    dias = int(bruto)
    if dias < 0:
        raise ValueError(f"afastamentos negativos: {dias}")
    for limite, nota in ((2, 1), (5, 2), (8, 3), (12, 4)):
        if dias <= limite:
            return nota
    return 5


def mapear_linha(linha: dict[str, str]) -> dict[str, int]:
    """Converte uma linha do CSV no vetor Likert do instrumento hcp_v1.

    Sprint: S6 | Risco: R1. Levanta ValueError em qualquer valor inesperado —
    o chamador conta e descarta, para que o total carregado seja rastreável.
    """
    burnout = _BURNOUT.get(linha["Burnout Frequency"].strip())
    if burnout is None:
        raise ValueError(f"Burnout Frequency desconhecido: {linha['Burnout Frequency']}")

    eap = _SIM_NAO.get(linha["Access to EAPs"].strip())
    if eap is None:
        raise ValueError(f"Access to EAPs desconhecido: {linha['Access to EAPs']}")

    satisfacao = int(linha["Job Satisfaction"])
    if not 1 <= satisfacao <= 5:
        raise ValueError(f"Job Satisfaction fora de 1-5: {satisfacao}")

    return {
        "A1": _escala_estresse(linha["Stress Level"]),
        "B1": burnout,
        "C1": satisfacao,  # bloco reverso: nota alta = proteção
        "D1": _faixa_afastamentos(linha["Mental Health Absences"]),
        "E1": eap,  # bloco reverso
    }


def carregar(caminho_csv: Path, reset: bool = False) -> dict[str, Any]:
    """Lê o CSV e popula empresa, GHEs, coleta e respostas. Devolve o resumo."""
    conexao = conectar()
    criar_schema(conexao)

    if reset:
        antiga = buscar_um(
            conexao, "SELECT id FROM coleta WHERE token_publico = ?", (TOKEN_COLETA,)
        )
        if antiga:
            executar(conexao, "DELETE FROM coleta WHERE id = ?", (antiga["id"],))
            logger.info("carga anterior removida")

    carregar_instrumento(INSTRUMENTO)  # falha cedo se o JSON não existir

    empresa = buscar_um(
        conexao, "SELECT id FROM empresa WHERE cnpj = ?", ("00.000.000/0002-00",)
    )
    if empresa:
        empresa_id = empresa["id"]
    else:
        empresa_id = uuid.uuid4().hex
        executar(
            conexao,
            "INSERT INTO empresa (id, razao_social, cnpj, plano) VALUES (?,?,?,?)",
            (
                empresa_id,
                "Healthcare Workforce (dataset público — teste)",
                "00.000.000/0002-00",
                "enterprise",
            ),
        )
        executar(
            conexao,
            "INSERT INTO usuario_empresa (id, empresa_id, nome, email, senha_hash, "
            "papel) VALUES (?,?,?,?,?,?)",
            (
                uuid.uuid4().hex,
                empresa_id,
                "Gestor de teste (HCP)",
                "gestor@hcp.psyra.ai",
                gerar_hash_senha("psyra123"),
                "gestor",
            ),
        )

    with caminho_csv.open(encoding="utf-8-sig", newline="") as arquivo:
        linhas = list(csv.DictReader(arquivo))
    logger.info("CSV lido: %d linhas", len(linhas))

    # GHE = Department. Employee Type determina Department 1:1, então usar os
    # dois criaria grupos duplicados; o tipo entra só no nome do grupo.
    nomes_ghe: dict[str, str] = {}
    for linha in linhas:
        nomes_ghe.setdefault(linha["Department"].strip(), linha["Employee Type"].strip())

    ghe_ids: dict[str, str] = {}
    for indice, (departamento, tipo) in enumerate(sorted(nomes_ghe.items()), start=1):
        codigo = f"HCP-{indice:02d}"
        existente = buscar_um(
            conexao,
            "SELECT id FROM ghe WHERE empresa_id = ? AND codigo = ?",
            (empresa_id, codigo),
        )
        if existente:
            ghe_ids[departamento] = existente["id"]
            continue
        ghe_id = uuid.uuid4().hex
        ghe_ids[departamento] = ghe_id
        executar(
            conexao,
            "INSERT INTO ghe (id, empresa_id, codigo, nome, setor, efetivo) "
            "VALUES (?,?,?,?,?,?)",
            (ghe_id, empresa_id, codigo, departamento, tipo, 0),
        )

    coleta_id = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO coleta (id, empresa_id, titulo, instrumento, origem_dados, "
        "token_publico, status) VALUES (?,?,?,?,?,?, 'encerrada')",
        (
            coleta_id,
            empresa_id,
            "Healthcare Workforce — carga de teste de pipeline",
            INSTRUMENTO,
            "teste",
            TOKEN_COLETA,
        ),
    )

    carregadas = 0
    rejeitadas: list[str] = []
    for numero, linha in enumerate(linhas, start=2):
        try:
            likert = mapear_linha(linha)
            calcular_indice_likert(likert, INSTRUMENTO)  # valida contra o instrumento
        except (ValueError, KeyError) as erro:
            rejeitadas.append(f"linha {numero}: {erro}")
            continue

        executar(
            conexao,
            "INSERT INTO resposta (id, coleta_id, ghe_id, likert_json, "
            "texto_anonimizado, anonimizacao_ok, motor_anonimizacao, protocolo) "
            "VALUES (?,?,?,?, NULL, 0, 'nao-aplicavel', ?)",
            (
                uuid.uuid4().hex,
                coleta_id,
                ghe_ids[linha["Department"].strip()],
                json.dumps(likert, separators=(",", ":")),
                secrets.token_hex(4).upper(),
            ),
        )
        carregadas += 1

    executar(
        conexao,
        "UPDATE ghe SET efetivo = (SELECT COUNT(*) FROM resposta r WHERE r.ghe_id = "
        "ghe.id) WHERE empresa_id = ?",
        (empresa_id,),
    )
    conexao.close()

    resumo = {
        "empresa_id": empresa_id,
        "coleta_id": coleta_id,
        "linhas_csv": len(linhas),
        "carregadas": carregadas,
        "rejeitadas": len(rejeitadas),
        "ghes": len(ghe_ids),
    }
    logger.info("carga concluída: %s", resumo)
    for falha in rejeitadas[:10]:
        logger.warning("rejeitada — %s", falha)
    return resumo


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL do dataset Healthcare Workforce")
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--reset", action="store_true")
    argumentos = parser.parse_args()
    carregar(argumentos.csv, reset=argumentos.reset)
