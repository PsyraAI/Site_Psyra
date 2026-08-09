"""Valida carga Forms → painel (SQLite) e prepara checagem Postgres.

Uso:
    python validar_pipeline_forms_supabase.py
    set PSYRA_DATABASE_URL=postgresql://... && python validar_pipeline_forms_supabase.py --postgres
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gerar_csv_forms_amostra import gerar  # noqa: E402
from carregar_respostas_forms import carregar  # noqa: E402
from app.config import config  # noqa: E402
from app.db import buscar_todos, buscar_um, conectar, criar_schema  # noqa: E402
from app.db import adaptar_sql_para_teste, _partir_sql, CAMINHO_SCHEMA_PG  # noqa: E402


def validar_sqlite() -> dict:
    csv_path = Path("data/amostra_forms_respostas.csv")
    gerar(csv_path, n=30)
    # Vincula à empresa demo se existir; senão cria empresa Forms.
    email = None
    conexao = conectar()
    criar_schema(conexao)
    demo = buscar_um(
        conexao, "SELECT email FROM usuario_empresa WHERE email = ?", ("gestor@demo.psyra.ai",)
    )
    conexao.close()
    if demo:
        email = "gestor@demo.psyra.ai"

    resumo = carregar(csv_path, email_gestor=email, reset=True)
    assert resumo["carregadas"] >= 20, resumo

    conexao = conectar()
    try:
        n = buscar_um(
            conexao,
            "SELECT COUNT(*) AS n FROM resposta WHERE coleta_id = ?",
            (resumo["coleta_id"],),
        )
        assert n and int(n["n"]) == resumo["carregadas"]

        # Simula o recalculo do painel: deve haver respostas por GHE
        por_ghe = buscar_todos(
            conexao,
            "SELECT ghe_id, COUNT(*) AS n FROM resposta WHERE coleta_id = ? GROUP BY ghe_id",
            (resumo["coleta_id"],),
        )
        assert por_ghe, "nenhum GHE na coleta Forms"
        print("OK Forms->SQLite:", json.dumps(resumo, ensure_ascii=False))
        print(f"OK GHEs com respostas: {len(por_ghe)}")
        return resumo
    finally:
        conexao.close()


def validar_painel_http(empresa_id: str, coleta_id: str) -> None:
    """Chama o endpoint do painel via TestClient (recalcula resultado_ghe)."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.security import gerar_hash_senha  # noqa: F401
    from app.db import buscar_um, conectar

    conexao = conectar()
    usuario = buscar_um(
        conexao,
        "SELECT email FROM usuario_empresa WHERE empresa_id = ? LIMIT 1",
        (empresa_id,),
    )
    conexao.close()
    assert usuario
    cliente = TestClient(app)
    login = cliente.post(
        "/v1/auth/login",
        json={"email": usuario["email"], "senha": "psyra123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    painel = cliente.get(
        f"/v1/empresas/{empresa_id}/coletas/{coleta_id}/painel",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert painel.status_code == 200, painel.text
    corpo = painel.json()
    assert "grupos" in corpo or "resumo" in corpo or "coleta" in corpo
    print("OK Painel HTTP status", painel.status_code, "| chaves:", list(corpo.keys())[:8])


def validar_adaptador_postgres() -> None:
    script = CAMINHO_SCHEMA_PG.read_text(encoding="utf-8")
    partes = _partir_sql(script)
    assert len(partes) >= 10
    sql = adaptar_sql_para_teste(
        "SELECT * FROM coleta WHERE id = ? AND empresa_id = ?", "postgres"
    )
    assert sql.count("%s") == 2
    print(f"OK adaptador Postgres: {len(partes)} statements no schema")


def validar_postgres_vivo() -> None:
    if not config.usa_postgres:
        raise SystemExit("PSYRA_DATABASE_URL não definida")
    from aplicar_schema_postgres import main as aplicar

    aplicar()
    from migrar_para_postgres import migrar

    resumo = migrar(Path(config.BANCO_URL))
    print("OK migração → Postgres:", resumo)
    conexao = conectar()
    try:
        empresas = buscar_um(conexao, "SELECT COUNT(*) AS n FROM empresa", ())
        assert empresas and int(empresas["n"]) >= 1
        print("OK Postgres vivo: empresas =", empresas["n"])
    finally:
        conexao.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--postgres",
        action="store_true",
        help="Aplica schema e migra SQLite→Postgres (exige PSYRA_DATABASE_URL)",
    )
    args = parser.parse_args()
    validar_adaptador_postgres()
    resumo = validar_sqlite()
    validar_painel_http(resumo["empresa_id"], resumo["coleta_id"])
    if args.postgres:
        validar_postgres_vivo()
    else:
        print(
            "Postgres: schema e migrador prontos. "
            "Defina PSYRA_DATABASE_URL e rode com --postgres para validar no Supabase."
        )
