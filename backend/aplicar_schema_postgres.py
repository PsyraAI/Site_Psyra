"""Aplica schema_psyra_supabase.sql no Postgres apontado por PSYRA_DATABASE_URL."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import config  # noqa: E402
from app.db import conectar, criar_schema  # noqa: E402


def main() -> None:
    if not config.usa_postgres:
        raise SystemExit(
            "Defina PSYRA_DATABASE_URL=postgresql://... (connection string do Supabase) "
            "antes de aplicar o schema."
        )
    conexao = conectar()
    try:
        criar_schema(conexao)
        print("schema Postgres/Supabase aplicado com sucesso")
    finally:
        conexao.close()


if __name__ == "__main__":
    main()
