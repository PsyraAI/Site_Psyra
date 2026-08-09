# Runbook de produção — Psyra no Render + Supabase

## O que este ambiente entrega

- Site único (API + frontend) com HTTPS automático no Render
- Postgres no Supabase com schema, RLS ativo e revogação para `anon`/`authenticated`
- Superadmin global em `/admin` para cadastrar empresas e usuários
- Rate limit em login, coleta pública e webhook Google Forms
- Health `live`/`ready`, request-id, headers de segurança e Sentry opcional
- CI com backend, frontend, testes ML leves e build Docker

Coleta `real`, XGBoost/SHAP e MentalBERT **não** são ativados aqui.

## 1. Supabase

1. Abra o projeto e clique em **Connect**.
2. Copie a URI do **Session pooler** (porta `5432`, host `*.pooler.supabase.com`).
3. Defina localmente em `.env`:

```env
PSYRA_DATABASE_URL="postgresql://postgres.SEU_REF:SENHA@HOST.pooler.supabase.com:5432/postgres?sslmode=require"
```

4. Aplique o schema:

```powershell
cd S6_APP_psyra_mvp_v5
python backend/aplicar_schema_postgres.py
```

5. No painel Supabase: Database → Backups → ative backups diários / PITR se o plano permitir.

### Backup e restore locais

```powershell
python scripts/backup_postgres.py
python scripts/restore_postgres.py backups\arquivo.sql --confirmar
```

Requer `pg_dump` e `psql` no PATH.

## 2. Render

1. Conecte o repositório e use o `render.yaml` (serviço Docker `psyra`).
2. Preencha os secrets `sync: false`:
   - `PSYRA_PUBLIC_URL` = `https://SEU-SERVICO.onrender.com`
   - `PSYRA_DATABASE_URL` = URI do pooler
   - `PSYRA_CORS` = a mesma URL pública (sem barra final)
3. `PSYRA_JWT_SECRET` e `PSYRA_FORMS_WEBHOOK_SECRET` já são gerados pelo blueprint.
4. Após o primeiro deploy, anote a URL HTTPS.

### Domínio próprio (depois)

No Render: Settings → Custom Domains → adicione o domínio e atualize DNS.
Atualize `PSYRA_PUBLIC_URL`, `PSYRA_CORS` e `PSYRA_ALLOWED_HOSTS`.

## 3. Primeiro superadmin

No ambiente com `PSYRA_DATABASE_URL` apontando para produção:

```powershell
$env:PSYRA_BOOTSTRAP_ADMIN_EMAIL="ops@suaempresa.com"
$env:PSYRA_BOOTSTRAP_ADMIN_PASSWORD="senha-forte-12+"
$env:PSYRA_BOOTSTRAP_ADMIN_NAME="Operações Psyra"
python backend/criar_superadmin.py
```

Remova as variáveis depois. Acesse `https://SEU-DOMINIO/admin`.

Não rode `python backend/seed.py` em production — o seed está bloqueado.

## 4. Google Forms ponta a ponta

1. No painel da empresa, vincule a URL do Form à coleta.
2. Copie `WEBHOOK_URL` = `{PSYRA_PUBLIC_URL}/v1/integracoes/google-forms/{coleta_id}`
   e o `WEBHOOK_SECRET` exibido.
3. No Apps Script do Form (`integracoes/google-forms/PsyraWebhook.gs`), configure as
   propriedades e execute `instalarGatilho()`.
4. Envie uma resposta de teste e confirme no painel.

Smoke automatizado (após o serviço estar no ar):

```powershell
$env:PSYRA_SMOKE_BASE_URL="https://SEU-SERVICO.onrender.com"
$env:PSYRA_SMOKE_EMAIL="gestor@empresa.com"
$env:PSYRA_SMOKE_PASSWORD="..."
$env:PSYRA_FORMS_WEBHOOK_SECRET="..."
python scripts/smoke_producao.py
```

## 5. Rollback

1. No Render: deploys anteriores → **Rollback**.
2. Se o schema/dados corromperem: restaure o último dump com `restore_postgres.py`
   ou o backup gerenciado do Supabase.
3. Confirme `/health/ready` = `status: ok` e `banco: postgres`.

## 6. Checklist pós-deploy

- [ ] `/health/ready` responde 200 com `banco: postgres`
- [ ] `/docs` indisponível em production
- [ ] Login de gestor funciona
- [ ] `/admin` cria empresa e usuário
- [ ] Credenciais demo não aparecem na tela pública
- [ ] Webhook Forms recebe ao menos uma resposta de teste
- [ ] Backup Supabase ativo

## 7. Ainda bloqueado (conformidade)

Antes de coleta com trabalhadores reais: CEP, instrumento validado CRP, TCLE
formal, Presidio e governança LGPD. Ver README do projeto.
