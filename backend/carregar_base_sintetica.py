"""Carga da base sintética no schema Psyra. Sprint: S6 | Risco: R1 + R2.

Diferente do ETL do dataset externo, esta carga passa o Bloco K pelo
`anonimizador.anonimizar()` de verdade — é o primeiro caminho do projeto que
exercita a anonimização em volume. Texto que falha na anonimização é rejeitado
e contado, nunca gravado cru.

O gabarito (θ verdadeiro) NÃO é lido aqui de propósito: se ele entrasse no
banco junto das respostas, viraria leakage no primeiro treino.

Uso:
    python carregar_base_sintetica.py --csv ./base_sintetica/..._respostas_v1.csv
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

from app.anonimizador import FalhaAnonimizacao, anonimizar  # noqa: E402
from app.db import buscar_um, conectar, criar_schema, executar  # noqa: E402
from app.scoring import calcular_indice_likert  # noqa: E402
from app.security import gerar_hash_senha  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("carga-sintetica")

CNPJ = "00.000.000/0003-00"
TOKEN = "sintetico-nr1-2026"
FIXAS = {"id_sintetico", "ghe_codigo", "ghe_nome", "setor", "texto_livre"}


def carregar(
    caminho_csv: Path, instrumento: str = "nr1_v2_demo", reset: bool = False
) -> dict[str, Any]:
    """Lê o CSV de respostas sintéticas e popula empresa, GHEs, coleta e respostas."""
    conexao = conectar()
    criar_schema(conexao)

    if reset:
        antiga = buscar_um(
            conexao, "SELECT id FROM coleta WHERE token_publico = ?", (TOKEN,)
        )
        if antiga:
            executar(conexao, "DELETE FROM coleta WHERE id = ?", (antiga["id"],))

    empresa = buscar_um(conexao, "SELECT id FROM empresa WHERE cnpj = ?", (CNPJ,))
    if empresa:
        empresa_id = empresa["id"]
    else:
        empresa_id = uuid.uuid4().hex
        executar(
            conexao,
            "INSERT INTO empresa (id, razao_social, cnpj, plano) VALUES (?,?,?,?)",
            (empresa_id, "Empresa Sintética NR-1 (teste)", CNPJ, "enterprise"),
        )
        executar(
            conexao,
            "INSERT INTO usuario_empresa (id, empresa_id, nome, email, senha_hash, "
            "papel) VALUES (?,?,?,?,?,?)",
            (
                uuid.uuid4().hex,
                empresa_id,
                "Gestor sintético",
                "gestor@sintetico.psyra.ai",
                gerar_hash_senha("psyra123"),
                "gestor",
            ),
        )

    with caminho_csv.open(encoding="utf-8-sig", newline="") as arquivo:
        linhas = list(csv.DictReader(arquivo))
    logger.info("CSV lido: %d linhas", len(linhas))

    ghe_ids: dict[str, str] = {}
    for linha in linhas:
        codigo = linha["ghe_codigo"]
        if codigo in ghe_ids:
            continue
        existente = buscar_um(
            conexao,
            "SELECT id FROM ghe WHERE empresa_id = ? AND codigo = ?",
            (empresa_id, codigo),
        )
        if existente:
            ghe_ids[codigo] = existente["id"]
            continue
        novo = uuid.uuid4().hex
        ghe_ids[codigo] = novo
        executar(
            conexao,
            "INSERT INTO ghe (id, empresa_id, codigo, nome, setor, efetivo) "
            "VALUES (?,?,?,?,?,0)",
            (novo, empresa_id, codigo, linha["ghe_nome"], linha["setor"]),
        )

    coleta_id = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO coleta (id, empresa_id, titulo, instrumento, origem_dados, "
        "token_publico, status) VALUES (?,?,?,?, 'sintetico', ?, 'encerrada')",
        (
            coleta_id,
            empresa_id,
            "Base sintética NR-1 — teste de pipeline",
            instrumento,
            TOKEN,
        ),
    )

    carregadas = 0
    sem_texto = 0
    rejeitadas = 0
    for linha in linhas:
        itens = {
            chave: int(valor)
            for chave, valor in linha.items()
            if chave not in FIXAS and valor not in ("", None)
        }
        try:
            calcular_indice_likert(itens, instrumento)
        except ValueError as erro:
            logger.warning("linha %s descartada: %s", linha["id_sintetico"], erro)
            rejeitadas += 1
            continue

        bruto = linha["texto_livre"].strip() or None
        try:
            texto, motor = anonimizar(bruto)
        except FalhaAnonimizacao as erro:
            logger.warning("texto rejeitado (%s): %s", linha["id_sintetico"], erro)
            rejeitadas += 1
            continue
        if texto is None:
            sem_texto += 1

        executar(
            conexao,
            "INSERT INTO resposta (id, coleta_id, ghe_id, likert_json, "
            "texto_anonimizado, anonimizacao_ok, motor_anonimizacao, protocolo) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (
                uuid.uuid4().hex,
                coleta_id,
                ghe_ids[linha["ghe_codigo"]],
                json.dumps(itens, separators=(",", ":")),
                texto,
                1 if texto else 0,
                motor,
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
        "carregadas": carregadas,
        "com_texto": carregadas - sem_texto,
        "rejeitadas": rejeitadas,
        "ghes": len(ghe_ids),
    }
    logger.info("carga concluída: %s", resumo)
    return resumo


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Carga da base sintética Psyra")
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--instrumento", default="nr1_v2_demo")
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    carregar(args.csv, args.instrumento, args.reset)
