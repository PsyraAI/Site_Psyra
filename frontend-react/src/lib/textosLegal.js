// Termos de Uso e Política de Privacidade (pt-BR vinculante; en tradução; zh resumo).
// Sprint: S10 | Risco: R2 (LGPD) · Base: documento S10_LGPD_termos_e_politica_v1 (Google Docs),
// revisado em 17/10/2026. Documento em revisão jurídica antes do piloto.
// Marcação: **negrito** dentro das frases; blocos { p } parágrafo, { ul } lista, { tabela }.

export const VERSAO_LEGAL = "1.1";
export const DATA_LEGAL = "2026-10-17";

const pt = {
  meta: {
    titulo: "Termos de Uso e Política de Privacidade — Psyra AI",
    descricao:
      "Como a Psyra AI trata dados de respondentes, usuários e visitantes: anonimização, resultado só por grupo (n ≥ 5), IA explicável (LGPD art. 20) e seus direitos.",
  },
  rotuloVersao: (v, d) => `Versão ${v} · em vigor desde ${d} · documento em revisão jurídica`,
  titulo: "Termos de Uso e Política de Privacidade",
  intro: [
    "A Psyra AI é uma plataforma que mapeia riscos psicossociais no trabalho a partir de questionários com escala e texto livre em português, para apoiar as empresas no gerenciamento de riscos exigido pela NR-1. Foi criada por Vinícius de Lima, Pedro Octávio Rodrigues Jorge e Leandro Rodrigues Machado no PTI de Inteligência Artificial da FECAP e está em fase de validação.",
    "Este documento tem duas partes: os **Termos de Uso** (regras para usar a plataforma, no site e no aplicativo) e a **Política de Privacidade** (como tratamos dados pessoais, conforme a Lei Geral de Proteção de Dados, Lei 13.709/2018). Esta versão será revista por profissional do Direito antes do piloto com empresas; mudanças relevantes serão avisadas com antecedência.",
  ],
  sumario: "Nesta página",
  resumoTitulo: "Resumo em 6 pontos",
  resumo: [
    "**Ninguém é identificado.** Os resultados aparecem só por grupo de trabalho com no mínimo 5 respostas; grupos menores ficam ocultos.",
    "**Dados de identificação são apagados antes de gravar.** Nomes, CPF, e-mail e telefone escritos no texto livre são removidos automaticamente; se a remoção falhar, a resposta não é gravada.",
    "**O resultado não pode ser usado contra uma pessoa.** Ele serve para medidas coletivas de prevenção, nunca para avaliar, punir ou desligar alguém.",
    "**A IA não decide sozinha.** Cada indicação de risco vem com os fatores que mais pesaram, e o relatório para o PGR é analisado e assinado por psicóloga com registro no CRP.",
    "**Não vendemos dados** e não usamos respostas de clientes para treinar modelos sem autorização expressa e anonimização.",
    "**Você tem direitos** de acesso, correção, eliminação e explicação. Fale com o encarregado de dados pelo e-mail psyra.ai.io@gmail.com.",
  ],
  partes: [
    {
      id: "termos",
      titulo: "Parte A — Termos de Uso",
      secoes: [
        {
          t: "1. A quem estes Termos se aplicam",
          b: [
            { p: "Ao contratar, acessar ou usar a Psyra AI, no site ou no aplicativo, você concorda com estes Termos. Eles se aplicam a:" },
            {
              ul: [
                "**Cliente:** a empresa que contrata a plataforma para mapear riscos psicossociais dos seus trabalhadores;",
                "**Usuários:** as pessoas indicadas pelo Cliente para acessar o painel (por exemplo, RH e segurança do trabalho);",
                "**Respondentes:** os trabalhadores convidados a responder ao questionário;",
                "**Visitantes:** quem navega pelo site da Psyra AI.",
              ],
            },
          ],
        },
        {
          t: "2. O que a plataforma faz",
          b: [
            { p: "A Psyra AI oferece: (a) questionário com itens em escala de 1 a 5 e campo de texto livre; (b) remoção automática de dados de identificação; (c) análise de risco por grupo homogêneo de exposição (GHE), com no mínimo 5 respostas por grupo; (d) explicação dos fatores que mais pesaram em cada resultado; (e) painel com os resultados agregados e plano de ação sugerido; e (f) relatório para o Programa de Gerenciamento de Riscos (PGR), analisado e assinado por psicóloga com registro ativo no Conselho Regional de Psicologia (CRP). O diagnóstico inicial é gratuito." },
            { p: "**O que a plataforma não é.** A Psyra AI não faz avaliação psicológica individual, diagnóstico clínico nem atendimento em saúde mental, e não substitui o gerenciamento de riscos ocupacionais, que continua sendo responsabilidade do empregador pela NR-1. Em situação de sofrimento intenso ou emergência, procure o CVV (ligue 188, 24 horas) ou o SAMU (192)." },
          ],
        },
        {
          t: "3. Cadastro e acesso",
          b: [
            {
              ul: [
                "As contas do painel são criadas para pessoas indicadas pelo Cliente, com e-mail corporativo.",
                "Login e senha são pessoais e intransferíveis. O Cliente responde pelos acessos que concede e deve avisar a Psyra AI em caso de suspeita de uso indevido.",
                "Cada perfil vê apenas os dados da própria empresa, e cada acesso fica registrado.",
                "O questionário não exige login: o respondente acessa por link ou QR Code do ciclo de coleta.",
              ],
            },
          ],
        },
        {
          t: "4. Regras de uso",
          b: [
            { p: "O **Cliente e os Usuários** se comprometem a:" },
            {
              ul: [
                "informar os trabalhadores, antes da coleta, sobre a finalidade da pesquisa, o caráter voluntário e anônimo da participação e a forma como os resultados serão usados;",
                "não tentar identificar Respondentes, por exemplo cruzando dados, criando grupos pequenos demais ou pedindo respostas individuais;",
                "usar os resultados apenas para medidas coletivas de prevenção e melhoria do trabalho, **nunca** para avaliação de desempenho, promoção, punição ou desligamento de pessoas;",
                "não pressionar ninguém a responder nem retaliar quem não responder;",
                "não incluir no questionário perguntas que peçam nome, matrícula, contato ou outro dado que identifique a pessoa;",
                "não copiar, revender, fazer engenharia reversa ou extrair dados da plataforma de forma automatizada.",
              ],
            },
            { p: "Os **Respondentes** participam de forma voluntária e podem parar a qualquer momento. Pedimos que não escrevam no texto livre nomes, contatos ou informações de outras pessoas; mesmo que isso aconteça, esses dados são removidos automaticamente antes da gravação." },
            { p: "O descumprimento destas regras permite à Psyra AI suspender o acesso e, se necessário, encerrar o contrato." },
          ],
        },
        {
          t: "5. Planos, preços e pagamento",
          b: [
            { p: "Os planos variam pelo porte da empresa. Valores de referência: **Sinal**, até 50 colaboradores, R$ 1.200 por mês; **Padrão**, até 200 colaboradores, R$ 2.500 por mês; **Panorama**, até 1.000 colaboradores, R$ 4.500 por mês. Prazos de pagamento, reajuste e condições em caso de atraso constam da proposta comercial e do contrato, que prevalecem sobre esta tabela. Os Respondentes não pagam nada." },
          ],
        },
        {
          t: "6. Responsabilidade técnica e papel da psicóloga",
          b: [
            { p: "As indicações de risco são estimativas estatísticas por grupo, com margem de erro, e servem para priorizar ações. As estimativas de capital em risco usam o método público da FIEMG e indicam ordem de grandeza; não são laudo financeiro, contábil ou pericial. A interpretação técnica e o relatório para o PGR são feitos e assinados por psicóloga com registro ativo no CRP, conforme as Resoluções do Conselho Federal de Psicologia nº 6/2019 (documentos escritos) e nº 9/2024 (Psicologia mediada por tecnologias digitais). A decisão sobre as medidas e a sua execução cabem ao Cliente." },
          ],
        },
        {
          t: "7. Disponibilidade e suporte",
          b: [
            { p: "Fazemos o possível para manter a plataforma disponível e segura, com cópias de segurança e testes automáticos a cada mudança. Na fase de validação e piloto não há garantia formal de nível de serviço; manutenções programadas serão avisadas com antecedência sempre que possível." },
          ],
        },
        {
          t: "8. Propriedade intelectual",
          b: [
            { p: "A plataforma, os modelos, o questionário, a marca Psyra AI e a mascote Phrona pertencem aos seus criadores. Os dados inseridos pelo Cliente e os relatórios gerados para ele são do Cliente, que pode usá-los livremente para cumprir as suas obrigações." },
          ],
        },
        {
          t: "9. Confidencialidade",
          b: [
            { p: "As partes mantêm em sigilo as informações não públicas a que tiverem acesso pelo contrato, inclusive resultados e documentos internos, durante o contrato e depois dele." },
          ],
        },
        {
          t: "10. Vigência, cancelamento e devolução dos dados",
          b: [
            {
              ul: [
                "O contrato é mensal e se renova automaticamente.",
                "O Cliente pode cancelar a qualquer momento, com aviso de 30 dias.",
                "Até 30 dias após o fim do contrato, o Cliente pode exportar os relatórios agregados. Depois disso, as respostas são excluídas, salvo o que a lei obriga a guardar (veja a Parte B, item 7).",
              ],
            },
          ],
        },
        {
          t: "11. Limitação de responsabilidade",
          b: [
            { p: "A Psyra AI responde por danos diretos comprovadamente causados por falha da plataforma, até o valor pago pelo Cliente nos 12 meses anteriores ao fato, exceto em caso de dolo ou culpa grave e nas situações em que a lei não admite limitação, inclusive as previstas na LGPD. A Psyra AI não responde por decisões tomadas pelo Cliente nem por uso em desacordo com estes Termos." },
          ],
        },
        {
          t: "12. Alterações destes Termos",
          b: [{ p: "Podemos atualizar estes Termos. A versão e a data ficam no topo da página, e mudanças relevantes são avisadas ao Cliente com pelo menos 30 dias de antecedência." }],
        },
        {
          t: "13. Lei aplicável e foro",
          b: [{ p: "Estes Termos seguem as leis do Brasil. Fica eleito o foro da Comarca de São Paulo (SP) para resolver eventuais conflitos." }],
        },
      ],
    },
    {
      id: "privacidade",
      titulo: "Parte B — Política de Privacidade",
      secoes: [
        {
          t: "1. Quem é responsável por cada dado",
          b: [
            { p: "A LGPD diferencia quem decide sobre o tratamento (**controlador**) de quem trata dados em nome dele (**operador**):" },
            {
              ul: [
                "**Respostas ao questionário:** o Cliente é o controlador, porque decide fazer a pesquisa para cumprir a NR-1; a Psyra AI é a operadora e trata as respostas apenas conforme as instruções do Cliente e esta Política (LGPD, art. 39).",
                "**Dados de contas do painel e contatos pelo site:** a Psyra AI é a controladora.",
              ],
            },
          ],
        },
        {
          t: "2. Quais dados tratamos e por quê",
          b: [
            {
              tabela: {
                cab: ["Quem", "Dados", "Para quê", "Base legal (LGPD)"],
                linhas: [
                  ["Respondentes", "Respostas na escala, texto livre e setor ou grupo de trabalho. **Não pedimos** nome, CPF, e-mail, telefone ou matrícula.", "Mapear riscos psicossociais por grupo para o gerenciamento de riscos da NR-1.", "Cumprimento de obrigação legal do Cliente (art. 7º, II, e art. 11, II, a). Na fase de pesquisa, consentimento por termo (art. 11, I). A base de cada contrato é confirmada com o Cliente."],
                  ["Respondentes", "Itens sobre sinais de saúde e esgotamento: **dado sensível** (art. 5º, II).", "Compor o risco do grupo; nunca exibidos por pessoa.", "As mesmas acima, com as salvaguardas do art. 11."],
                  ["Respondentes", "Tempo gasto por parte do questionário e se a pessoa desistiu (sem vínculo com quem respondeu).", "Medir a qualidade da coleta por grupo (pressa, desatenção, desistência).", "Legítimo interesse do Cliente na qualidade da medição (art. 7º, IX), sempre agregado."],
                  ["Usuários do painel", "Nome, e-mail corporativo, empresa, perfil de acesso e registros de acesso (data, hora e ação).", "Dar acesso, proteger a conta e manter a trilha de auditoria.", "Execução de contrato (art. 7º, V); legítimo interesse para segurança (art. 7º, IX); guarda de registros (Marco Civil, art. 15)."],
                  ["Visitantes do site", "Nome, e-mail, empresa, porte, interesse e, se a pessoa quiser, o resultado da autoavaliação.", "Responder ao pedido de contato ou de diagnóstico.", "Procedimentos preliminares a pedido do titular (art. 7º, V)."],
                ],
              },
            },
            { p: "**Formulário de contato:** ao enviar, o site abre o programa de e-mail do próprio visitante com a mensagem pronta; o servidor do site não grava esses dados." },
            { p: "**Navegador e aplicativo:** guardamos apenas a preferência de idioma e de tema (armazenamento local) e, no painel, a sessão de login. Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros. O provedor de hospedagem mantém registros técnicos de acesso, como o endereço IP, para fins de segurança; o banco de respostas **não** guarda o endereço de rede junto da resposta." },
          ],
        },
        {
          t: "3. Como protegemos as respostas",
          b: [
            {
              ul: [
                "**Remoção automática de identificadores:** antes de qualquer análise, nomes, CPF, e-mail e telefone presentes no texto livre são apagados (LGPD, art. 12). Se a remoção falhar, a resposta não é gravada.",
                "**Resultado só por grupo:** o painel mostra apenas resultados agregados por grupo com no mínimo 5 respostas; grupos menores ficam ocultos, inclusive para o Cliente.",
                "**Isolamento por empresa:** cada empresa só acessa as próprias informações (segurança por linha no banco de dados).",
                "**Acesso técnico restrito:** apenas a equipe responsável tem acesso técnico ao banco, e cada operação fica registrada.",
              ],
            },
          ],
        },
        {
          t: "4. Inteligência artificial e decisões automatizadas",
          b: [
            {
              ul: [
                "O cálculo estima o nível de risco **de cada grupo**, não de pessoas, e mostra quanto cada dimensão pesou no resultado, em linha com o art. 20 da LGPD.",
                "Nenhuma decisão sobre uma pessoa é tomada pela IA. O plano de ação é uma sugestão; o relatório final passa pela análise e assinatura de psicóloga com registro no CRP, e qualquer titular pode pedir explicação ou revisão pelo canal do item 10.",
                "O texto é processado em ambiente próprio da Psyra AI e **não é enviado** a serviços externos de inteligência artificial.",
                "Respostas de clientes **não são usadas para treinar modelos** sem autorização expressa do Cliente em contrato e, mesmo assim, apenas depois de anonimizadas. Na pesquisa acadêmica do piloto, o uso segue o protocolo aprovado pelo Comitê de Ética em Pesquisa e o termo de consentimento (TCLE).",
              ],
            },
          ],
        },
        {
          t: "5. Com quem compartilhamos",
          b: [
            { p: "**Não vendemos dados pessoais.** Compartilhamos somente o necessário com:" },
            {
              ul: [
                "o **Cliente**, que recebe apenas resultados agregados por grupo;",
                "a **psicóloga responsável**, que analisa os resultados agregados para o relatório e está sujeita ao sigilo profissional;",
                "**fornecedores de infraestrutura** que atuam como suboperadores, sob contrato: Supabase (banco de dados e autenticação), Google Cloud (armazenamento) e Render (hospedagem);",
                "**autoridades públicas**, quando houver obrigação legal ou ordem judicial.",
              ],
            },
          ],
        },
        {
          t: "6. Transferência internacional",
          b: [
            { p: "Alguns fornecedores podem guardar dados em servidores fora do Brasil. Nesses casos, a transferência segue o art. 33 da LGPD, com cláusulas-padrão contratuais aprovadas pela Autoridade Nacional de Proteção de Dados (Resolução CD/ANPD nº 19/2024) ou outro mecanismo previsto em lei." },
          ],
        },
        {
          t: "7. Por quanto tempo guardamos",
          b: [
            {
              tabela: {
                cab: ["Dado", "Prazo"],
                linhas: [
                  ["Respostas ao questionário", "Enquanto durar o contrato e até 30 dias depois, para exportação; em seguida, são excluídas ou mantidas apenas de forma anonimizada, se o Cliente autorizar."],
                  ["Relatórios agregados do PGR", "Ficam com o Cliente, que os guarda pelos prazos da NR-1; a Psyra AI mantém uma cópia enquanto durar o contrato."],
                  ["Contas do painel", "Até 6 meses após o encerramento do contrato."],
                  ["Registros de acesso", "6 meses (Marco Civil da Internet, art. 15)."],
                  ["Contatos comerciais", "Até 12 meses após o último contato, salvo pedido de exclusão antes disso."],
                ],
              },
            },
          ],
        },
        {
          t: "8. Segurança",
          b: [
            { p: "Adotamos medidas técnicas e administrativas para proteger os dados (LGPD, art. 46): conexão criptografada (HTTPS), senhas guardadas apenas em forma de hash, acesso por perfil, isolamento entre empresas, registro encadeado das operações (hash SHA-256), que denuncia qualquer adulteração (art. 37), cópias de segurança e testes automáticos. Em caso de incidente que possa causar risco ou dano relevante, comunicamos o Cliente e, quando cabível, a ANPD e os titulares, nos termos do art. 48 da LGPD e da Resolução CD/ANPD nº 15/2024." },
          ],
        },
        {
          t: "9. Seus direitos e exclusão de conta",
          b: [
            { p: "O titular pode pedir, a qualquer momento (LGPD, art. 18): confirmação de que tratamos seus dados; acesso; correção; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre com quem compartilhamos; revogação do consentimento, quando essa for a base legal; e explicação ou revisão de decisões automatizadas (art. 20). Também pode reclamar à ANPD." },
            { p: "**Exclusão de conta do painel (site e aplicativo):** envie um e-mail para psyra.ai.io@gmail.com com o assunto \"Excluir conta\", a partir do e-mail cadastrado. A conta e os dados de acesso são excluídos em até 15 dias; os registros de acesso ficam guardados pelos 6 meses exigidos pelo Marco Civil e depois são apagados." },
            { p: "**Sobre as respostas ao questionário:** como elas não guardam identificação, em geral não é possível localizar a resposta de uma pessoa específica, e isso é intencional, para proteger quem respondeu. Pedidos sobre respostas são encaminhados ao Cliente, que é o controlador, e a Psyra AI ajuda no atendimento. Respondemos em até 15 dias (art. 19)." },
          ],
        },
        {
          t: "10. Encarregado de dados e contato",
          b: [
            { p: "**Encarregado pelo tratamento de dados pessoais (art. 41 da LGPD e Resolução CD/ANPD nº 18/2024):** Leandro Rodrigues Machado." },
            { p: "**Canal:** psyra.ai.io@gmail.com, com o assunto \"Privacidade\"." },
          ],
        },
        {
          t: "11. Crianças e adolescentes",
          b: [
            { p: "O questionário e o aplicativo são destinados a pessoas com 18 anos ou mais. Aprendizes menores de idade só devem ser convidados após avaliação específica do Cliente e com o consentimento de um dos pais ou responsável (LGPD, art. 14)." },
          ],
        },
        {
          t: "12. Alterações desta Política",
          b: [
            { p: "Esta Política pode ser atualizada. A versão vigente fica nesta página, com a data no topo, e mudanças relevantes são avisadas com antecedência." },
          ],
        },
      ],
    },
  ],
  normasTitulo: "Normas de referência",
  normas: [
    "Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018).",
    "Marco Civil da Internet (Lei 12.965/2014).",
    "NR-1, com a redação da Portaria MTE nº 1.419/2024 (riscos psicossociais no gerenciamento de riscos ocupacionais).",
    "Resoluções CFP nº 6/2019 e nº 9/2024.",
    "Resoluções CD/ANPD nº 15/2024 (incidentes), nº 18/2024 (encarregado) e nº 19/2024 (transferência internacional).",
  ],
  contato: "Dúvidas: psyra.ai.io@gmail.com",
  voltar: "Voltar à página inicial",
  imprimir: "Imprimir ou salvar em PDF",
  topo: "Voltar ao topo",
};

const en = {
  meta: {
    titulo: "Terms of Use and Privacy Policy — Psyra AI",
    descricao:
      "How Psyra AI handles data from respondents, users and visitors: anonymization, group-only results (n ≥ 5), explainable AI (LGPD art. 20) and your rights.",
  },
  rotuloVersao: (v, d) => `Version ${v} · in force since ${d} · under legal review`,
  titulo: "Terms of Use and Privacy Policy",
  aviso: "This is a translation for convenience. The Portuguese version is the binding one.",
  intro: [
    "Psyra AI is a platform that maps psychosocial risks at work from questionnaires with a rating scale and free text in Portuguese, to help companies with the risk management required by Brazil's NR-1. It was created by Vinícius de Lima, Pedro Octávio Rodrigues Jorge and Leandro Rodrigues Machado in the FECAP Artificial Intelligence program (PTI) and is in its validation phase.",
    "This document has two parts: the **Terms of Use** (rules for using the platform, on the website and in the app) and the **Privacy Policy** (how we handle personal data under Brazil's General Data Protection Law, Law 13,709/2018 — LGPD). This version will be reviewed by a lawyer before the pilot with companies; relevant changes will be announced in advance.",
  ],
  sumario: "On this page",
  resumoTitulo: "Summary in 6 points",
  resumo: [
    "**Nobody is identified.** Results appear only per work group with at least 5 answers; smaller groups are hidden.",
    "**Identifying data is erased before storage.** Names, CPF numbers, e-mails and phone numbers written in free text are removed automatically; if removal fails, the answer is not stored.",
    "**Results cannot be used against a person.** They serve collective prevention measures, never to evaluate, punish or dismiss anyone.",
    "**AI does not decide alone.** Each risk indication comes with the factors that weighed most, and the PGR report is reviewed and signed by a psychologist registered with the CRP.",
    "**We do not sell data** and we do not use client answers to train models without express authorization and anonymization.",
    "**You have rights** of access, correction, deletion and explanation. Contact the data protection officer at psyra.ai.io@gmail.com.",
  ],
  partes: [
    {
      id: "termos",
      titulo: "Part A — Terms of Use",
      secoes: [
        { t: "1. Who these Terms apply to", b: [{ p: "By hiring, accessing or using Psyra AI, on the website or in the app, you agree to these Terms. They apply to:" }, { ul: ["**Client:** the company that hires the platform to map its workers' psychosocial risks;", "**Users:** the people the Client appoints to access the dashboard (for example, HR and occupational safety);", "**Respondents:** the workers invited to answer the questionnaire;", "**Visitors:** anyone browsing the Psyra AI website."] }] },
        { t: "2. What the platform does", b: [{ p: "Psyra AI offers: (a) a questionnaire with 1-to-5 scale items and a free-text field; (b) automatic removal of identifying data; (c) risk analysis per homogeneous exposure group (GHE), with at least 5 answers per group; (d) an explanation of the factors that weighed most in each result; (e) a dashboard with aggregated results and a suggested action plan; and (f) a report for the Risk Management Program (PGR), reviewed and signed by a psychologist with active registration at the Regional Psychology Council (CRP). The initial diagnosis is free." }, { p: "**What the platform is not.** Psyra AI does not perform individual psychological assessment, clinical diagnosis or mental health care, and it does not replace occupational risk management, which remains the employer's responsibility under NR-1. In intense distress or an emergency, contact CVV (call 188, 24 hours) or SAMU (192) in Brazil." }] },
        { t: "3. Registration and access", b: [{ ul: ["Dashboard accounts are created for people appointed by the Client, with a corporate e-mail.", "Login and password are personal and non-transferable. The Client is responsible for the access it grants and must notify Psyra AI of any suspected misuse.", "Each profile only sees its own company's data, and every access is logged.", "The questionnaire requires no login: respondents open it through the collection cycle's link or QR code."] }] },
        { t: "4. Rules of use", b: [{ p: "The **Client and Users** agree to:" }, { ul: ["inform workers, before collection, about the purpose of the survey, that participation is voluntary and anonymous, and how results will be used;", "not try to identify Respondents, for example by cross-referencing data, creating groups that are too small or asking for individual answers;", "use results only for collective prevention and work improvement measures, **never** for performance evaluation, promotion, punishment or dismissal;", "not pressure anyone to answer nor retaliate against those who do not;", "not add questions asking for names, employee IDs, contacts or other identifying data;", "not copy, resell, reverse-engineer or scrape the platform."] }, { p: "**Respondents** take part voluntarily and may stop at any time. Please do not write names, contacts or other people's information in the free text; even if that happens, such data is removed automatically before storage." }, { p: "Breaching these rules allows Psyra AI to suspend access and, if necessary, terminate the contract." }] },
        { t: "5. Plans, prices and payment", b: [{ p: "Plans vary by company size. Reference prices: **Sinal**, up to 50 employees, R$ 1,200 per month; **Padrão**, up to 200 employees, R$ 2,500 per month; **Panorama**, up to 1,000 employees, R$ 4,500 per month. Payment terms, adjustments and late-payment conditions are set in the commercial proposal and contract, which prevail over this table. Respondents pay nothing." }] },
        { t: "6. Technical responsibility and the psychologist's role", b: [{ p: "Risk indications are statistical estimates per group, with a margin of error, meant to prioritize actions. Capital-at-risk estimates use FIEMG's public method and show orders of magnitude; they are not a financial, accounting or expert report. The technical interpretation and the PGR report are prepared and signed by a psychologist with active CRP registration, under Federal Psychology Council Resolutions No. 6/2019 (written documents) and No. 9/2024 (psychology mediated by digital technologies). Deciding on and carrying out the measures is up to the Client." }] },
        { t: "7. Availability and support", b: [{ p: "We do our best to keep the platform available and secure, with backups and automated tests on every change. During the validation and pilot phase there is no formal service-level guarantee; scheduled maintenance will be announced in advance whenever possible." }] },
        { t: "8. Intellectual property", b: [{ p: "The platform, models, questionnaire, the Psyra AI brand and the Phrona mascot belong to their creators. Data entered by the Client and the reports generated for it belong to the Client, who may use them freely to meet its obligations." }] },
        { t: "9. Confidentiality", b: [{ p: "The parties keep confidential any non-public information they access under the contract, including results and internal documents, during and after the contract." }] },
        { t: "10. Term, cancellation and data return", b: [{ ul: ["The contract is monthly and renews automatically.", "The Client may cancel at any time with 30 days' notice.", "Up to 30 days after the contract ends, the Client may export the aggregated reports. After that, answers are deleted, except what the law requires us to keep (see Part B, item 7)."] }] },
        { t: "11. Limitation of liability", b: [{ p: "Psyra AI is liable for direct damages proven to be caused by a platform failure, up to the amount paid by the Client in the 12 months before the event, except in cases of intent or gross negligence and where the law does not allow limitation, including under the LGPD. Psyra AI is not liable for decisions made by the Client or for use contrary to these Terms." }] },
        { t: "12. Changes to these Terms", b: [{ p: "We may update these Terms. The version and date are shown at the top of the page, and relevant changes are notified to the Client at least 30 days in advance." }] },
        { t: "13. Governing law and venue", b: [{ p: "These Terms are governed by Brazilian law. The courts of the City of São Paulo (SP) are chosen to settle any disputes." }] },
      ],
    },
    {
      id: "privacidade",
      titulo: "Part B — Privacy Policy",
      secoes: [
        { t: "1. Who is responsible for each piece of data", b: [{ p: "The LGPD distinguishes whoever decides on processing (**controller**) from whoever processes data on their behalf (**processor**):" }, { ul: ["**Questionnaire answers:** the Client is the controller, because it decides to run the survey to comply with NR-1; Psyra AI is the processor and handles answers only according to the Client's instructions and this Policy (LGPD, art. 39).", "**Dashboard account data and website contacts:** Psyra AI is the controller."] }] },
        { t: "2. What data we process and why", b: [{ tabela: { cab: ["Who", "Data", "Purpose", "Legal basis (LGPD)"], linhas: [["Respondents", "Scale answers, free text and department or work group. **We do not ask** for name, CPF, e-mail, phone or employee ID.", "Map psychosocial risks per group for NR-1 risk management.", "Compliance with the Client's legal obligation (art. 7, II, and art. 11, II, a). In the research phase, consent by form (art. 11, I). The basis of each contract is confirmed with the Client."], ["Respondents", "Items on health and exhaustion signs: **sensitive data** (art. 5, II).", "Compose the group's risk; never shown per person.", "The same as above, with the safeguards of art. 11."], ["Respondents", "Time spent per questionnaire part and whether the person gave up (not linked to who answered).", "Measure collection quality per group (rushing, inattention, dropout).", "The Client's legitimate interest in measurement quality (art. 7, IX), always aggregated."], ["Dashboard users", "Name, corporate e-mail, company, access profile and access logs (date, time and action).", "Grant access, protect the account and keep the audit trail.", "Contract performance (art. 7, V); legitimate interest for security (art. 7, IX); log retention (Marco Civil, art. 15)."], ["Website visitors", "Name, e-mail, company, size, interest and, if the person wishes, the self-assessment result.", "Answer the contact or diagnosis request.", "Preliminary procedures at the data subject's request (art. 7, V)."]] } }, { p: "**Contact form:** when submitted, the site opens the visitor's own e-mail program with the message ready; the site server does not store this data." }, { p: "**Browser and app:** we only store language and theme preferences (local storage) and, in the dashboard, the login session. We use no advertising cookies or third-party tracking tools. The hosting provider keeps technical access logs, such as IP addresses, for security; the answer database does **not** store the network address with the answer." }] },
        { t: "3. How we protect answers", b: [{ ul: ["**Automatic removal of identifiers:** before any analysis, names, CPF numbers, e-mails and phone numbers in free text are erased (LGPD, art. 12). If removal fails, the answer is not stored.", "**Group-only results:** the dashboard shows only results aggregated per group with at least 5 answers; smaller groups are hidden, including from the Client.", "**Company isolation:** each company only accesses its own information (row-level security in the database).", "**Restricted technical access:** only the responsible team has technical database access, and every operation is logged."] }] },
        { t: "4. Artificial intelligence and automated decisions", b: [{ ul: ["The calculation estimates the risk level **of each group**, not of people, and shows how much each dimension weighed in the result, in line with art. 20 of the LGPD.", "No decision about a person is made by AI. The action plan is a suggestion; the final report is reviewed and signed by a CRP-registered psychologist, and any data subject may request an explanation or review through the channel in item 10.", "Text is processed in Psyra AI's own environment and is **not sent** to external AI services.", "Client answers are **not used to train models** without the Client's express contractual authorization and, even then, only after anonymization. In the pilot's academic research, use follows the protocol approved by the Research Ethics Committee and the consent form (TCLE)."] }] },
        { t: "5. Who we share with", b: [{ p: "**We do not sell personal data.** We share only what is necessary with:" }, { ul: ["the **Client**, which receives only results aggregated per group;", "the **responsible psychologist**, who reviews aggregated results for the report and is bound by professional secrecy;", "**infrastructure providers** acting as sub-processors under contract: Supabase (database and authentication), Google Cloud (storage) and Render (hosting);", "**public authorities**, when there is a legal obligation or court order."] }] },
        { t: "6. International transfer", b: [{ p: "Some providers may store data on servers outside Brazil. In such cases, the transfer follows art. 33 of the LGPD, with standard contractual clauses approved by the National Data Protection Authority (ANPD Resolution CD/ANPD No. 19/2024) or another mechanism provided by law." }] },
        { t: "7. How long we keep data", b: [{ tabela: { cab: ["Data", "Period"], linhas: [["Questionnaire answers", "For the duration of the contract and up to 30 days after, for export; then deleted or kept only in anonymized form if the Client authorizes."], ["Aggregated PGR reports", "Kept by the Client for the periods required by NR-1; Psyra AI keeps a copy for the duration of the contract."], ["Dashboard accounts", "Up to 6 months after the contract ends."], ["Access logs", "6 months (Marco Civil da Internet, art. 15)."], ["Commercial contacts", "Up to 12 months after the last contact, unless deletion is requested earlier."]] } }] },
        { t: "8. Security", b: [{ p: "We adopt technical and administrative measures to protect data (LGPD, art. 46): encrypted connection (HTTPS), passwords stored only as hashes, profile-based access, isolation between companies, chained operation logs (SHA-256 hash) that reveal any tampering (art. 37), backups and automated tests. In an incident that may cause relevant risk or harm, we notify the Client and, where applicable, the ANPD and data subjects, under art. 48 of the LGPD and ANPD Resolution No. 15/2024." }] },
        { t: "9. Your rights and account deletion", b: [{ p: "Data subjects may request at any time (LGPD, art. 18): confirmation that we process their data; access; correction; anonymization, blocking or deletion of unnecessary data; portability; information on who we share with; withdrawal of consent, when that is the legal basis; and explanation or review of automated decisions (art. 20). They may also complain to the ANPD." }, { p: "**Deleting a dashboard account (website and app):** e-mail psyra.ai.io@gmail.com with the subject \"Delete account\" from the registered address. The account and access data are deleted within 15 days; access logs are kept for the 6 months required by the Marco Civil and then erased." }, { p: "**About questionnaire answers:** since they carry no identification, it is generally impossible to locate a specific person's answer, and that is intentional, to protect respondents. Requests about answers are forwarded to the Client, the controller, and Psyra AI helps handle them. We reply within 15 days (art. 19)." }] },
        { t: "10. Data protection officer and contact", b: [{ p: "**Data protection officer (art. 41 of the LGPD and ANPD Resolution No. 18/2024):** Leandro Rodrigues Machado." }, { p: "**Channel:** psyra.ai.io@gmail.com, subject \"Privacy\"." }] },
        { t: "11. Children and adolescents", b: [{ p: "The questionnaire and the app are intended for people aged 18 or over. Underage apprentices should only be invited after a specific assessment by the Client and with the consent of a parent or guardian (LGPD, art. 14)." }] },
        { t: "12. Changes to this Policy", b: [{ p: "This Policy may be updated. The current version is on this page, with the date at the top, and relevant changes are announced in advance." }] },
      ],
    },
  ],
  normasTitulo: "Reference regulations",
  normas: [
    "Brazilian General Data Protection Law (Law 13,709/2018 — LGPD).",
    "Brazilian Internet Civil Framework (Law 12,965/2014 — Marco Civil da Internet).",
    "NR-1, as amended by MTE Ordinance No. 1,419/2024 (psychosocial risks in occupational risk management).",
    "Federal Psychology Council Resolutions No. 6/2019 and No. 9/2024.",
    "ANPD Resolutions No. 15/2024 (incidents), No. 18/2024 (data protection officer) and No. 19/2024 (international transfer).",
  ],
  contato: "Questions: psyra.ai.io@gmail.com",
  voltar: "Back to the home page",
  imprimir: "Print or save as PDF",
  topo: "Back to top",
};

const zh = {
  meta: {
    titulo: "使用条款与隐私政策 — Psyra AI",
    descricao: "Psyra AI 如何处理受访者、用户和访客的数据：匿名化、仅按组展示结果（n ≥ 5）、可解释的 AI（LGPD 第 20 条）以及您的权利。",
  },
  rotuloVersao: (v, d) => `版本 ${v} · 自 ${d} 起生效 · 法律审核中`,
  titulo: "使用条款与隐私政策",
  aviso: "以下为要点摘要。具有约束力的完整版本为葡萄牙语版，请点击下方链接阅读。",
  intro: [
    "Psyra AI 是一个通过葡萄牙语量表和自由文本问卷识别工作中心理社会风险的平台，帮助巴西企业完成 NR-1 要求的风险管理。由 Vinícius de Lima、Pedro Octávio Rodrigues Jorge 和 Leandro Rodrigues Machado 在 FECAP 人工智能项目（PTI）中创建，目前处于验证阶段。",
  ],
  sumario: "本页内容",
  resumoTitulo: "6 个要点",
  resumo: [
    "**不识别任何个人。** 结果只按至少 5 份回答的工作组显示；更小的组会被隐藏。",
    "**身份信息在保存前删除。** 自由文本中的姓名、CPF、电子邮件和电话会被自动删除；删除失败则不保存该回答。",
    "**结果不能用来针对个人。** 仅用于集体预防措施，绝不用于考核、处罚或解雇。",
    "**AI 不单独做决定。** 每项风险提示都附有影响最大的因素，PGR 报告由在 CRP 注册的心理学家审核并签署。",
    "**我们不出售数据**，未经明确授权和匿名化，不使用客户的回答训练模型。",
    "**您拥有权利**：访问、更正、删除和获得解释。请联系数据保护负责人：psyra.ai.io@gmail.com。",
  ],
  partes: [],
  completo: "阅读完整版本（葡萄牙语）",
  normasTitulo: "参考法规",
  normas: ["巴西《通用数据保护法》（第 13.709/2018 号法律，LGPD）。", "《巴西互联网民事框架》（第 12.965/2014 号法律）。", "NR-1（MTE 第 1.419/2024 号令修订）。"],
  contato: "问题咨询：psyra.ai.io@gmail.com",
  voltar: "返回首页",
  imprimir: "打印或保存为 PDF",
  topo: "返回顶部",
};

export const TEXTOS_LEGAL = { pt, en, zh };
