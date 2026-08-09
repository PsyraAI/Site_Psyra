"""Restaura um dump SQL no Postgres/Supabase apontado por PSYRA_DATABASE_URL."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "backend"))

from app.config import config  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "arquivo", type=Path, help="dump .sql gerado por backup_postgres.py"
    )
    parser.add_argument(
        "--confirmar",
        action="store_true",
        help="obrigatório; evita restauração acidental",
    )
    args = parser.parse_args()
    if not args.confirmar:
        raise SystemExit("Passe --confirmar para restaurar (operação destrutiva).")
    if not args.arquivo.is_file():
        raise SystemExit(f"arquivo inexistente: {args.arquivo}")
    if not config.usa_postgres:
        raise SystemExit("PSYRA_DATABASE_URL Postgres é obrigatória para restore.")
    if shutil.which("psql") is None:
        raise SystemExit("psql não encontrado. Instale o cliente PostgreSQL.")

    parsed = urlparse(config.DATABASE_URL)
    ambiente = os.environ.copy()
    if parsed.password:
        ambiente["PGPASSWORD"] = parsed.password
    comando = [
        "psql",
        "--dbname",
        config.DATABASE_URL,
        "--file",
        str(args.arquivo),
        "--set",
        "ON_ERROR_STOP=1",
    ]
    subprocess.run(comando, check=True, env=ambiente)
    print(f"Restore concluído a partir de {args.arquivo}")


if __name__ == "__main__":
    main()
