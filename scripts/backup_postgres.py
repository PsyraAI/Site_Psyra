"""Gera dump lógico do Postgres/Supabase apontado por PSYRA_DATABASE_URL."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "backend"))

from app.config import config  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--saida",
        type=Path,
        default=RAIZ
        / "backups"
        / f"psyra_{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}.sql",
    )
    args = parser.parse_args()
    if not config.usa_postgres:
        raise SystemExit("PSYRA_DATABASE_URL Postgres é obrigatória para backup.")
    if shutil.which("pg_dump") is None:
        raise SystemExit(
            "pg_dump não encontrado. Instale o cliente PostgreSQL e tente novamente."
        )

    parsed = urlparse(config.DATABASE_URL)
    ambiente = os.environ.copy()
    if parsed.password:
        ambiente["PGPASSWORD"] = parsed.password
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    comando = [
        "pg_dump",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--dbname",
        config.DATABASE_URL,
        "--file",
        str(args.saida),
    ]
    subprocess.run(comando, check=True, env=ambiente)
    print(f"Backup gravado em {args.saida}")


if __name__ == "__main__":
    main()
