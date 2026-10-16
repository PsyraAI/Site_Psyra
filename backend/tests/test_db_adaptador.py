"""Testes do adaptador SQL SQLite → Postgres e do parser de schema."""

from __future__ import annotations

import sqlite3

from app.db import CAMINHO_SCHEMA_PG, _partir_sql, adaptar_sql_para_teste, criar_schema


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
    # o schema passou a recriar a view com DROP + CREATE (13/10); as duas formas valem
    assert any(
        "CREATE OR REPLACE VIEW vw_painel_ghe" in p or "CREATE VIEW vw_painel_ghe" in p
        for p in partes
    )
    assert CAMINHO_SCHEMA_PG.exists()


def test_banco_antigo_recebe_colunas_antes_da_view(tmp_path):
    """Banco de produção anterior não tem n_excluidas; a view não pode nascer antes."""
    conexao = sqlite3.connect(tmp_path / "antigo.db")
    conexao.row_factory = sqlite3.Row
    conexao.executescript(
        """
        CREATE TABLE empresa (
            id TEXT PRIMARY KEY, razao_social TEXT, cnpj TEXT, plano TEXT, ativo INTEGER
        );
        CREATE TABLE usuario_empresa (
            id TEXT PRIMARY KEY, empresa_id TEXT, nome TEXT, email TEXT,
            senha_hash TEXT, papel TEXT, ativo INTEGER
        );
        CREATE TABLE resultado_ghe (
            id TEXT PRIMARY KEY, coleta_id TEXT, ghe_id TEXT,
            n_respostas INTEGER, indice_likert REAL, indice_texto REAL,
            divergencia REAL, nivel_risco TEXT, fatores_json TEXT,
            motor_versao TEXT, calculado_em TEXT
        );
        """
    )
    conexao.commit()
    criar_schema(conexao)
    colunas_usuario = {
        linha["name"] for linha in conexao.execute("PRAGMA table_info(usuario_empresa)")
    }
    colunas_resultado = {
        linha["name"] for linha in conexao.execute("PRAGMA table_info(resultado_ghe)")
    }
    assert {"sessao_versao", "trocar_senha", "ultimo_acesso_em"} <= colunas_usuario
    assert "n_excluidas" in colunas_resultado
    conexao.execute("SELECT n_excluidas, mascarado FROM vw_painel_ghe").fetchall()
    conexao.close()
