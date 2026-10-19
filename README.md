# Psyra AI — MVP funcional (Sprint S6)

Backend + frontend do produto rodando ponta a ponta: coleta anônima do questionário
NR-1, agregação por Grupo Homogêneo de Exposição (GHE) com k-anonimato e painel de
conformidade para o gestor.

> **PTI de Inteligência Artificial · FECAP · out/2026**
> Equipe: Vinícius de Lima (CTO) · Pedro Octávio Rodrigues Jorge (CPO) · Leandro Rodrigues Machado (CDO) · psicóloga CRP (consultora externa)
> Orientação: Prof. Glenarisson e Prof. Alexandre

---

## ⚠️ Leia antes de olhar qualquer número

O motor de risco desta versão é **determinístico, baseado em regra** (`regra-v0.1-PROVISORIO`).
**Não é modelo treinado.** Ele existe para o produto rodar de ponta a ponta antes da
aprovação do CEP.

| Nesta versão | Substituição prevista |
|---|---|
| Índice Likert por média ponderada de blocos | XGBoost calibrado (62 features), validação OOD |
| Sinal de texto por léxico PT-BR | MentalBERT-PT (BERTimbau fine-tuned) |
| Fatores dominantes por bloco | SHAP (LGPD Art. 20) |

Nenhuma saída daqui é métrica de modelo (F1, ROC-AUC, Brier, ECE) e nada aqui pode
ser apresentado como resultado de IA no artigo ou em material comercial. Todos os
dados de demonstração são **sintéticos, gerados com semente fixa** — não são pessoas
reais, não passaram por CEP/TCLE e nunca podem treinar modelo.

---

## Rodar o site completo

No PowerShell, execute um comando por linha a partir desta pasta:

```powershell
pip install -r requirements.txt
Set-Location frontend-react
npm ci
npm run build
Set-Location ../backend
python seed.py --reset
python -m uvicorn app.main:app --reload --port 8000
```

O build do React é gerado em `backend/static-react/` e servido pelo mesmo processo
FastAPI. Em sistemas com `make`, use `make instalar`, `make seed` e `make rodar`.

| Endereço | O que é |
|---|---|
| http://localhost:8000/ | Tela de entrada + painel do gestor |
| http://localhost:8000/responder/nebula-nr1-2026 | Questionário anônimo do colaborador |
| http://localhost:8000/docs | Documentação OpenAPI interativa |
| http://localhost:8000/health/ready | Readiness (banco acessível) |
| http://localhost:8000/admin | Superadmin (empresas e usuários) |

**Acesso de demonstração (somente após `seed.py` local):** `gestor@demo.psyra.ai` / `psyra123`

## Produção (Render + Supabase)

Passo a passo de deploy HTTPS, secrets, backups, superadmin e smoke test do
Google Forms: [`docs/PRODUCAO.md`](docs/PRODUCAO.md).

## Google, app Android e variáveis novas (17/10/2026)

| Variável (Render → Environment) | Para quê |
|---|---|
| `PSYRA_URL_PUBLICA` | Domínio público usado no canônico, no sitemap e no Open Graph (padrão: `https://site-psyra.onrender.com`) |
| `PSYRA_GOOGLE_SITE_VERIFICATION` | Código da tag HTML do Google Search Console |
| `PSYRA_BING_SITE_VERIFICATION` | Código do Bing Webmaster Tools |
| `PSYRA_TWA_PACOTE` / `PSYRA_TWA_SHA256` | Digital Asset Links do app Android (`/.well-known/assetlinks.json`) |

- **SEO:** `backend/app/seo.py` gera título, descrição, canônico, hreflang, Open Graph e JSON-LD por rota; `/robots.txt` e `/sitemap.xml` são servidos pela API; painel, admin, questionário e acesso recebem `noindex`.
- **Páginas públicas novas:** `/termos`, `/privacidade` (completas, pt/en; resumo em zh) e `/guia-nr1` (guia da NR-1 para busca orgânica).
- **PWA e app Android:** `manifest.webmanifest`, `sw.js` (nunca guarda `/v1`) e o projeto TWA em `android-app/`. Passo a passo da Play Store em [`android-app/README.md`](android-app/README.md).
- **Estratégia de crescimento e boas práticas:** [`docs/S10_COM_crescimento_organico_e_boas_praticas_v1.md`](docs/S10_COM_crescimento_organico_e_boas_praticas_v1.md).
- **Revisão do modelo:** [`docs/S10_ML_revisao_ponta_a_ponta_v1.md`](docs/S10_ML_revisao_ponta_a_ponta_v1.md).

## Questionário no próprio site (padrão desde a banca final)

O colaborador responde em `/responder/<token>`, dentro da Psyra: sem login, sem
nome, sem passar por serviço de terceiros. O gestor cria o ciclo no painel
(**Novo ciclo**), copia o link ou mostra o QR code (seção **Questionário**) e
acompanha quantas respostas cada grupo já tem até chegar a 5. **Encerrar coleta**
fecha o link na hora.

- O questionário é público: `/responder/*`, `GET /v1/coletas/{token}/formulario`,
  `POST /v1/coletas/{token}/inicio` e `POST /v1/coleta`. O painel continua atrás do login.
- O texto livre passa pela anonimização antes de ser gravado. Em produção,
  instale o Presidio com o modelo em português; sem ele, o fallback
  `regex-ptbr-v2` mascara CPF, e-mail, telefone e nomes comuns, mas não substitui
  o Presidio antes de dados reais.

### Qualidade das respostas (cansaço, pressa, evasão)

Cada resposta passa por 3 verificações em `app/qualidade.py` (versão `qualidade-v1`):
pressa (partes a menos de 2 s por pergunta, Huang et al., 2012), mesma nota em 70%+ das
perguntas (Meade e Craig, 2012) e incoerência entre frases de direção oposta. Os limiares
vieram da validação da base simulada v6 (`ci/scripts/S10_ML_qualidade_respostas_v6_v1.py`):
no teste, 95% das descuidadas encontradas e 2,5% das atentas sinalizadas.

- A resposta sinalizada nunca é apagada nem mostrada sozinha. Se a empresa escolher
  (Configurações → Empresa), ela sai do índice do grupo, desde que o grupo continue com 5+
  respostas válidas.
- `POST /v1/coletas/{token}/inicio` conta, sem identificar, quem começou (evasão): só a coleta,
  o grupo e o dia.
- `GET /v1/empresas/{id}/coletas/{id}/qualidade` devolve participação, término, sinalizadas
  por grupo (só n ≥ 5) e o ritmo por parte.

### Conta e configurações

Login com mostrar senha, aviso de Caps Lock e "manter conectado por 7 dias"; senha
temporária com troca obrigatória no primeiro acesso; troca de senha (mínimo de 10
caracteres, sem e-mail/nome, sem senhas óbvias); "sair de todos os aparelhos" (versão da
sessão no token); equipe com convite, nova senha temporária e tirar acesso (gestão e
administração; a psicóloga CRP só consulta).

### Google Forms (legado, desligado na interface)

O webhook continua no backend (`integracoes/google-forms/README.md`) para quem já
tinha ciclos vinculados, mas a interface não oferece mais essa opção: o questionário
do site protege melhor os dados e não depende de Apps Script.

---

## Roteiro de apresentação (5 minutos)

1. **Entrar no painel** → *Visão geral*: 42 respostas, 5 grupos, 1 grupo com resultado suprimido.
2. **Riscos por grupo** → mostrar a *Diretoria* (n=3): sem nenhum número na tela. É o k-anonimato funcionando, não uma falha de dado.
3. **O Revelador** → *Desenvolvimento de produto*: escala 24,9 (risco baixo) contra texto livre 89,2. Divergência **+64,3**. É a tese do produto: a nota diz que está tudo bem, o texto diz o contrário.
4. **Conformidade NR-1** → checklist com CEP e assinatura CRP explicitamente pendentes.
5. **Questionário** → mostrar o link e o QR code. Abrir no celular, responder escrevendo um nome e um e-mail no texto livre. Voltar ao painel: a resposta entrou no ciclo e o texto foi gravado sem o nome e sem o e-mail.
6. **Tema e idioma** → alternar claro/escuro e trocar para English ou 中文 no topo do painel.

---

## Arquitetura

```
navegador
   │  (React SPA, build Vite)
   ▼
FastAPI ──► anonimização (fail-closed) ──► SQLite / Supabase
   │                                          │
   │                                          ▼
   └──────────► motor de risco ────────► vw_painel_ghe (n ≥ 5)
                                              │
                                              ▼
                                     painel do gestor + auditoria SHA-256
```

```
psyra-app/
├── backend/
│   ├── app/
│   │   ├── main.py            # aplicação, CORS, /health, serve o frontend
│   │   ├── config.py          # parâmetros por variável de ambiente
│   │   ├── db.py              # conexão + bootstrap do schema
│   │   ├── schema_sqlite.sql  # espelho do schema_psyra_supabase.sql (7 tabelas + view)
│   │   ├── security.py        # PBKDF2 + JWT HS256 (stdlib)
│   │   ├── deps.py            # autorização e isolamento por empresa
│   │   ├── anonimizador.py    # Presidio opcional + fallback regex PT-BR
│   │   ├── scoring.py         # motor de risco PROVISÓRIO
│   │   ├── auditoria.py       # cadeia de hash SHA-256 (Art. 37)
│   │   ├── instrumento.py     # carga do questionário
│   │   └── routers/           # auth · empresas · coleta · painel
│   ├── data/instrumento_nr1_v2_demo.json   # 10 blocos, 46 itens + Bloco K
│   ├── seed.py                # dados SINTÉTICOS de demonstração
│   ├── static-react/          # build Vite gerado (não versionado)
│   └── tests/                 # 30 testes (pytest)
├── frontend-react/
│   ├── src/paginas/           # entrada, painel e questionário anônimo
│   ├── src/componentes/       # visualizações do painel
│   ├── src/contexto/          # sessão e proteção de rota
│   ├── src/lib/               # cliente da API e adaptadores
│   └── vite.config.js         # proxy local + build para o FastAPI
└── .github/workflows/ci.yml   # ruff + black + pytest
```

O React é o único frontend do projeto. Em desenvolvimento, `npm run dev` abre
`http://localhost:5173` e encaminha `/v1` e `/health` para a API na porta 8000.
Para apresentação ou produção, use o build integrado e acesse tudo pela porta 8000.

---

## API

| Método | Rota | Auth | O que faz |
|---|---|---|---|
| POST | `/v1/auth/login` | — | Autentica gestor/RH, devolve JWT |
| GET | `/v1/auth/me` | JWT | Perfil da sessão |
| GET | `/v1/empresas/{id}/ghes` | JWT | Lista os GHEs da empresa |
| GET | `/v1/empresas/{id}/coletas` | JWT | Lista ciclos de coleta |
| POST | `/v1/empresas/{id}/coletas` | JWT | Abre ciclo e gera token público |
| POST | `/v1/empresas/{id}/coletas/{id}/encerrar` | JWT | Encerra o ciclo |
| GET/PUT | `/v1/empresas/{id}/coletas/{id}/google-form` | JWT | Consulta ou vincula o Form da coleta |
| GET | `/v1/empresas/{id}/coletas/{id}/painel` | JWT | **Painel agregado** (contrato do `fetchPainel`) |
| GET | `/v1/empresas/{id}/auditoria` | JWT | Eventos + integridade da cadeia |
| GET | `/v1/coletas/{token}/formulario` | público | Instrumento + consentimento + GHEs |
| POST | `/v1/coleta` | público | Recebe resposta anônima |
| POST | `/v1/integracoes/google-forms/{coleta_id}` | HMAC | Recebe submissão do Apps Script |
| GET | `/health` | público | Status |

O respondente **não tem login**: acessa por link com token, responde e recebe apenas
um protocolo. Nenhum endpoint devolve resposta individual — isso é garantido por
teste (`tests/test_privacidade.py::test_painel_nao_expoe_resposta_individual`).

---

## Travas de conformidade implementadas

| Trava | Onde | Origem |
|---|---|---|
| Resultado só por GHE com n ≥ 5 | `scoring.mascarar` **+** `vw_painel_ghe` **+** interface | CFP 11/2018 · k-anonimato |
| Anonimização antes de gravar texto, *fail-closed* | `anonimizador.py` + `CHECK` no banco | LGPD Art. 11 |
| Nenhuma coluna de PII de colaborador | `schema_sqlite.sql` | LGPD |
| Consentimento obrigatório no envio | `schemas.RespostaEntrada` | TCLE |
| Likert fora de 1–5 recusado | Pydantic **+** `CHECK` no banco | integridade |
| Coleta com origem `real` bloqueada sem CEP | `routers/empresas.py` | CNS 466/2012 |
| Trilha de auditoria encadeada SHA-256 | `auditoria.py` | LGPD Art. 37 |
| Isolamento por empresa em toda rota autenticada | `deps.exigir_empresa` | equivalente ao RLS |
| PGR sempre "aguardando validação CRP" | `routers/painel.py` | CFP |
| Selo "DADOS PROVISÓRIOS" em todo painel | API + interface | R1 (anti-leakage) |

---

## Qualidade

```bash
make teste   # 79 testes do backend
make lint    # ruff + black

# ponta a ponta no navegador (Playwright, 49 checagens), com o servidor rodando:
python3 scripts/e2e_site.py --base http://localhost:8000 --saida e2e_saida --banco backend/psyra.db
# prints usados no guia da banca (docs/prints/):
python3 scripts/prints_site.py --base http://localhost:8000 --saida docs/prints
```

Cobertura por arquivo: `test_privacidade.py` (12) · `test_scoring.py` (11) ·
`test_qualidade.py` (9) · `test_api.py` (9) · `test_conta.py` (7) · `test_capital_risco.py` (7) ·
`test_integracao_google_forms.py` (6) · `test_auth.py` (5) · `test_admin.py` (4) ·
`test_producao.py` (4) · `test_portao.py` (3) · `test_db_adaptador.py` (2).
Se qualquer teste de `test_privacidade.py` falhar, **o produto não vai para piloto** —
o CI trata esse arquivo como etapa separada e bloqueante.

---

## Caminho até a coleta real

1. Instalar Presidio + `pt_core_news_lg` e trocar o motor de anonimização regex.
2. Substituir o instrumento DEMO pelo validado pela psicóloga CRP.
3. Aprovação do **CEP** em mãos → `PSYRA_CEP_APROVADO=true` libera coleta `real`.
4. Trocar `db.py` pelo cliente Supabase (mesmo schema, RLS já modelada).
5. Só então: fine-tuning MentalBERT-PT, XGBoost e SHAP substituindo o motor de regra,
   com validação OOD.

Enquanto os passos 1–3 não estiverem concluídos, o sistema só aceita dado
**sintético** ou de **teste** — por decisão de projeto, não por limitação técnica.

---

## Registro de correção (ensaio ponta a ponta, 31/07/2026)

O ensaio manual com PII real no Bloco K mostrou que CPF, e-mail e telefone eram
mascarados, mas **o nome próprio vazava** quando a frase abria com maiúscula
("Sou o Joao Pereira"): o gatilho do padrão exigia `sou` minúsculo. Corrigido com
gatilho case-insensitive e preservação do prefixo; teste de regressão em
`tests/test_privacidade.py::test_anonimizador_remove_nome_no_inicio_da_frase`.

A lição vale mais que a correção: **regex não é anonimizador de grau produtivo.**
Ele cobre o formato previsto e falha no não previsto. Antes de qualquer coleta com
dado real, o Presidio é obrigatório — o fallback existe só para o pipeline rodar em
dado sintético.
