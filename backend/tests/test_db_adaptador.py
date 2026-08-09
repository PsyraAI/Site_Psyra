"""Testes do adaptador SQL SQLite → Postgres e do parser de schema."""

from __future__ import annotations

from app.db import CAMINHO_SCHEMA_PG, _partir_sql, adaptar_sql_para_teste


def test_placeholders_e_datetime():
    sql = (
        "INSERT INTO resultado_ghe (id, calculado_em) VALUES (?, datetime('now')) "
        "ON CONFLICT(coleta_id, ghe_id) DO UPDATE SET calculado_em=datetime('now')"
    )
    adaptado = adaptar_sql_para_teste(sql, "postgres")
    assert "?" not in adaptado
    assert "%s" in adaptado
    assert "NOW()" in adaptado
    assert "datetime(" not in adaptado.lower()
    assert "ON CONFLICT (" in adaptado


def test_schema_postgres_particiona():
    script = CAMINHO_SCHEMA_PG.read_text(encoding="utf-8")
    partes = _partir_sql(script)
    assert len(partes) >= 10
    assert any("CREATE TABLE IF NOT EXISTS empresa" in p for p in partes)
    assert any("CREATE OR REPLACE VIEW vw_painel_ghe" in p for p in partes)
    assert CAMINHO_SCHEMA_PG.exists()
