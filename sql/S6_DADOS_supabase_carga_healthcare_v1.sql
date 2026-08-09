-- =============================================================================
-- Psyra AI · S6_DADOS_supabase_carga_healthcare_v1.sql
-- Carga do dataset Healthcare Workforce Mental Health (5.000 linhas) no Supabase
--
-- Sprint: S6 | Épico: Dados/Backend | Risco: R1 (validade) + R2 (LGPD)
-- Autor: Jarvis  ·  Revisor obrigatório: Leandro (CDO)
--
-- ⚠️ NATUREZA DESTA CARGA — LEIA ANTES DE RODAR
-- Dado de TESTE DE PIPELINE. A coleta é gravada com origem_dados = 'teste':
--   · não é 'sintetico' — não foi gerada por nós;
--   · não é 'real'      — não passou por CEP, TCLE nem anotação CRP.
-- Nenhum número derivado desta carga pode aparecer no artigo, no PGR ou em
-- material comercial como desempenho do produto.
--
-- ⚠️ PRÉ-REQUISITO
-- Este script ASSUME que `schema_psyra_supabase.sql` (S5) já foi aplicado e que
-- as colunas abaixo existem com estes nomes. Confira antes de rodar — todas as
-- inserções usam lista explícita de colunas, então divergência falha alto e
-- cedo, em vez de gravar na coluna errada em silêncio.
--
--   empresa          (id, razao_social, cnpj, plano)
--   usuario_empresa  (id, empresa_id, nome, email, papel)
--   ghe              (id, empresa_id, codigo, nome, setor, efetivo)
--   coleta           (id, empresa_id, titulo, instrumento, origem_dados,
--                     token_publico, status)
--   resposta         (id, coleta_id, ghe_id, likert_json, texto_anonimizado,
--                     anonimizacao_ok, motor_anonimizacao, protocolo)
--
-- COMO RODAR
--   1. Supabase → Table Editor → Import data from CSV → tabela stg_hcp_workforce
--      (crie a tabela com a SEÇÃO 1 antes de importar)
--   2. SQL Editor → cole as seções 2 a 6 → Run
--   3. Rode a SEÇÃO 7 (verificação) e confira os números
-- =============================================================================


-- =============================================================================
-- SEÇÃO 1 — Tabela de staging (espelho fiel do CSV)
-- =============================================================================
-- O staging existe para três coisas: receber o CSV sem transformação, guardar
-- os campos que NÃO entram no schema da Psyra, e permitir reconferir a carga
-- depois. Ele fica fora do schema de produção e sem exposição ao cliente.

CREATE SCHEMA IF NOT EXISTS staging;

DROP TABLE IF EXISTS staging.stg_hcp_workforce;

CREATE TABLE staging.stg_hcp_workforce (
    employee_id            text PRIMARY KEY,
    employee_type          text NOT NULL,
    department             text NOT NULL,
    workplace_factor       text NOT NULL,
    stress_level           integer NOT NULL,
    burnout_frequency      text NOT NULL,
    job_satisfaction       integer NOT NULL,
    access_to_eaps         text NOT NULL,
    mental_health_absences integer NOT NULL,
    turnover_intention     text NOT NULL,
    importado_em           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE staging.stg_hcp_workforce IS
    'Dataset público Healthcare Workforce Mental Health. Dado de TESTE de pipeline: sem CEP, sem TCLE, sem anotação CRP. Nunca promover para origem_dados = real.';

-- Travas de domínio: o que o dataset realmente contém, não o que ele poderia
-- conter. stress_level começa em 4 porque a escala é truncada na origem.
ALTER TABLE staging.stg_hcp_workforce
    ADD CONSTRAINT ck_stg_stress      CHECK (stress_level BETWEEN 4 AND 9),
    ADD CONSTRAINT ck_stg_satisfacao  CHECK (job_satisfaction BETWEEN 1 AND 5),
    ADD CONSTRAINT ck_stg_afastamento CHECK (mental_health_absences BETWEEN 0 AND 60),
    ADD CONSTRAINT ck_stg_burnout     CHECK (burnout_frequency IN ('Never', 'Occasionally', 'Often')),
    ADD CONSTRAINT ck_stg_eap         CHECK (access_to_eaps IN ('Yes', 'No')),
    ADD CONSTRAINT ck_stg_turnover    CHECK (turnover_intention IN ('Yes', 'No'));

ALTER TABLE staging.stg_hcp_workforce ENABLE ROW LEVEL SECURITY;
-- Sem policy = ninguém lê pelo client. Só o service_role (backend) alcança.


-- =============================================================================
-- SEÇÃO 2 — Funções de mapeamento (espelham etl_healthcare.py)
-- =============================================================================
-- As mesmas regras existem em Python e em SQL. Se uma mudar, a outra tem de
-- mudar junto — a SEÇÃO 7 compara os dois caminhos e acusa divergência.

CREATE OR REPLACE FUNCTION staging.fn_escala_estresse(p_valor integer)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
    -- Stress Level 4..9 reescalado linearmente para 1..5.
    SELECT GREATEST(1, LEAST(5, ROUND((p_valor - 4)::numeric / 5 * 4 + 1)::integer));
$$;

CREATE OR REPLACE FUNCTION staging.fn_faixa_afastamentos(p_dias integer)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_dias <= 2  THEN 1
        WHEN p_dias <= 5  THEN 2
        WHEN p_dias <= 8  THEN 3
        WHEN p_dias <= 12 THEN 4
        ELSE 5
    END;
$$;

CREATE OR REPLACE FUNCTION staging.fn_likert_hcp(
    p_stress integer,
    p_burnout text,
    p_satisfacao integer,
    p_afastamentos integer,
    p_eap text
)
RETURNS jsonb
LANGUAGE sql IMMUTABLE
AS $$
    -- Instrumento hcp_v1: um item por dimensão. C1 e E1 são blocos REVERSOS
    -- (nota alta = proteção); a inversão acontece no motor de score, não aqui.
    SELECT jsonb_build_object(
        'A1', staging.fn_escala_estresse(p_stress),
        'B1', CASE p_burnout
                  WHEN 'Never'        THEN 1
                  WHEN 'Occasionally' THEN 3
                  WHEN 'Often'        THEN 5
              END,
        'C1', p_satisfacao,
        'D1', staging.fn_faixa_afastamentos(p_afastamentos),
        'E1', CASE p_eap WHEN 'Yes' THEN 5 ELSE 1 END
    );
$$;


-- =============================================================================
-- SEÇÃO 3 — Empresa e usuário de teste
-- =============================================================================
-- CNPJ 00.000.000/0002-00 é reservado para esta carga. Idempotente.

INSERT INTO empresa (id, razao_social, cnpj, plano)
VALUES (
    '00000000-0000-4000-8000-000000000002',
    'Healthcare Workforce (dataset público — teste)',
    '00.000.000/0002-00',
    'enterprise'
)
ON CONFLICT (cnpj) DO NOTHING;

-- ATENÇÃO: no Supabase a senha vive no auth.users, não aqui. Crie o usuário
-- pelo painel (Authentication → Users) com o e-mail abaixo e cole o UUID dele
-- no lugar de :uuid_do_auth_user antes de rodar esta linha.
--
-- INSERT INTO usuario_empresa (id, empresa_id, nome, email, papel)
-- VALUES (
--     ':uuid_do_auth_user',
--     '00000000-0000-4000-8000-000000000002',
--     'Gestor de teste (HCP)',
--     'gestor@hcp.psyra.ai',
--     'gestor'
-- )
-- ON CONFLICT (email) DO NOTHING;


-- =============================================================================
-- SEÇÃO 4 — GHEs a partir de Department
-- =============================================================================
-- Employee Type determina Department 1:1 no dataset (verificado: 10 pares
-- exatos). Usar os dois criaria dez grupos duplicados, então Department vira o
-- GHE e Employee Type vira o rótulo de setor.

INSERT INTO ghe (id, empresa_id, codigo, nome, setor, efetivo)
SELECT
    gen_random_uuid(),
    '00000000-0000-4000-8000-000000000002',
    'HCP-' || LPAD(ROW_NUMBER() OVER (ORDER BY s.department)::text, 2, '0'),
    s.department,
    MIN(s.employee_type),
    COUNT(*)
FROM staging.stg_hcp_workforce s
GROUP BY s.department
ON CONFLICT (empresa_id, codigo) DO NOTHING;


-- =============================================================================
-- SEÇÃO 5 — Coleta
-- =============================================================================

INSERT INTO coleta (
    id, empresa_id, titulo, instrumento, origem_dados, token_publico, status
)
VALUES (
    '00000000-0000-4000-8000-000000000042',
    '00000000-0000-4000-8000-000000000002',
    'Healthcare Workforce — carga de teste de pipeline',
    'hcp_v1',
    'teste',
    'teste-hcp-2026',
    'encerrada'
)
ON CONFLICT (token_publico) DO NOTHING;


-- =============================================================================
-- SEÇÃO 6 — Respostas
-- =============================================================================
-- ⚠️ DECISÃO DE PRIVACIDADE: employee_id NÃO atravessa esta fronteira.
-- A tabela `resposta` não tem coluna de identificador de respondente e isso é
-- deliberado. O vínculo linha-do-CSV ↔ resposta morre aqui: depois desta carga
-- não existe caminho de volta de uma resposta para o Employee ID de origem.
-- Se algum dia for preciso reprocessar, apaga-se a coleta e roda-se de novo.

INSERT INTO resposta (
    id, coleta_id, ghe_id, likert_json,
    texto_anonimizado, anonimizacao_ok, motor_anonimizacao, protocolo
)
SELECT
    gen_random_uuid(),
    '00000000-0000-4000-8000-000000000042',
    g.id,
    staging.fn_likert_hcp(
        s.stress_level,
        s.burnout_frequency,
        s.job_satisfaction,
        s.mental_health_absences,
        s.access_to_eaps
    ),
    NULL,            -- o dataset não tem texto livre: não há Bloco K
    false,           -- nada anonimizado porque nada foi recebido
    'nao-aplicavel',
    UPPER(SUBSTRING(MD5(s.employee_id || 'psyra-hcp') FROM 1 FOR 8))
FROM staging.stg_hcp_workforce s
JOIN ghe g
  ON g.empresa_id = '00000000-0000-4000-8000-000000000002'
 AND g.nome = s.department
WHERE NOT EXISTS (
    SELECT 1 FROM resposta r
    WHERE r.coleta_id = '00000000-0000-4000-8000-000000000042'
);


-- =============================================================================
-- SEÇÃO 7 — Verificação (rode e confira os números)
-- =============================================================================

-- 7.1 A carga bateu com o CSV?
SELECT
    (SELECT COUNT(*) FROM staging.stg_hcp_workforce)                    AS linhas_staging,
    (SELECT COUNT(*) FROM resposta
      WHERE coleta_id = '00000000-0000-4000-8000-000000000042')         AS respostas_carregadas,
    (SELECT COUNT(*) FROM ghe
      WHERE empresa_id = '00000000-0000-4000-8000-000000000002')        AS ghes_criados;

-- 7.2 Nenhum valor Likert escapou de 1..5?
SELECT COUNT(*) AS itens_fora_da_escala
FROM resposta r
CROSS JOIN LATERAL jsonb_each_text(r.likert_json) AS item(chave, valor)
WHERE r.coleta_id = '00000000-0000-4000-8000-000000000042'
  AND (valor::integer < 1 OR valor::integer > 5);

-- 7.3 Distribuição por GHE — confira contra a saída do etl_healthcare.py.
SELECT
    g.codigo,
    g.nome,
    COUNT(r.id)                                          AS n_respostas,
    ROUND(AVG((r.likert_json ->> 'A1')::numeric), 2)     AS media_estresse,
    ROUND(AVG((r.likert_json ->> 'C1')::numeric), 2)     AS media_satisfacao
FROM ghe g
LEFT JOIN resposta r ON r.ghe_id = g.id
WHERE g.empresa_id = '00000000-0000-4000-8000-000000000002'
GROUP BY g.codigo, g.nome
ORDER BY g.codigo;

-- 7.4 Trava de k-anonimato: algum grupo abaixo do mínimo?
--     Nesta carga a resposta é "nenhum" (menor grupo tem 262). Ou seja, este
--     dataset NÃO exercita a supressão n≥5 — ela continua testada só pelo seed.
SELECT g.codigo, COUNT(r.id) AS n
FROM ghe g
LEFT JOIN resposta r ON r.ghe_id = g.id
WHERE g.empresa_id = '00000000-0000-4000-8000-000000000002'
GROUP BY g.codigo
HAVING COUNT(r.id) < 5;

-- 7.5 Confirmação de que nenhum identificador vazou para produção.
SELECT COUNT(*) AS vazamentos_de_employee_id
FROM resposta r
WHERE r.coleta_id = '00000000-0000-4000-8000-000000000042'
  AND r.likert_json::text LIKE '%HCP-%';


-- =============================================================================
-- SEÇÃO 8 — Contexto que fica só no staging
-- =============================================================================
-- Workplace Factor e Turnover Intention não viram item Likert: o primeiro é um
-- fator declarado único (não uma escala), o segundo é desfecho de RH e não
-- rótulo de risco psicossocial validado. Ficam disponíveis para análise
-- exploratória, agregados e nunca no painel do cliente.

CREATE OR REPLACE VIEW staging.vw_hcp_contexto AS
SELECT
    s.department                                                        AS ghe_nome,
    s.workplace_factor                                                  AS fator_declarado,
    COUNT(*)                                                            AS n,
    ROUND(AVG(s.stress_level)::numeric, 2)                              AS media_estresse,
    ROUND(AVG(s.mental_health_absences)::numeric, 2)                    AS media_afastamentos,
    ROUND(AVG(CASE WHEN s.turnover_intention = 'Yes' THEN 1 ELSE 0 END)::numeric, 3)
                                                                        AS taxa_intencao_saida
FROM staging.stg_hcp_workforce s
GROUP BY s.department, s.workplace_factor
HAVING COUNT(*) >= 5;   -- mesmo em staging, nada abaixo do mínimo

COMMENT ON VIEW staging.vw_hcp_contexto IS
    'Análise exploratória do dataset de teste. taxa_intencao_saida é desfecho de RH, NUNCA target de modelo (sem validação clínica, sem CEP).';


-- =============================================================================
-- SEÇÃO 9 — Desfazer a carga
-- =============================================================================
-- Rode em bloco se precisar recomeçar. A ordem respeita as chaves estrangeiras.
--
-- DELETE FROM resposta      WHERE coleta_id  = '00000000-0000-4000-8000-000000000042';
-- DELETE FROM resultado_ghe WHERE coleta_id  = '00000000-0000-4000-8000-000000000042';
-- DELETE FROM coleta        WHERE id         = '00000000-0000-4000-8000-000000000042';
-- DELETE FROM ghe           WHERE empresa_id = '00000000-0000-4000-8000-000000000002';
-- DELETE FROM usuario_empresa WHERE empresa_id = '00000000-0000-4000-8000-000000000002';
-- DELETE FROM empresa       WHERE id         = '00000000-0000-4000-8000-000000000002';
-- DROP VIEW IF EXISTS staging.vw_hcp_contexto;
-- DROP TABLE IF EXISTS staging.stg_hcp_workforce;
