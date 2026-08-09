"""Acesso ao banco (SQLite ou Postgres/Supabase). Sprint: S6 | Risco: R2.

Uma conexão por requisição. SQL das rotas usa placeholders `?` (estilo SQLite);
em Postgres eles são traduzidos para `%s` e `datetime('now')` → `NOW()`.
Com `PSYRA_DATABASE_URL` (postgresql://...) a API fala com Supabase/Postgres;
sem isso, usa SQLite em `PSYRA_DB`.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from collections.abc import Iterator
from pathlib import Path
from typing import Any, Protocol

from .config import config

logger = logging.getLogger(__name__)
CAMINHO_SCHEMA_SQLITE: Path = Path(__file__).resolve().parent / "schema_sqlite.sql"
CAMINHO_SCHEMA_PG: Path = Path(__file__).resolve().parent / "schema_psyra_supabase.sql"

_DRIVER = "postgres" if config.usa_postgres else "sqlite"


class ConexaoDB(Protocol):
    def close(self) -> None: ...


def _adaptar_sql(sql: str) -> str:
    """Traduz dialeto SQLite usado nas rotas para o motor ativo."""
    if _DRIVER == "sqlite":
        return sql
    # datetime('now') / datetime("now") → NOW()
    adaptado = re.sub(
        r"datetime\(\s*['\"]now['\"]\s*\)", "NOW()", sql, flags=re.IGNORECASE
    )
    # ON CONFLICT(col) → ON CONFLICT (col)  (Postgres exige parênteses com espaço ok)
    adaptado = re.sub(
        r"ON CONFLICT\s*\(",
        "ON CONFLICT (",
        adaptado,
        flags=re.IGNORECASE,
    )
    # excluded.col funciona nos dois; placeholders ? → %s
    # Substitui ? fora de strings; o SQL das rotas não embute ? em literais.
    partes: list[str] = []
    i = 0
    while i < len(adaptado):
        ch = adaptado[i]
        if ch in ("'", '"'):
            fim = adaptado.find(ch, i + 1)
            while fim != -1 and adaptado[fim - 1] == "\\":
                fim = adaptado.find(ch, fim + 1)
            if fim == -1:
                partes.append(adaptado[i:])
                break
            partes.append(adaptado[i : fim + 1])
            i = fim + 1
            continue
        if ch == "?":
            partes.append("%s")
            i += 1
            continue
        partes.append(ch)
        i += 1
    return "".join(partes)


class _CursorPg:
    """Cursor fino que devolve rows como dict-like (compatível com sqlite3.Row)."""

    def __init__(self, cursor: Any) -> None:
        self._cursor = cursor

    def fetchone(self) -> dict[str, Any] | None:
        linha = self._cursor.fetchone()
        if linha is None:
            return None
        return dict(linha)

    def fetchall(self) -> list[dict[str, Any]]:
        return [dict(linha) for linha in self._cursor.fetchall()]


def _partir_sql(script: str) -> list[str]:
    """Divide script em statements por `;` fora de strings."""
    statements: list[str] = []
    atual: list[str] = []
    em_aspas: str | None = None
    i = 0
    while i < len(script):
        ch = script[i]
        if em_aspas:
            atual.append(ch)
            if ch == em_aspas and script[i - 1] != "\\":
                em_aspas = None
            i += 1
            continue
        if ch in ("'", '"'):
            em_aspas = ch
            atual.append(ch)
            i += 1
            continue
        if ch == "-" and i + 1 < len(script) and script[i + 1] == "-":
            while i < len(script) and script[i] not in "\r\n":
                i += 1
            continue
        if ch == ";":
            texto = "".join(atual).strip()
            if texto:
                statements.append(texto)
            atual = []
            i += 1
            continue
        atual.append(ch)
        i += 1
    texto = "".join(atual).strip()
    if texto:
        statements.append(texto)
    return statements


class _ConexaoPg:
    """Wrapper psycopg que aceita SQL com `?` e expõe API próxima ao sqlite3."""

    def __init__(self, conexao: Any) -> None:
        self._conexao = conexao

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> _CursorPg:
        cursor = self._conexao.execute(_adaptar_sql(sql), params)
        return _CursorPg(cursor)

    def executescript(self, script: str) -> None:
        """Executa script multi-statement (schema). Ignora vazios e comentários soltos."""
        for trecho in _partir_sql(script):
            self._conexao.execute(trecho)
        self._conexao.commit()

    def commit(self) -> None:
        self._conexao.commit()

    def rollback(self) -> None:
        self._conexao.rollback()

    def close(self) -> None:
        self._conexao.close()


def conectar(caminho: str | None = None) -> Any:
    """Abre conexão SQLite ou Postgres conforme configuração."""
    if config.usa_postgres:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as erro:
            raise RuntimeError(
                "PSYRA_DATABASE_URL definida, mas psycopg não está instalado. "
                "pip install 'psycopg[binary]'"
            ) from erro
        try:
            raw = psycopg.connect(config.DATABASE_URL, row_factory=dict_row)
            logger.info("conectado ao Postgres/Supabase")
            return _ConexaoPg(raw)
        except Exception as erro:
            logger.error("falha ao conectar no Postgres: %s", erro)
            raise

    destino = caminho or config.BANCO_URL
    try:
        conexao = sqlite3.connect(destino, check_same_thread=False)
        conexao.row_factory = sqlite3.Row
        conexao.execute("PRAGMA foreign_keys = ON")
        return conexao
    except sqlite3.Error as erro:
        logger.error("falha ao conectar no banco %s: %s", destino, erro)
        raise


def _migrar_integracao_forms(conexao: Any) -> None:
    """Adiciona campos da integração Forms sem recriar bancos existentes."""
    colunas_coleta = {
        "google_form_id": "TEXT",
        "google_form_url": "TEXT",
        "google_form_ativo": "INTEGER NOT NULL DEFAULT 0",
        "google_form_atualizado_em": "TEXT",
        "google_form_ultima_resposta_em": "TEXT",
    }
    colunas_resposta = {
        "origem_externa": "TEXT",
        "id_externo": "TEXT",
    }

    if _DRIVER == "postgres":
        tipos_pg = {
            **colunas_coleta,
            "google_form_atualizado_em": "TIMESTAMPTZ",
            "google_form_ultima_resposta_em": "TIMESTAMPTZ",
        }
        for nome, tipo in tipos_pg.items():
            conexao.execute(f"ALTER TABLE coleta ADD COLUMN IF NOT EXISTS {nome} {tipo}")
        for nome, tipo in colunas_resposta.items():
            conexao.execute(
                f"ALTER TABLE resposta ADD COLUMN IF NOT EXISTS {nome} {tipo}"
            )
    else:
        existentes_coleta = {
            linha["name"]
            for linha in conexao.execute("PRAGMA table_info(coleta)").fetchall()
        }
        existentes_resposta = {
            linha["name"]
            for linha in conexao.execute("PRAGMA table_info(resposta)").fetchall()
        }
        for nome, tipo in colunas_coleta.items():
            if nome not in existentes_coleta:
                conexao.execute(f"ALTER TABLE coleta ADD COLUMN {nome} {tipo}")
        for nome, tipo in colunas_resposta.items():
            if nome not in existentes_resposta:
                conexao.execute(f"ALTER TABLE resposta ADD COLUMN {nome} {tipo}")

    conexao.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_coleta_google_form "
        "ON coleta(google_form_id) WHERE google_form_id IS NOT NULL"
    )
    conexao.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_resposta_origem_externa "
        "ON resposta(coleta_id, origem_externa, id_externo) "
        "WHERE id_externo IS NOT NULL"
    )
    conexao.commit()


def _migrar_operacao_producao(conexao: Any) -> None:
    """Adiciona controles administrativos sem destruir bancos existentes."""
    if _DRIVER == "postgres":
        conexao.execute(
            "ALTER TABLE empresa ADD COLUMN IF NOT EXISTS "
            "ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))"
        )
    else:
        colunas = {
            linha["name"]
            for linha in conexao.execute("PRAGMA table_info(empresa)").fetchall()
        }
        if "ativo" not in colunas:
            conexao.execute(
                "ALTER TABLE empresa ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1 "
                "CHECK (ativo IN (0, 1))"
            )
    conexao.commit()


def _recriar_view_painel(conexao: Any) -> None:
    """Mantém o limiar SQL sincronizado com PSYRA_N_MINIMO."""
    n = int(config.N_MINIMO_GHE)
    if _DRIVER == "sqlite":
        conexao.execute("DROP VIEW IF EXISTS vw_painel_ghe")
        prefixo = "CREATE VIEW vw_painel_ghe AS"
    else:
        prefixo = "CREATE OR REPLACE VIEW vw_painel_ghe AS"
    conexao.execute(
        f"""
        {prefixo}
        SELECT
            r.coleta_id AS coleta_id,
            c.empresa_id AS empresa_id,
            g.codigo AS ghe_codigo,
            g.nome AS ghe_nome,
            g.setor AS ghe_setor,
            r.n_respostas AS n_respostas,
            CASE WHEN r.n_respostas >= {n} THEN r.indice_likert END AS indice_likert,
            CASE WHEN r.n_respostas >= {n} THEN r.indice_texto END AS indice_texto,
            CASE WHEN r.n_respostas >= {n} THEN r.divergencia END AS divergencia,
            CASE WHEN r.n_respostas >= {n} THEN r.nivel_risco END AS nivel_risco,
            CASE WHEN r.n_respostas >= {n} THEN r.fatores_json END AS fatores_json,
            CASE WHEN r.n_respostas >= {n} THEN 0 ELSE 1 END AS mascarado,
            r.motor_versao AS motor_versao
        FROM resultado_ghe r
        JOIN ghe g ON g.id = r.ghe_id
        JOIN coleta c ON c.id = r.coleta_id
        """
    )
    conexao.commit()


def criar_schema(conexao: Any) -> None:
    """Cria tabelas, índices e a view agregada (idempotente)."""
    try:
        if config.usa_postgres:
            script = CAMINHO_SCHEMA_PG.read_text(encoding="utf-8")
            conexao.executescript(script)
        else:
            conexao.executescript(CAMINHO_SCHEMA_SQLITE.read_text(encoding="utf-8"))
            conexao.commit()
        _migrar_operacao_producao(conexao)
        _migrar_integracao_forms(conexao)
        _recriar_view_painel(conexao)
        logger.info("schema aplicado (%s)", _DRIVER)
    except Exception as erro:
        logger.error("falha ao aplicar schema: %s", erro)
        raise


def obter_conexao() -> Iterator[Any]:
    """Dependência FastAPI: entrega conexão e garante o fechamento."""
    conexao = conectar()
    try:
        yield conexao
    finally:
        conexao.close()


def buscar_um(
    conexao: Any, sql: str, params: tuple[Any, ...] = ()
) -> dict[str, Any] | None:
    """Executa SELECT e devolve a primeira linha como dict (ou None)."""
    linha = conexao.execute(sql, params).fetchone()
    if linha is None:
        return None
    return dict(linha)


def buscar_todos(
    conexao: Any, sql: str, params: tuple[Any, ...] = ()
) -> list[dict[str, Any]]:
    """Executa SELECT e devolve todas as linhas como lista de dicts."""
    return [dict(linha) for linha in conexao.execute(sql, params).fetchall()]


def executar(conexao: Any, sql: str, params: tuple[Any, ...] = ()) -> None:
    """Executa INSERT/UPDATE/DELETE com commit e log de falha."""
    try:
        conexao.execute(sql, params)
        conexao.commit()
    except Exception as erro:
        conexao.rollback()
        logger.error("falha ao executar SQL: %s", erro)
        raise


def adaptar_sql_para_teste(sql: str, driver: str = "postgres") -> str:
    """Exposto para testes do adaptador de dialeto."""
    global _DRIVER
    anterior = _DRIVER
    try:
        _DRIVER = driver
        return _adaptar_sql(sql)
    finally:
        _DRIVER = anterior
