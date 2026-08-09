"""Cria o primeiro superadmin usando variáveis efêmeras do ambiente."""

from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.db import buscar_um, conectar, criar_schema, executar  # noqa: E402
from app.security import gerar_hash_senha  # noqa: E402


def main() -> None:
    email = os.getenv("PSYRA_BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
    senha = os.getenv("PSYRA_BOOTSTRAP_ADMIN_PASSWORD", "")
    nome = os.getenv("PSYRA_BOOTSTRAP_ADMIN_NAME", "Administrador Psyra").strip()
    if not email or "@" not in email:
        raise SystemExit("Defina PSYRA_BOOTSTRAP_ADMIN_EMAIL com um e-mail válido.")
    if len(senha) < 12:
        raise SystemExit("PSYRA_BOOTSTRAP_ADMIN_PASSWORD deve ter ao menos 12 caracteres.")

    conexao = conectar()
    try:
        criar_schema(conexao)
        if buscar_um(conexao, "SELECT id FROM superadmin WHERE email = ?", (email,)):
            raise SystemExit("Superadmin já existe; nenhuma alteração realizada.")
        executar(
            conexao,
            "INSERT INTO superadmin (id, nome, email, senha_hash, ativo) "
            "VALUES (?,?,?,?,1)",
            (uuid.uuid4().hex, nome, email, gerar_hash_senha(senha)),
        )
        print("Superadmin criado. Remova as variáveis PSYRA_BOOTSTRAP_ADMIN_*.")
    finally:
        conexao.close()


if __name__ == "__main__":
    main()
