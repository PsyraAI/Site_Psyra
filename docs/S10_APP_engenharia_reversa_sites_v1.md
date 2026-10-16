# Engenharia reversa de sites de produto: o que levamos para a Psyra

Sprint S10 · Épico APP · 15/10/2026 · Risco: R2 (telas com dados simulados, sem logos ou depoimentos inventados)

## O que foi analisado

Analisamos o código e a estrutura das páginas iniciais de cinco empresas de software: Stripe, Linear, Vercel, Culture Amp e Lattice. As duas últimas vendem pesquisa com colaboradores, como a Psyra. Também lemos os tokens de movimento do design system Primer, do GitHub (pacote `@primer/primitives`).

| Site | Padrão observado | Levamos? | Como ficou na Psyra |
|---|---|---|---|
| Stripe | Faixa com 4 números grandes | Sim | Faixa **Em números**: 4 dados públicos, cada um com fonte e link, e uma linha "por isso a Psyra faz…" |
| Stripe | Botões que começam com verbo | Já tínhamos | "Agendar diagnóstico gratuito", "Ver painel de exemplo" |
| Linear, Lattice | Tela real do produto logo no começo | Sim | Abas **Para quem** com telas reais do painel e o selo "Tela real · dados simulados" |
| Culture Amp, Vercel | Abas por público (RH, gestor, colaborador) | Sim | Quatro perfis: RH, SESMT, Psicóloga (CRP) e Colaborador. Cada aba tem 3 pontos e um link para a seção certa; as setas do teclado trocam de aba |
| Culture Amp, Lattice | Selos de segurança, mas **sem explicar o anonimato** na página inicial | Oportunidade | Bloco **O caminho de uma resposta**: 4 passos e um exemplo de grupo oculto (n < 5) |
| Vercel, Linear | Rodapé em colunas, seletor de tema em 3 posições e status | Sim | Colunas Produto, Confiança e Projeto; seletor Sistema, Claro ou Escuro; linha de status "Piloto em preparação…" |
| Primer (GitHub) | Curvas e durações padronizadas | Sim | Variáveis `--lp-ease-out`, `--lp-ease-in-out` e durações de 160, 240 e 400 ms; tudo desligado com `prefers-reduced-motion` |
| Todos | Faixa de logos de clientes | **Não** | A Psyra ainda não tem clientes. Em vez de logos, mostramos fontes de pesquisa e o status real do piloto |
| Culture Amp, Lattice | Depoimentos com métrica | **Não** | Seria inventado. Fica para depois do piloto, com autorização |
| Stripe, Linear | CTA de fechamento antes do rodapé | Já tínhamos | O formulário de contato é o fechamento, e o CTA fixo agora some quando o rodapé aparece |

## Fontes da faixa de números (todas verificadas em 15/10/2026)

- **546 mil afastamentos (2025), +15,7% sobre 2024.** Dados da Previdência Social divulgados pela DGABC em 23/03/2026. <https://www.dgabc.com.br/Noticia/4291324/afastamentos-por-transtorno-mental-chegam-a-546-mil>
- **10–12% de respostas descuidadas.** Meade, A. W.; Craig, S. B. (2012). Identifying careless responses in survey data. *Psychological Methods*, 17(3), 437–455. <https://doi.org/10.1037/a0028085>
- **2 segundos por pergunta.** Huang, J. L. et al. (2012). Detecting and deterring insufficient effort responding to surveys. *Journal of Business and Psychology*, 27(1), 99–114. <https://doi.org/10.1007/s10869-011-9231-8>
- **52,7% de taxa média de resposta** em pesquisas com pessoas. Baruch, Y.; Holtom, B. C. (2008). Survey response rate levels and trends in organizational research. *Human Relations*, 61(8), 1139–1160. <https://doi.org/10.1177/0018726708094863>

## Arquivos alterados

- `frontend-react/src/paginas/Landing.jsx`: blocos `Numeros`, `ParaQuem` e `CaminhoResposta`; novo `Footer` com `SeletorTemaRodape`; fonte no hero.
- `frontend-react/src/lib/textosLanding3.js`: textos novos em pt, en e zh.
- `frontend-react/src/estilos/landing-v3.css`: estilos e tokens de movimento.
- `frontend-react/public/produto-{rh,sesmt,psi,colab}.webp`: telas reais do painel e do questionário com dados simulados do seed (cerca de 50 KB cada).
- `scripts/e2e_site.py`: 7 checagens novas (49/49 ok). `scripts/prints_site.py`: 4 prints novos.

## Cuidados mantidos

- Toda tela do produto mostra o selo "dados simulados". As telas vêm do seed, com a empresa fictícia Nébula.
- Nenhum número sem fonte e nenhum cliente, logo ou depoimento inventado.
- As telas do painel aparecem em português também em /en e /zh, e o selo diz isso.
