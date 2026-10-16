-- Psyra AI — tira "demo" dos nomes que aparecem no painel de produção, sem apagar nada.
-- Rodar uma vez no Postgres (Supabase) de produção. Sprint: S10 | Risco: None
-- Os e-mails de login não mudam (gestor@demo.psyra.ai continua entrando).

BEGIN;
UPDATE empresa
   SET razao_social = 'Nébula Serviços Ltda'
 WHERE id = (SELECT empresa_id FROM usuario_empresa WHERE email = 'gestor@demo.psyra.ai');

UPDATE usuario_empresa SET nome = 'Marina Alves'       WHERE email = 'gestor@demo.psyra.ai';
UPDATE usuario_empresa SET nome = 'Equipe de operação' WHERE email = 'admin@demo.psyra.ai';

UPDATE coleta
   SET titulo = 'Mapeamento NR-1 · 2º semestre de 2026'
 WHERE titulo = 'Mapeamento NR-1 — ciclo demonstrativo';

-- O link do questionário aparece no painel (seção Questionário): troca o token
-- antigo para o link não mostrar "demo". O instrumento e as respostas não mudam.
UPDATE coleta
   SET token_publico = 'nebula-nr1-2026'
 WHERE token_publico = 'demo-nr1-2026'
   AND NOT EXISTS (SELECT 1 FROM coleta WHERE token_publico = 'nebula-nr1-2026');
COMMIT;

-- Conferência (deve listar o ciclo com o título e o token novos):
-- SELECT titulo, token_publico, instrumento, status FROM coleta ORDER BY aberta_em DESC;
