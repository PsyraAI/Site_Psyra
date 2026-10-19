# Crescimento orgânico, Google e boas práticas de engenharia

Sprint S10 · Épico COM/APP · 17/10/2026

## 1. O que já está pronto no site (patch v5)

| Item | Por que importa | Onde |
|---|---|---|
| Título, descrição e canônico **por página** | Até agora, toda URL devolvia o mesmo título. O Google podia tratar `/en`, `/termos` e `/privacidade` como cópias da página inicial | `backend/app/seo.py` |
| `hreflang` pt-BR / en / zh-Hans | Cada idioma aparece para o público certo, e o português é o padrão (`x-default`) | `seo.py` |
| `sitemap.xml` com as 10 páginas públicas | Mostra ao Google o que existe e quando mudou | `/sitemap.xml` |
| `robots.txt` | Libera as páginas públicas e tira painel, admin, questionário e login da busca | `/robots.txt` |
| `noindex` nas telas privadas (meta e cabeçalho) | Um link de questionário nunca aparece no Google (R2) | `seo.py` + `main.py` |
| Dados estruturados (Organization, WebSite, SoftwareApplication, Article) | Ajudam o Google a entender a marca e o guia | `seo.py` |
| Open Graph e cartão do Twitter com imagem 1200×630 | Link compartilhado no LinkedIn e no WhatsApp aparece com título, resumo e imagem | `og-psyra.png` |
| Guia público **"NR-1 e riscos psicossociais"** | Conteúdo útil que responde ao que o RH procura; é ele que traz visita sem anúncio | `/guia-nr1` |
| Termos de Uso e Política de Privacidade completos | São sinal de confiança (E-E-A-T) e exigência da Play Store | `/termos`, `/privacidade` |
| Fontes próprias, gzip, cache imutável, código sob demanda | Velocidade é critério de ranqueamento (Core Web Vitals) | `main.jsx`, `main.py`, `App.jsx` |
| Verificação do Search Console e do Bing por variável de ambiente | Não precisa mexer no código para verificar o site | `PSYRA_GOOGLE_SITE_VERIFICATION`, `PSYRA_BING_SITE_VERIFICATION` |

**Medição local** (Lighthouse 12, celular com 4G simulado, antes → depois das correções):

| Categoria | Antes | Depois |
|---|---|---|
| Desempenho | 56 | 83 |
| Acessibilidade | 97 | 100 |
| Boas práticas | 96 | 100 |
| SEO | 100 | 100 |

Na landing, o LCP caiu de 4,1 s para 3,2 s e o TBT, de 840 ms para 230 ms. Esses números são da máquina de testes. Depois do deploy, meçam no PageSpeed Insights (<https://pagespeed.web.dev/>) com a URL pública.

## 2. Como fazer o site aparecer no Google (passo a passo)

> Expectativa honesta: a busca pelo nome **"Psyra AI"** costuma aparecer em poucos dias depois da indexação. Termos disputados como **"NR-1 riscos psicossociais"** levam semanas ou meses e dependem de conteúdo e de links de outros sites. Nenhuma ferramenta garante posição no Google.

1. **Fazer o deploy do patch v5** no Render. Sem ele, nada desta lista existe no ar.
2. **Google Search Console** (<https://search.google.com/search-console>), entrando com psyra.ai.io@gmail.com:
   1. Adicione uma propriedade do tipo **"Prefixo do URL"** com `https://site-psyra.onrender.com/`. A opção "Domínio" exige DNS, que o subdomínio do Render não oferece.
   2. Escolha a verificação **"Tag HTML"** e copie só o código de `content="…"`.
   3. No Render, em **Environment**, crie `PSYRA_GOOGLE_SITE_VERIFICATION` com esse código. Salve, espere o deploy e clique em **Verificar**.
   4. Em **Sitemaps**, envie `sitemap.xml`.
   5. Em **Inspeção de URL**, peça a indexação de `/`, `/guia-nr1`, `/en` e `/privacidade`.
3. **Bing Webmaster Tools** (<https://www.bing.com/webmasters>): use "Importar do Google Search Console". O Bing também alimenta o ChatGPT Search e o DuckDuckGo.
4. **Domínio próprio (recomendado):**
   - Registrem `psyra.com.br` ou `psyraai.com.br` no Registro.br e liguem ao Render (Custom Domain).
   - Depois, mudem `PSYRA_URL_PUBLICA` para o domínio novo. Canônico, sitemap e Open Graph acompanham sozinhos.
   - Domínio próprio passa mais confiança, é exigido em parte das parcerias e permite a verificação por DNS.
5. **Primeiros links de fora** (o que mais pesa para um site novo):
   - página do projeto no site da FECAP;
   - perfil da Psyra no LinkedIn com o link do site;
   - página da FEBRACE;
   - perfis dos três fundadores;
   - GitHub do projeto (README com o link).

## 3. Plano de conteúdo (estilo "hub e satélites", da HubSpot)

O `/guia-nr1` é o **hub**. Cada artigo satélite responde a uma dúvida concreta e leva ao hub e ao diagnóstico gratuito. Sugestão de 8 títulos, um a cada 2 semanas:

1. Como montar o inventário de riscos psicossociais no PGR (com modelo)
2. GHE: como dividir a empresa em grupos sem expor ninguém
3. Questionário de riscos psicossociais: o que perguntar e o que **nunca** perguntar
4. Assédio moral organizacional: o que dizem as decisões recentes da Justiça do Trabalho
5. Plano de ação da NR-1: exemplos por fator (carga, liderança, reconhecimento…)
6. Quanto custa o adoecimento mental para a empresa (método FIEMG explicado)
7. LGPD e pesquisa de clima: o que pode e o que não pode
8. Taxa de resposta baixa? 7 práticas para pesquisas internas confiáveis

Regras para cada artigo:

- Fonte em cada número.
- Data de atualização visível.
- Uma chamada para o diagnóstico no fim.
- Revisão da psicóloga quando o tema for clínico.
- **Texto reescrito pela equipe**: conteúdo gerado em massa por IA e sem revisão é tratado pelo Google como spam.

## 4. Crescimento orgânico além do Google

| Estratégia | Quem usa | Como adaptar na Psyra |
|---|---|---|
| **Ferramenta gratuita como porta de entrada** | HubSpot (Website Grader), Gusto (calculadoras) | A autoavaliação de prontidão NR-1 já existe na landing. O próximo passo é dar a ela página própria (`/autoavaliacao`), com resultado compartilhável e convite para o diagnóstico |
| **Fundadores como canal** | Lattice e Culture Amp no começo | Um post por semana de cada fundador no LinkedIn (bastidores, dado com fonte, aprendizado do piloto). O carrossel da equipe já está pronto |
| **Parcerias de distribuição** | Gusto com contadores | Consultorias de SST, SESMTs terceirizados, contadores e psicólogas organizacionais indicam a Psyra em troca de comissão ou de licença |
| **Prova social verdadeira** | Todos | Depois do piloto, publicar o estudo de caso com autorização e números agregados. **Nunca** inventar logos ou depoimentos |
| **Eventos do setor** | — | SIPAT e CIPA das empresas, FEBRACE, eventos de RH (por exemplo, CONARH) |
| **Indicação dentro do produto** | Dropbox, Notion | No fim do ciclo, o RH pode convidar outra área ou outra empresa do grupo |

**Métricas para acompanhar todo mês:**

- impressões, cliques e posição média no Search Console;
- visitas ao `/guia-nr1`;
- autoavaliações concluídas;
- pedidos de diagnóstico, e a taxa de conversão de visita para pedido;
- Core Web Vitals (no Search Console, em "Experiência").

## 5. Boas práticas de engenharia: o que já seguimos e o que adotar

### Já seguimos

- **CI em todo push:** ruff, black, pytest, guarda de privacidade, build do React e build do Docker.
- **Testes como contrato:**
  - 96 testes da API;
  - 155 testes no repositório de ML;
  - E2E com Playwright (49 checagens), mais o script `e2e_visual.py` para os bugs de tela.
- **Privacidade por padrão (R2):**
  - n ≥ 5 checado no código e no banco;
  - anonimização antes de gravar;
  - nada de PII em log;
  - `noindex` nas telas privadas.
- **Segurança:**
  - CSP só com origens próprias, HSTS, `X-Frame-Options`, rate limit no login;
  - senhas em hash;
  - trilha de auditoria encadeada (SHA-256).
- **Observabilidade:** `request_id` em toda requisição e no log.
- **Desempenho:**
  - code splitting (painel, admin e questionário sob demanda);
  - fontes próprias, gzip e cache imutável dos arquivos com hash.

### Adotar a seguir (custo baixo)

1. **Dependabot** no GitHub: avisa sobre dependência com falha de segurança e abre o PR sozinho.
2. **Branch protegida** na `main`: merge só por PR, com CI verde e uma revisão. É assim que trabalham Google e Stripe.
3. **Ambiente de homologação**: o Render tem Preview Environments por PR. Testar antes de ir para produção.
4. **Monitor de disponibilidade** (UptimeRobot ou Better Stack, plano gratuito) no `/health`. Avisa se o site cair e evita a hibernação do plano gratuito do Render.
5. **Registro de decisões (ADR)** em `docs/adr/`: uma página por decisão importante (por exemplo, "TWA em vez de app nativo").
6. **Orçamento de desempenho** no CI, com Lighthouse CI: o build falha se o desempenho da landing cair abaixo de 80 ou a acessibilidade abaixo de 95.
7. **Changelog e versão semântica:** cada deploy com versão (`APP_VERSAO`) e uma linha do que mudou.
8. **Runbook de incidente:** o que fazer se vazar dado, se o banco cair ou se uma chave for exposta, e quem avisa a ANPD (art. 48 da LGPD).

## Fontes

- Google Search Central, guia de SEO para iniciantes: <https://developers.google.com/search/docs/fundamentals/seo-starter-guide>
- Core Web Vitals (LCP < 2,5 s, INP < 200 ms, CLS < 0,1): <https://developers.google.com/search/docs/appearance/core-web-vitals>
- Verificação de propriedade no Search Console: <https://support.google.com/webmasters/answer/9008080>
- Ferramentas gratuitas como canal orgânico: <https://resources.rework.com/libraries/saas-growth/free-tool-lead-generation>
