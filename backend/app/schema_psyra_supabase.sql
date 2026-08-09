-- Psyra AI — schema Postgres/Supabase (espelho de schema_sqlite.sql)
-- Sprint: S6 | Risco: R2 (LGPD) — nenhuma coluna de PII de colaborador.
-- Aplicar no SQL Editor do Supabase (ou: python aplicar_schema_postgres.py).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) empresa ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresa (
    id           TEXT PRIMARY KEY,
    razao_social TEXT NOT NULL,
    cnpj         TEXT UNIQUE NOT NULL,
    plano        TEXT NOT NULL DEFAULT 'starter'
                 CHECK (plano IN ('starter', 'professional', 'enterprise')),
    ativo        INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) superadmin (operação global Psyra; separado dos tenants) -------------
CREATE TABLE IF NOT EXISTS superadmin (
    id         TEXT PRIMARY KEY,
    nome       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    ativo      INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) usuario_empresa (gestor/RH — NUNCA colaborador respondente) ---------
CREATE TABLE IF NOT EXISTS usuario_empresa (
    id         TEXT PRIMARY KEY,
    empresa_id TEXT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    nome       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    papel      TEXT NOT NULL DEFAULT 'gestor'
               CHECK (papel IN ('gestor', 'admin', 'crp')),
    ativo      INTEGER NOT NULL DEFAULT 1,
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) ghe — Grupo Homogêneo de Exposição (NR-1) ---------------------------
CREATE TABLE IF NOT EXISTS ghe (
    id         TEXT PRIMARY KEY,
    empresa_id TEXT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    codigo     TEXT NOT NULL,
    nome       TEXT NOT NULL,
    setor      TEXT,
    efetivo    INTEGER NOT NULL DEFAULT 0 CHECK (efetivo >= 0),
    UNIQUE (empresa_id, codigo)
);

-- 4) coleta --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coleta (
    id            TEXT PRIMARY KEY,
    empresa_id    TEXT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    titulo        TEXT NOT NULL,
    instrumento   TEXT NOT NULL DEFAULT 'nr1_v2_demo',
    origem_dados  TEXT NOT NULL DEFAULT 'sintetico'
                  CHECK (origem_dados IN ('sintetico', 'teste', 'real')),
    token_publico TEXT UNIQUE NOT NULL,
    status        TEXT NOT NULL DEFAULT 'aberta'
                  CHECK (status IN ('aberta', 'encerrada')),
    aberta_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    encerrada_em  TIMESTAMPTZ,
    google_form_id TEXT,
    google_form_url TEXT,
    google_form_ativo INTEGER NOT NULL DEFAULT 0
                       CHECK (google_form_ativo IN (0, 1)),
    google_form_atualizado_em TIMESTAMPTZ,
    google_form_ultima_resposta_em TIMESTAMPTZ
);

-- 5) resposta — anônima. Sem nome, sem e-mail, sem matrícula. -------------
CREATE TABLE IF NOT EXISTS resposta (
    id                 TEXT PRIMARY KEY,
    coleta_id          TEXT NOT NULL REFERENCES coleta(id) ON DELETE CASCADE,
    ghe_id             TEXT NOT NULL REFERENCES ghe(id) ON DELETE RESTRICT,
    likert_json        TEXT NOT NULL,
    texto_anonimizado  TEXT,
    anonimizacao_ok    INTEGER NOT NULL DEFAULT 0
                       CHECK (anonimizacao_ok IN (0, 1)),
    motor_anonimizacao TEXT,
    protocolo          TEXT UNIQUE NOT NULL,
    recebida_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    origem_externa     TEXT CHECK (origem_externa IN ('google_forms')),
    id_externo         TEXT,
    CHECK (texto_anonimizado IS NULL OR anonimizacao_ok = 1)
);

-- 6) resultado_ghe — agregado calculado (nunca individual) ---------------
CREATE TABLE IF NOT EXISTS resultado_ghe (
    id             TEXT PRIMARY KEY,
    coleta_id      TEXT NOT NULL REFERENCES coleta(id) ON DELETE CASCADE,
    ghe_id         TEXT NOT NULL REFERENCES ghe(id) ON DELETE CASCADE,
    n_respostas    INTEGER NOT NULL CHECK (n_respostas >= 0),
    indice_likert  DOUBLE PRECISION,
    indice_texto   DOUBLE PRECISION,
    divergencia    DOUBLE PRECISION,
    nivel_risco    TEXT CHECK (nivel_risco IN ('baixo', 'moderado', 'alto')),
    fatores_json   TEXT,
    motor_versao   TEXT NOT NULL,
    calculado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (coleta_id, ghe_id)
);

-- 7) log_auditoria — cadeia de hash SHA-256 (LGPD Art. 37) ---------------
CREATE TABLE IF NOT EXISTS log_auditoria (
    id            TEXT PRIMARY KEY,
    empresa_id    TEXT,
    ator          TEXT NOT NULL,
    acao          TEXT NOT NULL,
    entidade      TEXT NOT NULL,
    hash_anterior TEXT NOT NULL,
    hash_atual    TEXT NOT NULL,
    registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resposta_coleta ON resposta(coleta_id);
CREATE INDEX IF NOT EXISTS idx_resposta_ghe    ON resposta(ghe_id);
CREATE INDEX IF NOT EXISTS idx_resultado_coleta ON resultado_ghe(coleta_id);
CREATE INDEX IF NOT EXISTS idx_log_empresa     ON log_auditoria(empresa_id);

-- View de leitura do painel: k-anonimato n>=5 (sem RLS aqui — isolamento na API).
DROP VIEW IF EXISTS vw_painel_ghe;
CREATE VIEW vw_painel_ghe AS
SELECT
    r.coleta_id                                   AS coleta_id,
    c.empresa_id                                  AS empresa_id,
    g.codigo                                      AS ghe_codigo,
    g.nome                                        AS ghe_nome,
    g.setor                                       AS ghe_setor,
    r.n_respostas                                 AS n_respostas,
    CASE WHEN r.n_respostas >= 5 THEN r.indice_likert END AS indice_likert,
    CASE WHEN r.n_respostas >= 5 THEN r.indice_texto  END AS indice_texto,
    CASE WHEN r.n_respostas >= 5 THEN r.divergencia   END AS divergencia,
    CASE WHEN r.n_respostas >= 5 THEN r.nivel_risco   END AS nivel_risco,
    CASE WHEN r.n_respostas >= 5 THEN r.fatores_json  END AS fatores_json,
    CASE WHEN r.n_respostas >= 5 THEN 0 ELSE 1 END AS mascarado,
    r.motor_versao                                AS motor_versao
FROM resultado_ghe r
JOIN ghe g ON g.id = r.ghe_id
JOIN coleta c ON c.id = r.coleta_id;

-- RLS básico (ativa no Supabase; service_role do backend ignora RLS).
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmin ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghe ENABLE ROW LEVEL SECURITY;
ALTER TABLE coleta ENABLE ROW LEVEL SECURITY;
ALTER TABLE resposta ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultado_ghe ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_auditoria ENABLE ROW LEVEL SECURITY;

-- A API usa a conexão Postgres do servidor. Clientes Supabase não recebem
-- acesso direto às tabelas, mesmo que conheçam a anon key.
REVOKE ALL ON TABLE empresa, superadmin, usuario_empresa, ghe, coleta,
    resposta, resultado_ghe, log_auditoria FROM anon, authenticated;
REVOKE ALL ON TABLE vw_painel_ghe FROM anon, authenticated;
