"""Migra dados do SQLite local para Postgres/Supabase. Sprint: S6.

Lê todas as tabelas do PSYRA_DB (SQLite) e reinsere em PSYRA_DATABASE_URL.
Aplica o schema Postgres antes. Ordem respeita FKs.

Uso:
    set PSYRA_DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
    python migrar_para_postgres.py
    python migrar_para_postgres.py --sqlite ./psyra.db
"""

from __future__ import annotations

import argparse
import logging
import sqlite3
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import config  # noqa: E402
from app.db import conectar, criar_schema, executar  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("migrar-pg")

TABELAS = [
    "empresa",
    "usuario_empresa",
    "ghe",
    "coleta",
    "resposta",
    "resultado_ghe",
    "log_auditoria",
]


def _ler_sqlite(caminho: Path) -> dict[str, list[dict[str, Any]]]:
    conexao = sqlite3.connect(caminho)
    conexao.row_factory = sqlite3.Row
    dados: dict[str, list[dict[str, Any]]] = {}
    for tabela in TABELAS:
        linhas = conexao.execute(f"SELECT * FROM {tabela}").fetchall()
        dados[tabela] = [dict(linha) for linha in linhas]
        logger.info("SQLite %s: %d linhas", tabela, len(dados[tabela]))
    conexao.close()
    return dados


def _inserir(conexao: Any, tabela: str, linhas: list[dict[str, Any]]) -> int:
    if not linhas:
        return 0
    colunas = list(linhas[0].keys())
    placeholders = ",".join("?" for _ in colunas)
    nomes = ",".join(colunas)
    sql = f"INSERT INTO {tabela} ({nomes}) VALUES ({placeholders})"
    # Postgres: ON CONFLICT DO NOTHING para reexecução idempotente
    if config.usa_postgres:
        sql += " ON CONFLICT DO NOTHING"
    contagem = 0
    for linha in linhas:
        valores = tuple(linha[c] for c in colunas)
        executar(conexao, sql, valores)
        contagem += 1
    return contagem


def migrar(caminho_sqlite: Path, *, dry_run: bool = False) -> dict[str, int]:
    if not dry_run and not config.usa_postgres:
        raise SystemExit("PSYRA_DATABASE_URL (postgresql://...) é obrigatória para migrar.")
    if not caminho_sqlite.exists():
        raise SystemExit(f"SQLite não encontrado: {caminho_sqlite}")

    dados = _ler_sqlite(caminho_sqlite)
    if dry_run:
        from app.db import adaptar_sql_para_teste

        total = 0
        for tabela, linhas in dados.items():
            if not linhas:
                continue
            colunas = list(linhas[0].keys())
            placeholders = ",".join("?" for _ in colunas)
            sql = f"INSERT INTO {tabela} ({','.join(colunas)}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
            adaptado = adaptar_sql_para_teste(sql, "postgres")
            assert "%s" in adaptado and "?" not in adaptado
            total += len(linhas)
        logger.info("dry-run OK: %d linhas prontas para Postgres", total)
        return {t: len(v) for t, v in dados.items()}

    destino = conectar()
    try:
        criar_schema(destino)
        resumo: dict[str, int] = {}
        for tabela in TABELAS:
            resumo[tabela] = _inserir(destino, tabela, dados[tabela])
            logger.info("Postgres %s: %d inseridas", tabela, resumo[tabela])
        return resumo
    finally:
        destino.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migra SQLite → Postgres/Supabase")
    parser.add_argument(
        "--sqlite",
        type=Path,
        default=Path(config.BANCO_URL),
        help="Caminho do psyra.db de origem",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Só lê o SQLite e valida o SQL adaptado (sem conectar no Postgres)",
    )
    args = parser.parse_args()
    print(migrar(args.sqlite, dry_run=args.dry_run))
