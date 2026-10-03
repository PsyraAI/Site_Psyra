// Textos das páginas públicas em português, inglês e chinês simplificado. Sprint: S10 | Risco: None
// Regras: números e datas iguais nas três versões; siglas brasileiras (NR-1, PGR, GHE, LGPD,
// CLT, CRP, SESMT) ficam no original com explicação curta; valores sempre em reais (BRL).
// A versão em chinês precisa de revisão por falante nativo antes de uso comercial.

export const TEXTOS = {
  pt: {
    meta: {
      titulo: "Psyra AI — Risco psicossocial e conformidade NR-1 com IA em português",
      descricao:
        "A Psyra AI detecta risco psicossocial lendo texto livre em português, não só notas de 1 a 5. Conformidade NR-1, explicabilidade e resultados sempre agregados por grupo.",
    },
    nav: {
      rotulo: "Seções",
      problema: "O problema",
      solucao: "Solução",
      como: "Como funciona",
      painel: "Painel",
      planos: "Planos",
      privacidade: "Privacidade",
      duvidas: "Dúvidas",
    },
    acoes: {
      entrar: "Entrar no painel",
      diagnostico: "Agendar diagnóstico gratuito",
      verPainel: "Ver painel de exemplo",
      falar: "Falar com a Psyra",
      piloto: "Quero participar do piloto",
    },
    idioma: { rotulo: "Idioma" },
    tema: { claro: "Ativar modo claro", escuro: "Ativar modo escuro" },
    sugestao: null,
    aviso: null,
    ilustrativo: "Dados ilustrativos",
    hero: {
      pill: "Conformidade NR-1 · Portaria MTE 1.419/2024",
      numero: "546 mil",
      titulo: "afastamentos por saúde mental no Brasil em 2025. Sua empresa já sabe onde está o risco?",
      lead:
        "A Psyra AI detecta risco psicossocial lendo o que as pessoas escrevem em português — não apenas notas de 1 a 5. Você enxerga o que uma escala sozinha não mostra, com conformidade NR-1 e resultados sempre por grupo.",
      garantias: [
        "Resultados só por grupo (n ≥ 5)",
        "Texto anonimizado antes de ser gravado",
        "Plano de ação validado por psicóloga com registro no CRP",
      ],
      card: {
        rotulo: "Mesma nota, sinais opostos",
        escala: "Escala",
        texto: "Sinal de risco no texto",
        grupoA: {
          nome: "Grupo A · escala",
          frase: "“A rotina é puxada, mas a equipe se apoia e a liderança ouve.”",
          traducao: null,
          chip: "Sinal de suporte social",
        },
        grupoB: {
          nome: "Grupo B · escala",
          frase: "“Sigo entregando, mas já não durmo direito pensando nas metas.”",
          traducao: null,
          chip: "Sinal de exaustão",
        },
        nota: "Exemplos ilustrativos. Resultados reais são sempre agregados por grupo (n ≥ 5).",
      },
    },
    problema: {
      rotulo: "Contexto",
      titulo: "O problema",
      intro:
        "O adoecimento mental no trabalho virou um risco operacional, financeiro e agora também regulatório.",
      legenda: "afastamentos por saúde mental no Brasil em 2025 (INSS/Dataprev)",
      linhaTitulo: "NR-1: o que mudou em 2026",
      marcos: [
        { data: "26/05/2026", texto: "A NR-1 (Norma Regulamentadora nº 1) passa a exigir os riscos psicossociais no PGR, o Programa de Gerenciamento de Riscos das empresas com empregados CLT." },
        { data: "25/06/2026", texto: "O STF suspende as multas ligadas a esses riscos (ADPF 1316)." },
        { data: "25/09/2026", texto: "A suspensão é prorrogada por 90 dias, com conciliação sobre critérios de avaliação." },
        { data: "Hoje", texto: "A multa está suspensa; a obrigação de mapear e controlar o risco continua." },
      ],
      banner: "Mapear risco psicossocial deixou de ser boa prática: é obrigação legal.",
    },
    solucao: {
      rotulo: "Solução",
      titulo: "Escala de 1 a 5 não conta a história toda",
      intro:
        "A maioria das soluções do mercado se apoia apenas na escala Likert (notas de 1 a 5). A Psyra foi desenhada para ler também o que as pessoas escrevem, em português.",
      cards: [
        {
          t: "IA que entende português",
          d: "Modelo de linguagem em português (MentalBERT-PT, baseado no BERTimbau e em ajuste para o piloto) aplicado ao texto livre, junto com a escala.",
        },
        {
          t: "Explicabilidade",
          d: "O método SHAP mostra quais fatores sustentaram cada indicação de risco do grupo, em linha com o Art. 20 da LGPD, a Lei Geral de Proteção de Dados (planos Padrão e Panorama).",
        },
        {
          t: "Conformidade NR-1",
          d: "Os achados já saem organizados para o mapeamento de riscos e para o PGR, com o plano de ação validado por psicóloga com registro ativo no Conselho Regional de Psicologia (CRP).",
        },
      ],
      revelador: {
        rotulo: "O Revelador",
        titulo: "A mesma nota numérica pode esconder sinais opostos no texto.",
        texto:
          "É exatamente essa diferença que a Psyra captura — e é por isso que dois grupos com médias parecidas podem exigir ações completamente diferentes.",
        grafico: "Mesma escala, leituras diferentes",
        sub: "Índice de 0 a 100 por grupo · grupos com n ≥ 5",
        escala: "Escala",
        texto2: "Texto",
        legenda: "Diferença de 12 pontos ou mais: o texto conta outra história.",
      },
    },
    modelo: {
      rotulo: "Modelo",
      titulo: "Como o modelo de risco se sai",
      intro: "Números medidos em 26 empresas que o modelo não viu no treino, na proporção real das faixas de risco (cerca de 36% baixo, 39% moderado e 25% alto). A base tem 36.000 respostas aos 46 itens do questionário, e a referência de cada resposta é o consenso de três avaliadoras.",
      itens: [
        { v: "0,73", t: "F1-macro", d: "Equilíbrio entre precisão e recall nas três faixas de risco. O máximo possível nesta base é 0,88." },
        { v: "0,89", t: "ROC-AUC", d: "Capacidade de separar as faixas de risco. 0,5 seria o acaso; 1,0, a separação perfeita." },
        { v: "82%", t: "Risco alto encontrado (modo triagem)", d: "No modo triagem, ajustado para deixar passar o mínimo, o modelo encontra 82% dos casos de risco alto; quem fica de fora tem 93% de chance de não ser risco alto (VPN)." },
        { v: "95%", t: "Especificidade no risco alto", d: "No modo padrão, dos casos sem risco alto o modelo descarta 95% corretamente, e 82% dos alertas de risco alto se confirmam." },
        { v: "0,02", t: "Erro de calibração (ECE)", d: "Quando o modelo indica 70% de chance, acerta perto de 70%: a probabilidade é confiável." },
        { v: "r = 0,85", t: "Concordância por grupo", d: "O percentual de risco alto previsto em cada grupo acompanha o percentual de referência." },
      ],
      nota: "A validação de campo acontece no piloto, com respostas reais, depois da aprovação do Comitê de Ética em Pesquisa. Meta com os dados do piloto: F1 ≥ 0,80, ROC-AUC ≥ 0,85 e diferença de acerto entre setores de no máximo 5 pontos (hoje, 5,4).",
    },
    como: {
      rotulo: "Processo",
      titulo: "Como funciona",
      intro: "Quatro passos, do convite da pesquisa ao plano de ação pronto para o PGR.",
      passos: [
        { t: "Pesquisa anônima", d: "Colaboradores respondem em escala e, se quiserem, em texto livre, sem se identificar." },
        { t: "Proteção e análise", d: "O texto é anonimizado antes de ser gravado; depois escala e texto são lidos juntos." },
        { t: "Agregação por grupo", d: "Resultados só existem por grupo homogêneo de exposição (GHE: pessoas sob as mesmas condições de trabalho) com pelo menos 5 respostas. Nunca há resultado individual." },
        { t: "Plano de ação para o PGR", d: "Prioridades e plano de ação por grupo, validados por psicóloga com CRP antes de entrarem no PGR." },
      ],
      instrumento: "Instrumento com 46 itens em 10 dimensões + campo de texto livre opcional.",
      banner: "Nenhum resultado individual é exposto. Tudo é agregado por grupo de no mínimo 5 pessoas (k-anonimato), para ninguém ser identificado.",
    },
    painel: {
      rotulo: "Painel",
      titulo: "Por dentro do painel",
      intro: "Um exemplo do que a empresa vê: onde agir primeiro e por quê. Nada aqui identifica uma pessoa.",
      abas: { riscos: "Riscos por grupo", fatores: "Fatores do grupo" },
      riscos: {
        titulo: "Atendimento pede atenção primeiro",
        sub: "Índice geral por grupo, de 0 a 100",
        niveis: { baixo: "baixo", moderado: "moderado", alto: "alto" },
        oculto: "menos de 5 respostas · oculto",
      },
      fatores: {
        titulo: "Sobrecarga é o fator que mais pesa no Atendimento",
        sub: "Quanto cada fator puxa o índice do grupo, em pontos (explicação SHAP)",
        aumenta: "aumenta o risco",
        protege: "protege",
      },
      grupos: {
        atendimento: "Atendimento",
        operacoes: "Operações",
        comercial: "Comercial",
        ti: "TI",
        financeiro: "Financeiro",
        juridico: "Jurídico",
      },
      fatoresNomes: {
        sobrecarga: "Sobrecarga",
        metas: "Pressão por metas",
        reconhecimento: "Pouco reconhecimento",
        lideranca: "Apoio da liderança",
      },
      rodape:
        "Dados ilustrativos. Resultados reais só por grupo com n ≥ 5; o plano de ação é validado por psicóloga com CRP.",
    },
    entregas: {
      rotulo: "Entregas",
      titulo: "O que sua empresa recebe",
      intro: "Material pensado para o RH, a equipe de segurança e medicina do trabalho (SESMT) e a diretoria usarem no gerenciamento de riscos.",
      itens: [
        { t: "Mapa de risco por grupo (GHE)", d: "Índice por dimensão e nível de risco de cada grupo homogêneo de exposição, para o inventário do PGR." },
        { t: "Explicação dos resultados", d: "Os fatores que mais pesaram em cada grupo e a comparação entre escala e texto (O Revelador)." },
        { t: "Plano de ação priorizado", d: "Ações por grupo, em ordem de prioridade, validadas por psicóloga com CRP." },
        { t: "Registro de conformidade", d: "Método, versão do questionário e trilha de auditoria documentados para a NR-1." },
      ],
      comparacao: {
        titulo: "Pesquisa de clima × mapeamento de risco psicossocial",
        colunas: ["", "Pesquisa de clima", "Psyra"],
        linhas: [
          ["Pergunta central", "As pessoas estão satisfeitas?", "Que condições do trabalho podem adoecer este grupo?"],
          ["Resultado", "Índices de satisfação e engajamento", "Nível de risco e fatores por grupo, com leitura do texto livre"],
          ["Uso na NR-1", "Não é o objetivo", "Alimenta o inventário e o plano de ação do PGR"],
        ],
      },
    },
    planos: {
      rotulo: "Assinatura mensal",
      titulo: "Planos e preços",
      intro: "Preço público, sem surpresa. Escolha a cobertura pelo tamanho da operação.",
      custoTitulo: "O custo por colaborador cai com o porte",
      custoSub: "Valor mensal por colaborador no limite de cada faixa",
      periodo: "/mês",
      porColaborador: "por colaborador/mês",
      recomendado: "Recomendado",
      moeda: null,
      lista: {
        starter: {
          faixa: "Até 50 colaboradores",
          desc: "Entrada para começar o mapeamento de risco psicossocial.",
          itens: [
            "Pesquisa anônima com texto livre",
            "Análise de risco psicossocial por grupo",
            "Painel com indicadores essenciais",
            "Relatório básico para NR-1",
          ],
        },
        professional: {
          faixa: "Até 200 colaboradores",
          desc: "Análise aprofundada, com texto livre e explicabilidade.",
          itens: [
            "Tudo do plano Sinal",
            "Análise de texto livre com explicabilidade (SHAP)",
            "Comparativo entre grupos e áreas",
            "Relatórios periódicos para PGR",
            "Recomendações de plano de ação",
            "Estimativa ilustrativa de capital em risco por setor",
          ],
        },
        enterprise: {
          faixa: "Até 1.000 colaboradores",
          desc: "Cobertura completa, várias unidades e suporte prioritário.",
          itens: [
            "Tudo do plano Padrão",
            "Cobertura de múltiplas unidades e grupos (GHEs)",
            "Relatórios avançados para PGR/NR-1",
            "Acompanhamento contínuo dos indicadores",
            "Trilha de auditoria completa",
            "Suporte prioritário",
          ],
        },
      },
      nota: "Todos os planos começam com um diagnóstico inicial gratuito antes da contratação.",
    },
    confianca: {
      rotulo: "Privacidade",
      titulo: "Como protegemos o anonimato",
      intro:
        "Confiança é pré-requisito para as pessoas responderem com honestidade. Estas regras valem para todos os planos.",
      itens: [
        { t: "Mínimo de 5 respostas", d: "Grupo com menos de 5 respostas não aparece no painel, nem para a empresa contratante." },
        { t: "Anonimização antes de gravar", d: "Nome, CPF, e-mail e telefone saem do texto automaticamente. Se a remoção falhar, a resposta não é gravada." },
        { t: "Nenhum escore individual", d: "O sistema não calcula nem mostra o risco de uma pessoa. A unidade de análise é o grupo." },
        { t: "Regras fixadas antes da coleta", d: "Cada coleta fica ligada a uma versão congelada do questionário; mudar o questionário depois não reescreve o passado." },
        { t: "Trilha de auditoria", d: "Registro encadeado por hash do que foi processado e quando, sem conteúdo pessoal." },
        { t: "LGPD por padrão", d: "Coleta mínima, consentimento explícito e explicação dos resultados, em linha com o Art. 20." },
      ],
      iaTitulo: "O que a IA faz — e o que não faz",
      ia: [
        "Não diagnostica nem avalia pessoas: aponta fatores de risco por grupo.",
        "Toda indicação vem com a explicação dos fatores que pesaram.",
        "O plano de ação só vale depois da revisão de psicóloga com CRP.",
        "Nenhuma resposta é enviada a serviços de IA de terceiros.",
        "Enquanto o modelo de texto está em validação, o painel usa regras e avisa isso na tela.",
      ],
      etica: "A coleta com colaboradores só começa depois da aprovação do Comitê de Ética em Pesquisa.",
      link: "Ler a Política de Privacidade",
    },
    sobre: {
      rotulo: "Parcerias",
      pilotoTitulo: "Programa piloto 2026",
      pilotoTexto:
        "Estamos selecionando empresas para o piloto: diagnóstico gratuito, acompanhamento próximo da equipe e validação clínica por psicóloga com CRP. A coleta com colaboradores só começa depois da aprovação do Comitê de Ética em Pesquisa.",
      equipeTitulo: "Quem está por trás",
      equipeIntro:
        "A Psyra AI nasceu no PTI de Inteligência Artificial da FECAP. São três sócios, com orientação dos professores Glenarisson e Alexandre e uma psicóloga com CRP ativo como consultora externa:",
      pessoas: [
        { nome: "Vinícius de Lima", papel: "Product Owner e Tech Lead" },
        { nome: "Pedro Octávio Rodrigues Jorge", papel: "Desenvolvedor Full Stack e Analista Financeiro" },
        { nome: "Leandro Rodrigues Machado", papel: "Diretor de Marketing, Analista de Dados e DBA" },
      ],
      compromisso: "Nosso compromisso: nenhuma promessa de avaliação individual, nenhum resultado sem explicação.",
      ods: {
        titulo: "Alinhada aos Objetivos de Desenvolvimento Sustentável da ONU",
        itens: [
          { n: 3, nome: "Saúde e bem-estar", t: "Menos adoecimento mental no trabalho." },
          { n: 8, nome: "Trabalho decente e crescimento econômico", t: "Trabalho decente, com o risco psicossocial gerenciado." },
          { n: 9, nome: "Indústria, inovação e infraestrutura", t: "Inovação em IA que lê o português do trabalhador." },
        ],
      },
    },
    prontidao: {
      "menu": "Autoavaliação NR-1",
      "rotulo": "Autoavaliação",
      "titulo": "Sua empresa está pronta para a NR-1?",
      "intro": "Oito perguntas, menos de dois minutos. Veja em que ponto sua empresa está no mapeamento de riscos psicossociais e por onde começar. É uma autoavaliação orientativa, não substitui a avaliação técnica.",
      "privado": "As respostas ficam só nesta página: nada é enviado nem gravado.",
      "progresso": "respondidas",
      "opcoes": {
        "sim": "Sim",
        "parte": "Em parte",
        "nao": "Não"
      },
      "perguntas": [
        {
          "p": "O inventário de riscos do PGR já inclui os fatores de risco psicossociais?",
          "curta": "Incluir os riscos psicossociais no inventário do PGR"
        },
        {
          "p": "Os grupos de trabalhadores com exposição parecida (GHEs) estão definidos?",
          "curta": "Definir os grupos homogêneos de exposição (GHEs)"
        },
        {
          "p": "Os trabalhadores já foram ouvidos sobre esses fatores com um questionário estruturado?",
          "curta": "Ouvir os trabalhadores com um instrumento estruturado"
        },
        {
          "p": "As respostas são analisadas só por grupo, com anonimato garantido?",
          "curta": "Garantir anonimato e análise só por grupo"
        },
        {
          "p": "Existe plano de ação com responsáveis e prazos para os riscos psicossociais?",
          "curta": "Montar o plano de ação com responsáveis e prazos"
        },
        {
          "p": "O processo está documentado (método, data, versão do questionário) para mostrar numa fiscalização?",
          "curta": "Documentar método e evidências"
        },
        {
          "p": "Um profissional habilitado, como psicóloga com registro no CRP, participa da análise?",
          "curta": "Envolver profissional habilitado na análise"
        },
        {
          "p": "Há data marcada para reavaliar e ver se as ações funcionaram?",
          "curta": "Programar a reavaliação periódica"
        }
      ],
      "faixas": [
        {
          "min": 13,
          "nome": "Avançada",
          "tom": "ok",
          "texto": "Sua empresa já tem a base. O diagnóstico gratuito ajuda a conferir as evidências e a enxergar o que a escala sozinha não mostra: o que as pessoas escrevem."
        },
        {
          "min": 7,
          "nome": "Em andamento",
          "tom": "alerta",
          "texto": "Há passos importantes feitos, mas faltam peças que a NR-1 cobra. O diagnóstico gratuito mostra o que falta e em que ordem fazer."
        },
        {
          "min": 0,
          "nome": "No começo",
          "tom": "perigo",
          "texto": "O mapeamento psicossocial ainda está no início, como em muitas empresas desde maio de 2026. O diagnóstico gratuito monta o caminho com você."
        }
      ],
      "lacunasTitulo": "Por onde começar:",
      "cta": "Quero o diagnóstico gratuito",
      "limpar": "Refazer a autoavaliação",
      "anexada": "Resultado da autoavaliação que vai junto com o pedido:",
      "rotuloEmail": "Autoavaliação NR-1"
    },
    continuidade: {
      "rotulo": "Depois da contratação",
      "titulo": "Um ciclo contínuo, não um relatório na gaveta",
      "intro": "O risco psicossocial muda com metas, equipes e lideranças. Por isso a Psyra acompanha a empresa em ciclos: medir, agir e medir de novo.",
      "ciclo": [
        {
          "quando": "Início",
          "t": "Implantação assistida",
          "d": "Definimos com o RH e o SESMT os grupos (GHEs), o período de coleta e a comunicação aos colaboradores."
        },
        {
          "quando": "Coleta",
          "t": "Painel por grupo",
          "d": "Os resultados aparecem assim que cada grupo chega a 5 respostas, com os fatores que mais pesaram."
        },
        {
          "quando": "Plano",
          "t": "Ações com responsável e prazo",
          "d": "Plano de ação priorizado, validado por psicóloga com CRP e acompanhado no painel."
        },
        {
          "quando": "Reavaliação",
          "t": "Medir de novo",
          "d": "Nova coleta para ver se as ações reduziram o risco e para atualizar o PGR."
        },
        {
          "quando": "Sempre",
          "t": "Evidências para auditoria",
          "d": "Método, versão do questionário e histórico registrados para mostrar o processo à fiscalização."
        }
      ],
      "apoioTitulo": "Você não fica sozinho com o painel",
      "apoio": [
        "Implantação assistida e leitura dos resultados com a equipe Psyra",
        "Suporte em todos os planos, prioritário no Panorama",
        "Diagnóstico inicial gratuito antes de qualquer contratação"
      ]
    },
    ctaFixo: {
      "texto": "Diagnóstico NR-1 gratuito",
      "botao": "Agendar"
    },
    faq: {
      rotulo: "Dúvidas",
      titulo: "Perguntas frequentes",
      itens: [
        {
          p: "O que inclui o diagnóstico gratuito?",
          r: "Uma conversa com a equipe para entender onde a empresa está na NR-1 (a autoavaliação desta página ajuda), uma demonstração do painel com dados de exemplo e uma proposta de grupos (GHEs) e de cronograma de coleta. Não tem custo nem obriga a contratar.",
        },
        {
          p: "A empresa consegue ver a resposta de cada colaborador?",
          r: "Não. Os resultados só existem por grupo (GHE) com pelo menos 5 respostas. Grupos menores ficam ocultos.",
        },
        {
          p: "O que acontece com o texto livre?",
          r: "Antes de ser gravado, o texto passa por anonimização automática (nome, CPF, e-mail, telefone). Ele é lido só em conjunto com o grupo e nunca é exibido de forma individual.",
        },
        {
          p: "E se o resultado de uma área vier ruim?",
          r: "O resultado é ponto de partida, não julgamento. O painel mostra os fatores que mais pesaram, e o plano de ação, validado por psicóloga com CRP, define o que fazer primeiro.",
        },
        {
          p: "A IA toma alguma decisão sobre alguém?",
          r: "Não. A Psyra não avalia pessoas: aponta fatores de risco por grupo, com explicação. As decisões ficam com a empresa e com a psicóloga responsável.",
        },
        {
          p: "A Psyra substitui a psicóloga ou a equipe de segurança do trabalho (SESMT)?",
          r: "Não. A Psyra organiza evidências e prioridades; o plano de ação é validado por psicóloga com CRP e integra o PGR da empresa.",
        },
        {
          p: "Isso atende à NR-1?",
          r: "A NR-1 (Portaria MTE 1.419/2024) exige, desde 26/05/2026, que os riscos psicossociais entrem no gerenciamento de riscos ocupacionais. A Psyra entrega o mapeamento por grupo e o plano de ação para compor o PGR. Desde junho/2026 as multas ligadas a esses riscos estão suspensas por decisão do STF (ADPF 1316, prorrogada em setembro), mas a obrigação de gerenciar o risco continua valendo.",
        },
        {
          p: "A IA da Psyra já está validada?",
          r: "O modelo da escala já foi treinado e testado em empresas que ele não viu no treino: F1 de 0,73 e ROC-AUC de 0,89 (seção Modelo). A validação de campo, com respostas reais, acontece no piloto, depois da aprovação do Comitê de Ética em Pesquisa. O modelo de texto (MentalBERT-PT) ainda está em ajuste; até lá, o painel usa regras e avisa isso na tela.",
        },
        {
          p: "Que questionário os colaboradores respondem?",
          r: "Um questionário próprio de 46 itens em 10 dimensões, inspirado no COPSOQ e adaptado à NR-1, com um campo opcional de texto livre. A versão final dos itens é validada pela psicóloga responsável antes do uso.",
        },
        {
          p: "Como fica a LGPD?",
          r: "Coletamos o mínimo, anonimizamos o texto antes de gravar e mostramos resultados só por grupo. Base legal, prazo de guarda dos dados e encarregado serão formalizados com parecer jurídico antes do piloto.",
        },
        {
          p: "Quanto tempo leva?",
          r: "A coleta fica aberta pelo período que a empresa definir; os resultados por grupo ficam disponíveis assim que cada grupo atinge 5 respostas.",
        },
        {
          p: "Em quais idiomas funciona?",
          r: "O questionário e a análise de texto funcionam em português do Brasil. As páginas em inglês e chinês explicam o produto para leitores internacionais; aplicar o questionário em outro idioma exigiria adaptação e validação próprias.",
        },
      ],
    },
    contato: {
      rotulo: "Contato",
      titulo: "Comece pelo diagnóstico gratuito",
      intro:
        "Em uma conversa rápida mostramos como a Psyra lê texto livre em português, como os resultados são agregados por grupo e o que sua empresa precisa entregar na NR-1.",
      campos: {
        nome: "Nome",
        empresa: "Empresa",
        email: "E-mail corporativo",
        telefone: "Telefone",
        porte: "Número aproximado de colaboradores (opcional)",
        selecione: "Selecione",
        interesse: "O que você procura?",
      },
      faixas: ["Até 50", "51 a 200", "201 a 1.000", "Mais de 1.000"],
      interesses: ["Diagnóstico gratuito", "Participar do piloto 2026", "Conhecer os planos", "Outro assunto"],
      consentimentoAntes: "Li a ",
      consentimentoLink: "Política de Privacidade",
      consentimentoDepois: " e autorizo o uso destes dados apenas para contato sobre o diagnóstico.",
      assunto: "Diagnóstico gratuito",
      naoInformado: "Não informado",
      okTitulo: "E-mail preparado",
      okTexto: "Abrimos seu aplicativo de e-mail com a solicitação pronta. Se ele não abrir, escreva para",
      direto: "Prefere escrever direto?",
    },
    rodape: {
      descricao:
        "Detecção preditiva de riscos psicossociais em português, com conformidade NR-1 e resultados sempre agregados por grupo.",
      navegacao: "Navegação",
      sobre: "Sobre",
      contato: "Contato",
      privacidade: "Política de Privacidade",
      direitos: "Todos os direitos reservados.",
      origem: "PTI de Inteligência Artificial · FECAP",
    },
    privacidade: {
      titulo: "Política de Privacidade",
      intro:
        "Privacidade é condição para que as pessoas respondam com honestidade. Esta página resume como a Psyra AI trata dados.",
      aviso:
        "Versão preliminar: base legal, prazo de guarda e encarregado de dados serão formalizados com parecer jurídico antes do piloto.",
      voltar: "Voltar à página inicial",
      blocos: [
        {
          t: "Dados tratados",
          d: "Respostas de pesquisas organizacionais, em escala e em texto livre, coletadas de forma anônima e tratadas para mapear riscos psicossociais.",
        },
        {
          t: "Anonimização",
          d: "Nome, CPF, e-mail e telefone presentes no texto são removidos automaticamente antes de a resposta ser gravada. Se a remoção falhar, a resposta não é gravada.",
        },
        {
          t: "Agregação por grupo",
          d: "Os resultados existem apenas de forma agregada por grupo homogêneo de exposição (GHE), com no mínimo 5 respostas. Não há resultado individual, nem para a empresa contratante.",
        },
        {
          t: "Explicabilidade",
          d: "As indicações de risco vêm acompanhadas de explicação dos fatores (SHAP), em linha com o Art. 20 da LGPD.",
        },
        {
          t: "Auditoria",
          d: "Registros encadeados por hash permitem verificar o que foi processado e quando, sem expor conteúdo pessoal.",
        },
        { t: "Contato", d: "Dúvidas sobre tratamento de dados podem ser enviadas para" },
      ],
    },
  },

  en: {
    meta: {
      titulo: "Psyra AI — Psychosocial risk and NR-1 compliance with AI that reads Portuguese",
      descricao:
        "Psyra AI detects psychosocial risk in Brazilian companies by reading free text in Portuguese, not just 1-to-5 scores. NR-1 compliance, explainability and results always aggregated by group.",
    },
    nav: {
      rotulo: "Sections",
      problema: "The problem",
      solucao: "Solution",
      como: "How it works",
      painel: "Dashboard",
      planos: "Pricing",
      privacidade: "Privacy",
      duvidas: "FAQ",
    },
    acoes: {
      entrar: "Sign in",
      diagnostico: "Book a free assessment",
      verPainel: "See a sample dashboard",
      falar: "Talk to Psyra",
      piloto: "Join the pilot",
    },
    idioma: { rotulo: "Language" },
    tema: { claro: "Switch to light mode", escuro: "Switch to dark mode" },
    sugestao: {
      texto: "This page is also available in English.",
      ir: "View in English",
      ficar: "Keep Portuguese",
    },
    aviso:
      "Psyra is built for companies in Brazil. The questionnaire and the text analysis work in Brazilian Portuguese only; this page is a translation for international readers.",
    ilustrativo: "Illustrative data",
    hero: {
      pill: "NR-1 compliance · Brazil's workplace safety rule",
      numero: "546,000",
      titulo: "mental-health sick leaves in Brazil in 2025. Does your company know where the risk is?",
      lead:
        "Psyra AI detects psychosocial risk by reading what employees write in Portuguese — not just 1-to-5 scores. You see what a rating scale alone misses, with NR-1 compliance and results always reported by group.",
      garantias: [
        "Results by group only (n ≥ 5)",
        "Text anonymized before it is stored",
        "Action plan validated by a licensed psychologist",
      ],
      card: {
        rotulo: "Same score, opposite signals",
        escala: "Scale",
        texto: "Risk signal in the text",
        grupoA: {
          nome: "Group A · scale",
          frase: "“A rotina é puxada, mas a equipe se apoia e a liderança ouve.”",
          traducao: "“The routine is demanding, but the team supports each other and leadership listens.”",
          chip: "Social support signal",
        },
        grupoB: {
          nome: "Group B · scale",
          frase: "“Sigo entregando, mas já não durmo direito pensando nas metas.”",
          traducao: "“I keep delivering, but I can't sleep properly thinking about targets.”",
          chip: "Exhaustion signal",
        },
        nota: "Illustrative examples, shown in the original Portuguese. Real results are always aggregated by group (n ≥ 5).",
      },
    },
    problema: {
      rotulo: "Context",
      titulo: "The problem",
      intro: "Mental ill health at work has become an operational, financial and now also regulatory risk in Brazil.",
      legenda: "mental-health sick leaves in Brazil in 2025 (INSS/Dataprev, Brazil's social security)",
      linhaTitulo: "NR-1: what changed in 2026",
      marcos: [
        {
          data: "May 26, 2026",
          texto: "NR-1 (Brazil's Regulatory Standard No. 1) requires psychosocial risks in the risk management program (PGR) of every company with formal employees.",
        },
        { data: "Jun 25, 2026", texto: "Brazil's Supreme Court (STF) suspends the fines tied to these risks (ADPF 1316)." },
        { data: "Sep 25, 2026", texto: "The suspension is extended for 90 days while assessment criteria are negotiated." },
        { data: "Today", texto: "Fines are suspended; the duty to map and control the risk still applies." },
      ],
      banner: "Mapping psychosocial risk is no longer a good practice: it is a legal duty in Brazil.",
    },
    solucao: {
      rotulo: "Solution",
      titulo: "A 1-to-5 scale doesn't tell the whole story",
      intro:
        "Most tools rely on Likert scales alone. Psyra was designed to also read what people write, in Portuguese.",
      cards: [
        {
          t: "AI that reads Portuguese",
          d: "A Portuguese language model (MentalBERT-PT, based on BERTimbau and being tuned for the pilot) applied to free text, together with the scale.",
        },
        {
          t: "Explainability",
          d: "The SHAP method shows which factors drove each group's risk indication, in line with Article 20 of the LGPD, Brazil's data protection law (Padrão and Panorama plans).",
        },
        {
          t: "NR-1 compliance",
          d: "Findings come out organized for risk mapping and the PGR, with the action plan validated by a licensed psychologist (CRP).",
        },
      ],
      revelador: {
        rotulo: "The Revealer",
        titulo: "The same numeric score can hide opposite signals in the text.",
        texto:
          "That gap is exactly what Psyra captures — and why two groups with similar averages may need completely different actions.",
        grafico: "Same scale, different readings",
        sub: "0–100 index per group · groups with n ≥ 5",
        escala: "Scale",
        texto2: "Text",
        legenda: "A gap of 12 points or more: the text tells a different story.",
      },
    },
    modelo: {
      rotulo: "Model",
      titulo: "How the risk model performs",
      intro: "Measured on 26 companies the model did not see during training, at the real share of each risk level (about 36% low, 39% moderate and 25% high). The dataset has 36,000 answers to the 46 questionnaire items, and the reference for each answer is the consensus of three raters.",
      itens: [
        { v: "0.73", t: "Macro F1", d: "Balance between precision and recall across the three risk levels. The best possible score on this dataset is 0.88." },
        { v: "0.89", t: "ROC-AUC", d: "How well the model separates the risk levels. 0.5 would be chance; 1.0, perfect separation." },
        { v: "82%", t: "High risk found (screening mode)", d: "In screening mode, tuned to miss as few as possible, the model finds 82% of high-risk cases; those it clears have a 93% chance of not being high risk (NPV)." },
        { v: "95%", t: "Specificity for high risk", d: "In standard mode, the model correctly clears 95% of the cases without high risk, and 82% of its high-risk alerts are confirmed." },
        { v: "0.02", t: "Calibration error (ECE)", d: "When the model says 70%, it is right about 70% of the time: the probability can be trusted." },
        { v: "r = 0.85", t: "Agreement by group", d: "The predicted share of high risk in each group tracks the reference share." },
      ],
      nota: "Field validation happens in the pilot, with real answers, after Research Ethics Committee approval. Target on pilot data: F1 ≥ 0.80, ROC-AUC ≥ 0.85 and an accuracy gap between sectors of at most 5 points (today, 5.4).",
    },
    como: {
      rotulo: "Process",
      titulo: "How it works",
      intro: "Four steps, from the survey invitation to an action plan ready for the PGR.",
      passos: [
        { t: "Anonymous survey", d: "Employees answer on a scale and, if they want, in free text, without identifying themselves." },
        { t: "Protection and analysis", d: "Text is anonymized before it is stored; then scale and text are read together." },
        { t: "Group aggregation", d: "Results exist only per exposure group (GHE) with at least 5 answers. There is never an individual result." },
        { t: "Action plan for the PGR", d: "Priorities and an action plan per group, validated by a licensed psychologist before entering the PGR." },
      ],
      instrumento: "Questionnaire with 46 items across 10 dimensions + an optional free-text field (Portuguese).",
      banner: "No individual result is ever shown. Everything is aggregated by groups of at least 5 people (k-anonymity), so nobody can be identified.",
    },
    painel: {
      rotulo: "Dashboard",
      titulo: "Inside the dashboard",
      intro: "An example of what the company sees: where to act first and why. Nothing here identifies a person.",
      abas: { riscos: "Risk by group", fatores: "Group drivers" },
      riscos: {
        titulo: "Customer Service needs attention first",
        sub: "Overall index per group, 0 to 100",
        niveis: { baixo: "low", moderado: "moderate", alto: "high" },
        oculto: "fewer than 5 answers · hidden",
      },
      fatores: {
        titulo: "Workload is the biggest driver in Customer Service",
        sub: "How much each factor moves the group index, in points (SHAP explanation)",
        aumenta: "raises risk",
        protege: "protects",
      },
      grupos: {
        atendimento: "Customer Service",
        operacoes: "Operations",
        comercial: "Sales",
        ti: "IT",
        financeiro: "Finance",
        juridico: "Legal",
      },
      fatoresNomes: {
        sobrecarga: "Workload",
        metas: "Pressure to hit targets",
        reconhecimento: "Little recognition",
        lideranca: "Leadership support",
      },
      rodape:
        "Illustrative data. Real results only per group with n ≥ 5; the action plan is validated by a licensed psychologist.",
    },
    entregas: {
      rotulo: "Deliverables",
      titulo: "What your company gets",
      intro: "Material built for HR, occupational health and safety (SESMT) and leadership to use in risk management.",
      itens: [
        { t: "Risk map per GHE", d: "Index per dimension and risk level for each homogeneous exposure group, for the PGR inventory." },
        { t: "Explained results", d: "The factors that weighed most in each group and the scale-versus-text comparison (The Revealer)." },
        { t: "Prioritized action plan", d: "Actions per group, in order of priority, validated by a licensed psychologist." },
        { t: "Compliance record", d: "Method, questionnaire version and audit trail documented for NR-1." },
      ],
      comparacao: {
        titulo: "Engagement survey × psychosocial risk mapping",
        colunas: ["", "Engagement survey", "Psyra"],
        linhas: [
          ["Core question", "Are people satisfied?", "Which working conditions could make this group ill?"],
          ["Output", "Satisfaction and engagement scores", "Risk level and drivers per GHE, including free-text reading"],
          ["Use for NR-1", "Not its purpose", "Feeds the PGR risk inventory and action plan"],
        ],
      },
    },
    planos: {
      rotulo: "Monthly subscription",
      titulo: "Plans and pricing",
      intro: "Public prices, no surprises. Pick the coverage that fits the size of your operation.",
      custoTitulo: "Cost per employee drops as you grow",
      custoSub: "Monthly price per employee at the top of each tier",
      periodo: "/month",
      porColaborador: "per employee/month",
      recomendado: "Recommended",
      moeda: "Prices in Brazilian reais (BRL).",
      lista: {
        starter: {
          faixa: "Up to 50 employees",
          desc: "An entry point to start mapping psychosocial risk.",
          itens: [
            "Anonymous survey with free text",
            "Psychosocial risk analysis by group",
            "Dashboard with core indicators",
            "Basic NR-1 report",
          ],
        },
        professional: {
          faixa: "Up to 200 employees",
          desc: "In-depth analysis, with free text and explainability.",
          itens: [
            "Everything in Sinal",
            "Free-text analysis with explainability (SHAP)",
            "Comparison across groups and areas",
            "Periodic PGR reports",
            "Action plan recommendations",
            "Illustrative estimate of capital at risk per department",
          ],
        },
        enterprise: {
          faixa: "Up to 1,000 employees",
          desc: "Full coverage, multiple sites and priority support.",
          itens: [
            "Everything in Padrão",
            "Coverage of multiple sites and GHEs",
            "Advanced PGR/NR-1 reports",
            "Continuous indicator tracking",
            "Full audit trail",
            "Priority support",
          ],
        },
      },
      nota: "Every plan starts with a free initial assessment before you sign up.",
    },
    confianca: {
      rotulo: "Privacy",
      titulo: "How we protect anonymity",
      intro: "Trust is what makes people answer honestly. These rules apply to every plan.",
      itens: [
        { t: "Minimum of 5 answers", d: "A group with fewer than 5 answers does not appear on the dashboard — not even for the client company." },
        { t: "Anonymized before storage", d: "Names, CPF (Brazilian tax ID), e-mails and phone numbers are removed from the text automatically. If removal fails, the answer is not stored." },
        { t: "No individual scores", d: "The system never computes or shows one person's risk. The unit of analysis is the group." },
        { t: "Rules fixed before collection", d: "Each survey is tied to a frozen questionnaire version; changing the questionnaire later does not rewrite the past." },
        { t: "Audit trail", d: "A hash-chained log of what was processed and when, with no personal content." },
        { t: "LGPD by design", d: "Minimal collection, explicit consent and explained results, in line with Article 20 of Brazil's data protection law." },
      ],
      iaTitulo: "What the AI does — and doesn't do",
      ia: [
        "It does not diagnose or assess people: it points to risk factors per group.",
        "Every indication comes with the factors that drove it.",
        "The action plan only counts after review by a licensed psychologist.",
        "No answer is sent to third-party AI services.",
        "While the text model is being validated, the dashboard uses rules and says so on screen.",
      ],
      etica: "Data collection with employees only starts after approval by a Research Ethics Committee (CEP).",
      link: "Read the Privacy Policy",
    },
    sobre: {
      rotulo: "Partners",
      pilotoTitulo: "2026 pilot program",
      pilotoTexto:
        "We are selecting companies for the pilot: a free assessment, close support from the team and clinical validation by a licensed psychologist. Data collection with employees only starts after approval by a Research Ethics Committee.",
      equipeTitulo: "Who is behind it",
      equipeIntro:
        "Psyra AI started in the Artificial Intelligence PTI (integrated project) at FECAP (São Paulo). It is run by three partners, advised by Professors Glenarisson and Alexandre, with a licensed psychologist as an external consultant:",
      pessoas: [
        { nome: "Vinícius de Lima", papel: "Product Owner and Tech Lead" },
        { nome: "Pedro Octávio Rodrigues Jorge", papel: "Full-Stack Developer and Financial Analyst" },
        { nome: "Leandro Rodrigues Machado", papel: "Marketing Director, Data Analyst and DBA" },
      ],
      compromisso: "Our commitment: no promise of individual assessment, no result without an explanation.",
      ods: {
        titulo: "Aligned with the UN Sustainable Development Goals",
        itens: [
          { n: 3, nome: "Good health and well-being", t: "Less mental illness at work." },
          { n: 8, nome: "Decent work and economic growth", t: "Decent work, with psychosocial risk managed." },
          { n: 9, nome: "Industry, innovation and infrastructure", t: "AI innovation that reads workers' Portuguese." },
        ],
      },
    },
    prontidao: {
      "menu": "NR-1 self-assessment",
      "rotulo": "Self-assessment",
      "titulo": "Is your company ready for NR-1?",
      "intro": "Eight questions, under two minutes. See where your company stands on psychosocial risk mapping and where to start. It is a guidance tool, not a technical assessment.",
      "privado": "Your answers stay on this page: nothing is sent or stored.",
      "progresso": "answered",
      "opcoes": {
        "sim": "Yes",
        "parte": "Partly",
        "nao": "No"
      },
      "perguntas": [
        {
          "p": "Does the PGR risk inventory already include psychosocial risk factors?",
          "curta": "Add psychosocial risks to the PGR inventory"
        },
        {
          "p": "Are the groups of workers with similar exposure (GHEs) defined?",
          "curta": "Define the similar-exposure groups (GHEs)"
        },
        {
          "p": "Have workers been heard on these factors through a structured questionnaire?",
          "curta": "Hear workers with a structured instrument"
        },
        {
          "p": "Are answers analysed only by group, with anonymity guaranteed?",
          "curta": "Guarantee anonymity and group-only analysis"
        },
        {
          "p": "Is there an action plan with owners and deadlines for psychosocial risks?",
          "curta": "Build the action plan with owners and deadlines"
        },
        {
          "p": "Is the process documented (method, date, questionnaire version) to show an inspector?",
          "curta": "Document the method and evidence"
        },
        {
          "p": "Does a qualified professional, such as a licensed psychologist (CRP), take part in the analysis?",
          "curta": "Involve a qualified professional in the analysis"
        },
        {
          "p": "Is there a date to reassess and check whether the actions worked?",
          "curta": "Schedule periodic reassessment"
        }
      ],
      "faixas": [
        {
          "min": 13,
          "nome": "Advanced",
          "tom": "ok",
          "texto": "Your company has the groundwork. The free assessment helps check the evidence and see what a scale alone misses: what people write."
        },
        {
          "min": 7,
          "nome": "In progress",
          "tom": "alerta",
          "texto": "Important steps are done, but pieces NR-1 requires are missing. The free assessment shows what is missing and in which order to act."
        },
        {
          "min": 0,
          "nome": "Getting started",
          "tom": "perigo",
          "texto": "Psychosocial mapping is just starting, as in many companies since May 2026. The free assessment maps the path with you."
        }
      ],
      "lacunasTitulo": "Where to start:",
      "cta": "Get the free assessment",
      "limpar": "Start over",
      "anexada": "Self-assessment result sent with your request:",
      "rotuloEmail": "NR-1 self-assessment"
    },
    continuidade: {
      "rotulo": "After you sign",
      "titulo": "A continuous cycle, not a report in a drawer",
      "intro": "Psychosocial risk changes with targets, teams and leaders. That is why Psyra works with companies in cycles: measure, act and measure again.",
      "ciclo": [
        {
          "quando": "Start",
          "t": "Assisted onboarding",
          "d": "With HR and the occupational safety team (SESMT) we define the groups (GHEs), the survey period and the message to employees."
        },
        {
          "quando": "Survey",
          "t": "Dashboard by group",
          "d": "Results appear as soon as each group reaches 5 answers, with the factors that weighed most."
        },
        {
          "quando": "Plan",
          "t": "Actions with owners and deadlines",
          "d": "A prioritized action plan, validated by a licensed psychologist and tracked in the dashboard."
        },
        {
          "quando": "Reassess",
          "t": "Measure again",
          "d": "A new survey to check whether the actions reduced risk and to update the PGR."
        },
        {
          "quando": "Always",
          "t": "Evidence for audits",
          "d": "Method, questionnaire version and history recorded to show the process to inspectors."
        }
      ],
      "apoioTitulo": "You are not left alone with the dashboard",
      "apoio": [
        "Assisted onboarding and a results walkthrough with the Psyra team",
        "Support on every plan, priority on Panorama",
        "Free initial assessment before any contract"
      ]
    },
    ctaFixo: {
      "texto": "Free NR-1 assessment",
      "botao": "Book"
    },
    faq: {
      rotulo: "FAQ",
      titulo: "Frequently asked questions",
      itens: [
        {
          p: "What does the free assessment include?",
          r: "A conversation with the team to see where the company stands on NR-1 (the self-assessment on this page helps), a demo of the dashboard with sample data and a proposal of groups (GHEs) and survey schedule. It is free and does not commit you to a contract.",
        },
        {
          p: "Can the company see each employee's answers?",
          r: "No. Results only exist per group (GHE) with at least 5 answers. Smaller groups are hidden.",
        },
        {
          p: "What happens to the free text?",
          r: "Before it is stored, the text is automatically anonymized (names, CPF, e-mail, phone). It is only read together with the group and is never shown individually.",
        },
        {
          p: "What if an area gets a bad result?",
          r: "A result is a starting point, not a verdict. The dashboard shows the factors that weighed most, and the action plan — validated by a licensed psychologist — sets what to do first.",
        },
        {
          p: "Does the AI make decisions about anyone?",
          r: "No. Psyra does not assess people: it points to risk factors per group, with an explanation. Decisions stay with the company and the responsible psychologist.",
        },
        {
          p: "Does Psyra replace the psychologist or the safety team (SESMT)?",
          r: "No. Psyra organizes evidence and priorities; the action plan is validated by a licensed psychologist and becomes part of the company's PGR.",
        },
        {
          p: "Does this meet NR-1?",
          r: "Since May 26, 2026, NR-1 (Ordinance MTE 1,419/2024) requires psychosocial risks in occupational risk management. Psyra delivers group-level mapping and the action plan for the PGR. Since June 2026 the related fines have been suspended by Brazil's Supreme Court (ADPF 1316, extended in September), but the duty to manage the risk still applies.",
        },
        {
          p: "Is Psyra's AI already validated?",
          r: "The scale model has been trained and tested on companies it did not see in training: F1 of 0.73 and ROC-AUC of 0.89 (Model section). Field validation, with real answers, happens in the pilot after Research Ethics Committee approval. The text model (MentalBERT-PT) is still being tuned; until then, the dashboard uses rules and says so on screen.",
        },
        {
          p: "Which questionnaire do employees answer?",
          r: "Psyra's own questionnaire: 46 items in 10 dimensions, inspired by COPSOQ and adapted to NR-1, with an optional free-text field. The final items are validated by the responsible psychologist before use.",
        },
        {
          p: "What about data protection (LGPD)?",
          r: "We collect the minimum, anonymize text before storing it and show results by group only. The legal basis, retention period and data protection officer will be formalized with a legal opinion before the pilot.",
        },
        {
          p: "How long does it take?",
          r: "The survey stays open for as long as the company decides; group results become available as soon as each group reaches 5 answers.",
        },
        {
          p: "Which languages does it support?",
          r: "The questionnaire and the text analysis work in Brazilian Portuguese. The English and Chinese pages explain the product to international readers; running the questionnaire in another language would require its own adaptation and validation.",
        },
      ],
    },
    contato: {
      rotulo: "Contact",
      titulo: "Start with a free assessment",
      intro:
        "In a short call we show how Psyra reads free text in Portuguese, how results are aggregated by group and what your company needs to deliver for NR-1.",
      campos: {
        nome: "Name",
        empresa: "Company",
        email: "Work e-mail",
        telefone: "Phone",
        porte: "Approximate number of employees (optional)",
        selecione: "Select",
        interesse: "What are you looking for?",
      },
      faixas: ["Up to 50", "51 to 200", "201 to 1,000", "More than 1,000"],
      interesses: ["Free assessment", "Join the 2026 pilot", "Learn about the plans", "Something else"],
      consentimentoAntes: "I have read the ",
      consentimentoLink: "Privacy Policy",
      consentimentoDepois: " and agree to this data being used only to contact me about the assessment.",
      assunto: "Free assessment",
      naoInformado: "Not provided",
      okTitulo: "E-mail ready",
      okTexto: "We opened your e-mail app with the request filled in. If it didn't open, write to",
      direto: "Prefer to write directly?",
    },
    rodape: {
      descricao:
        "Predictive detection of psychosocial risk in Portuguese, with NR-1 compliance and results always aggregated by group.",
      navegacao: "Navigation",
      sobre: "About",
      contato: "Contact",
      privacidade: "Privacy Policy",
      direitos: "All rights reserved.",
      origem: "Artificial Intelligence PTI · FECAP",
    },
    privacidade: {
      titulo: "Privacy Policy",
      intro: "Privacy is what allows people to answer honestly. This page summarizes how Psyra AI handles data.",
      aviso:
        "Preliminary version: the legal basis, retention period and data protection officer will be formalized with a legal opinion before the pilot.",
      voltar: "Back to the home page",
      blocos: [
        {
          t: "Data processed",
          d: "Answers to workplace surveys, on a scale and in free text, collected anonymously and processed to map psychosocial risk.",
        },
        {
          t: "Anonymization",
          d: "Names, CPF numbers, e-mails and phone numbers in the text are removed automatically before the answer is stored. If removal fails, the answer is not stored.",
        },
        {
          t: "Group aggregation",
          d: "Results exist only in aggregate, per homogeneous exposure group (GHE), with at least 5 answers. There is no individual result, not even for the client company.",
        },
        {
          t: "Explainability",
          d: "Risk indications come with an explanation of the drivers (SHAP), in line with Article 20 of the LGPD.",
        },
        {
          t: "Audit",
          d: "Hash-chained records make it possible to verify what was processed and when, without exposing personal content.",
        },
        { t: "Contact", d: "Questions about data processing can be sent to" },
      ],
    },
  },

  zh: {
    meta: {
      titulo: "Psyra AI — 用读懂葡萄牙语的 AI 识别心理社会风险，符合巴西 NR-1",
      descricao:
        "Psyra AI 通过阅读员工用葡萄牙语写下的文字（而不仅是 1–5 分的评分）来识别巴西企业的心理社会风险。符合 NR-1，结果可解释，并且始终按群组汇总。",
    },
    nav: {
      rotulo: "页面导航",
      problema: "问题",
      solucao: "解决方案",
      como: "工作方式",
      painel: "仪表板",
      planos: "价格",
      privacidade: "隐私",
      duvidas: "常见问题",
    },
    acoes: {
      entrar: "登录",
      diagnostico: "预约免费诊断",
      verPainel: "查看示例仪表板",
      falar: "联系 Psyra",
      piloto: "申请加入试点",
    },
    idioma: { rotulo: "语言" },
    tema: { claro: "切换到浅色模式", escuro: "切换到深色模式" },
    sugestao: {
      texto: "本页面也提供简体中文版本。",
      ir: "查看中文版",
      ficar: "继续使用葡萄牙语",
    },
    aviso: "Psyra 面向巴西企业。问卷和文本分析目前仅支持巴西葡萄牙语；本页面是为国际读者提供的译文。",
    ilustrativo: "示意数据",
    hero: {
      pill: "符合 NR-1 · 巴西职业安全法规",
      numero: "54.6万",
      titulo: "人次因心理健康问题休假（巴西，2025 年）。您的企业知道风险在哪里吗？",
      lead:
        "Psyra AI 通过阅读员工用葡萄牙语写下的内容来识别心理社会风险，而不只是看 1–5 分的评分。您能看到单靠评分量表看不到的信息，同时满足 NR-1 要求，结果始终按群组呈现。",
      garantias: ["仅按群组显示结果（n ≥ 5）", "文本在保存前完成匿名化", "行动计划由持证心理学家审核"],
      card: {
        rotulo: "同样的分数，相反的信号",
        escala: "量表",
        texto: "文本中的风险信号",
        grupoA: {
          nome: "A 组 · 量表",
          frase: "“A rotina é puxada, mas a equipe se apoia e a liderança ouve.”",
          traducao: "“工作节奏很紧，但团队互相支持，领导也愿意倾听。”",
          chip: "社会支持信号",
        },
        grupoB: {
          nome: "B 组 · 量表",
          frase: "“Sigo entregando, mas já não durmo direito pensando nas metas.”",
          traducao: "“我还在完成任务，但想着业绩指标已经睡不好觉了。”",
          chip: "耗竭信号",
        },
        nota: "示意示例，保留葡萄牙语原文。真实结果始终按群组汇总（n ≥ 5）。",
      },
    },
    problema: {
      rotulo: "背景",
      titulo: "问题",
      intro: "在巴西，工作中的心理健康问题已成为运营风险、财务风险，如今也是监管风险。",
      legenda: "2025 年巴西因心理健康问题休假的人次（INSS/Dataprev，巴西社会保障数据）",
      linhaTitulo: "NR-1：2026 年的变化",
      marcos: [
        {
          data: "2026年5月26日",
          texto: "NR-1（巴西第 1 号劳动安全规范）要求所有雇用正式员工的企业，将心理社会风险纳入风险管理计划（PGR）。",
        },
        { data: "2026年6月25日", texto: "巴西联邦最高法院（STF）暂停与这类风险相关的罚款（ADPF 1316）。" },
        { data: "2026年9月25日", texto: "暂停期延长 90 天，同时就评估标准进行协商。" },
        { data: "目前", texto: "罚款暂停，但识别和控制风险的义务依然有效。" },
      ],
      banner: "在巴西，识别心理社会风险已不再只是良好实践，而是法定义务。",
    },
    solucao: {
      rotulo: "解决方案",
      titulo: "1–5 分的量表讲不出全部实情",
      intro: "市面上多数工具只依赖李克特量表。Psyra 的设计还会阅读员工用葡萄牙语写下的内容。",
      cards: [
        {
          t: "读懂葡萄牙语的 AI",
          d: "葡萄牙语语言模型（MentalBERT-PT，基于 BERTimbau，仍在验证中）与量表结合，用于分析自由文本。",
        },
        {
          t: "可解释性",
          d: "SHAP 方法说明每个群组风险提示背后的因素，符合巴西《通用数据保护法》（LGPD）第 20 条（Padrão 和 Panorama 套餐）。",
        },
        {
          t: "符合 NR-1",
          d: "分析结果直接按风险识别和 PGR 的需要整理，行动计划由持证心理学家（CRP）审核。",
        },
      ],
      revelador: {
        rotulo: "“揭示器”（O Revelador）",
        titulo: "同样的数字分数，文本里可能藏着相反的信号。",
        texto: "Psyra 捕捉的正是这种差异——这也是为什么两个平均分相近的群组，可能需要完全不同的行动。",
        grafico: "同样的量表，不同的解读",
        sub: "各群组 0–100 指数 · 仅限 n ≥ 5 的群组",
        escala: "量表",
        texto2: "文本",
        legenda: "差距达到 12 分或以上：文本讲的是另一回事。",
      },
    },
    modelo: {
      rotulo: "模型",
      titulo: "风险模型的表现",
      intro: "以下指标在训练时未见过的 26 家企业上测得，各风险等级保持真实比例（低约 36%、中约 39%、高约 25%）。数据集包含 36,000 份对问卷 46 个题目的回答，每份回答的参考标签来自三位评估者的共识。",
      itens: [
        { v: "0.73", t: "宏平均 F1", d: "三个风险等级上精确率与召回率的平衡。该数据集上的理论上限为 0.88。" },
        { v: "0.89", t: "ROC-AUC", d: "区分各风险等级的能力。0.5 相当于随机，1.0 为完全区分。" },
        { v: "82%", t: "高风险检出率（筛查模式）", d: "在尽量不漏检的筛查模式下，模型能找出 82% 的高风险情况；被排除者中有 93% 确实不是高风险（阴性预测值）。" },
        { v: "95%", t: "高风险特异度", d: "在标准模式下，模型正确排除 95% 的非高风险情况，82% 的高风险提示得到确认。" },
        { v: "0.02", t: "校准误差（ECE）", d: "模型给出 70% 的概率时，实际正确率接近 70%：概率值可信。" },
        { v: "r = 0.85", t: "群组层面的一致性", d: "各群组预测的高风险比例与参考比例一致。" },
      ],
      nota: "实地验证将在试点中使用真实回答进行，并在研究伦理委员会批准后开始。试点数据目标：F1 ≥ 0.80，ROC-AUC ≥ 0.85，各行业之间的准确率差异不超过 5 个百分点（目前为 5.4）。",
    },
    como: {
      rotulo: "流程",
      titulo: "工作方式",
      intro: "四个步骤，从发出问卷邀请到形成可纳入 PGR 的行动计划。",
      passos: [
        { t: "匿名问卷", d: "员工用量表作答，也可以选择填写自由文本，无需表明身份。" },
        { t: "保护与分析", d: "文本在保存前完成匿名化，然后将量表和文本结合分析。" },
        { t: "按群组汇总", d: "结果只按同质暴露组（GHE）呈现，且每组至少 5 份回答。绝不出现个人结果。" },
        { t: "PGR 行动计划", d: "各群组的优先事项和行动计划，在纳入 PGR 前由持证心理学家审核。" },
      ],
      instrumento: "问卷包含 10 个维度共 46 个题目，另有可选的自由文本栏（葡萄牙语）。",
      banner: "绝不展示任何个人结果。所有数据均按至少 5 人的群组汇总（k-匿名），任何人都无法被识别。",
    },
    painel: {
      rotulo: "仪表板",
      titulo: "仪表板一览",
      intro: "企业看到的内容示例：先在哪里采取行动，以及原因。这里没有任何信息能识别到个人。",
      abas: { riscos: "各群组风险", fatores: "群组影响因素" },
      riscos: {
        titulo: "客服组最需要优先关注",
        sub: "各群组总体指数，0 到 100",
        niveis: { baixo: "低", moderado: "中", alto: "高" },
        oculto: "回答少于 5 份 · 已隐藏",
      },
      fatores: {
        titulo: "工作负荷是客服组最主要的风险因素",
        sub: "各因素对群组指数的影响（分，SHAP 解释）",
        aumenta: "提高风险",
        protege: "起保护作用",
      },
      grupos: {
        atendimento: "客服",
        operacoes: "运营",
        comercial: "销售",
        ti: "IT",
        financeiro: "财务",
        juridico: "法务",
      },
      fatoresNomes: {
        sobrecarga: "工作负荷过重",
        metas: "业绩指标压力",
        reconhecimento: "缺少认可",
        lideranca: "领导支持",
      },
      rodape: "示意数据。真实结果仅按 n ≥ 5 的群组呈现；行动计划由持证心理学家审核。",
    },
    entregas: {
      rotulo: "交付内容",
      titulo: "您的企业将获得",
      intro: "供人力资源、职业健康与安全团队（SESMT）和管理层在风险管理中使用的材料。",
      itens: [
        { t: "按 GHE 的风险地图", d: "每个同质暴露组各维度的指数和风险等级，可直接用于 PGR 风险清单。" },
        { t: "结果解释", d: "每个群组中影响最大的因素，以及量表与文本的对比（“揭示器”）。" },
        { t: "按优先级排序的行动计划", d: "按群组列出的行动，按优先级排序，并由持证心理学家审核。" },
        { t: "合规记录", d: "为 NR-1 留存的方法、问卷版本和审计记录。" },
      ],
      comparacao: {
        titulo: "员工满意度调查 × 心理社会风险识别",
        colunas: ["", "满意度调查", "Psyra"],
        linhas: [
          ["核心问题", "员工满意吗？", "哪些工作条件可能让这个群组生病？"],
          ["结果", "满意度和敬业度指数", "按 GHE 的风险等级和影响因素，包含对自由文本的解读"],
          ["用于 NR-1", "并非其目的", "为 PGR 风险清单和行动计划提供依据"],
        ],
      },
    },
    planos: {
      rotulo: "按月订阅",
      titulo: "套餐与价格",
      intro: "价格公开透明。按企业规模选择覆盖范围。",
      custoTitulo: "企业规模越大，人均成本越低",
      custoSub: "按各档上限计算的每名员工每月费用",
      periodo: "/月",
      porColaborador: "每名员工/月",
      recomendado: "推荐",
      moeda: "价格以巴西雷亚尔（BRL）计。",
      lista: {
        starter: {
          faixa: "最多 50 名员工",
          desc: "开始识别心理社会风险的入门方案。",
          itens: ["含自由文本的匿名问卷", "按群组的心理社会风险分析", "核心指标仪表板", "基础 NR-1 报告"],
        },
        professional: {
          faixa: "最多 200 名员工",
          desc: "深入分析，包含自由文本和可解释性。",
          itens: [
            "包含 Sinal 套餐全部功能",
            "带可解释性（SHAP）的自由文本分析",
            "群组与部门间对比",
            "定期 PGR 报告",
            "行动计划建议",
            "各部门风险资本的示意性估算",
          ],
        },
        enterprise: {
          faixa: "最多 1,000 名员工",
          desc: "全面覆盖，支持多个厂区，优先支持。",
          itens: [
            "包含 Padrão 套餐全部功能",
            "覆盖多个厂区和 GHE",
            "高级 PGR/NR-1 报告",
            "持续跟踪各项指标",
            "完整审计记录",
            "优先支持",
          ],
        },
      },
      nota: "所有套餐在签约前都先进行一次免费的初步诊断。",
    },
    confianca: {
      rotulo: "隐私",
      titulo: "我们如何保护匿名性",
      intro: "信任是员工如实作答的前提。以下规则适用于所有套餐。",
      itens: [
        { t: "至少 5 份回答", d: "回答少于 5 份的群组不会出现在仪表板上，签约企业也看不到。" },
        { t: "保存前匿名化", d: "姓名、CPF（巴西税号）、电子邮箱和电话会被自动从文本中删除。若删除失败，该回答不会被保存。" },
        { t: "不计算个人分数", d: "系统从不计算或展示个人风险。分析单位是群组。" },
        { t: "采集前锁定规则", d: "每次调查都绑定一个冻结的问卷版本；之后修改问卷不会改写过去的数据。" },
        { t: "审计记录", d: "以哈希链记录处理了什么、何时处理，不含个人内容。" },
        { t: "默认遵循 LGPD", d: "最少化采集、明确同意、结果可解释，符合巴西《通用数据保护法》第 20 条。" },
      ],
      iaTitulo: "AI 做什么，不做什么",
      ia: [
        "不诊断、不评估个人：只指出各群组的风险因素。",
        "每条风险提示都附有影响因素说明。",
        "行动计划须经持证心理学家审核后才生效。",
        "不会把任何回答发送给第三方 AI 服务。",
        "在文本模型完成验证之前，仪表板使用规则引擎，并在界面上明确标注。",
      ],
      etica: "只有在获得研究伦理委员会（CEP）批准后，才会开始采集员工数据。",
      link: "阅读隐私政策",
    },
    sobre: {
      rotulo: "合作",
      pilotoTitulo: "2026 年试点计划",
      pilotoTexto:
        "我们正在挑选参加试点的企业：提供免费诊断、团队的密切跟进，以及持证心理学家的临床审核。只有在获得研究伦理委员会批准后，才会开始采集员工数据。",
      equipeTitulo: "团队介绍",
      equipeIntro:
        "Psyra AI 起源于圣保罗 FECAP 大学人工智能专业的 PTI 综合项目，由三位合伙人运营，Glenarisson 教授和 Alexandre 教授担任指导，并有一位持证心理学家担任外部顾问：",
      pessoas: [
        { nome: "Vinícius de Lima", papel: "产品负责人兼技术负责人" },
        { nome: "Pedro Octávio Rodrigues Jorge", papel: "全栈开发工程师兼财务分析师" },
        { nome: "Leandro Rodrigues Machado", papel: "市场总监、数据分析师兼数据库管理员" },
      ],
      compromisso: "我们的承诺：不承诺评估个人，不给出没有解释的结果。",
      ods: {
        titulo: "契合联合国可持续发展目标",
        itens: [
          { n: 3, nome: "良好健康与福祉", t: "减少工作中的心理疾病。" },
          { n: 8, nome: "体面工作和经济增长", t: "体面工作，心理社会风险得到管理。" },
          { n: 9, nome: "产业、创新和基础设施", t: "能读懂葡萄牙语的人工智能创新。" },
        ],
      },
    },
    prontidao: {
      "menu": "NR-1 自我评估",
      "rotulo": "自我评估",
      "titulo": "贵公司准备好应对 NR-1 了吗？",
      "intro": "八个问题，不到两分钟。了解贵公司在心理社会风险评估方面处于什么阶段，以及应从哪里开始。这是参考性的自我评估，不能替代专业评估。",
      "privado": "您的回答只保留在本页面：不会发送，也不会保存。",
      "progresso": "已回答",
      "opcoes": {
        "sim": "是",
        "parte": "部分",
        "nao": "否"
      },
      "perguntas": [
        {
          "p": "PGR 的风险清单是否已包含心理社会风险因素？",
          "curta": "将心理社会风险纳入 PGR 风险清单"
        },
        {
          "p": "是否已划分暴露情况相近的员工群组（GHE）？",
          "curta": "划分同质暴露群组（GHE）"
        },
        {
          "p": "是否已通过结构化问卷听取员工对这些因素的意见？",
          "curta": "用结构化工具听取员工意见"
        },
        {
          "p": "回答是否只按群组分析，并保证匿名？",
          "curta": "保证匿名并只按群组分析"
        },
        {
          "p": "针对心理社会风险，是否有明确负责人和期限的行动计划？",
          "curta": "制定有负责人和期限的行动计划"
        },
        {
          "p": "流程（方法、日期、问卷版本）是否有记录，可在检查时出示？",
          "curta": "记录方法和证据"
        },
        {
          "p": "是否有持证专业人员（如在 CRP 注册的心理学家）参与分析？",
          "curta": "让持证专业人员参与分析"
        },
        {
          "p": "是否安排了复评日期，以检查行动是否有效？",
          "curta": "安排定期复评"
        }
      ],
      "faixas": [
        {
          "min": 13,
          "nome": "较完善",
          "tom": "ok",
          "texto": "贵公司已有基础。免费诊断可帮助核对证据，并看到量表单独无法呈现的内容：员工写下的文字。"
        },
        {
          "min": 7,
          "nome": "进行中",
          "tom": "alerta",
          "texto": "已完成重要步骤，但仍缺少 NR-1 要求的部分。免费诊断会指出缺少什么以及先做什么。"
        },
        {
          "min": 0,
          "nome": "刚起步",
          "tom": "perigo",
          "texto": "心理社会风险评估刚刚起步，自 2026 年 5 月以来很多企业都是如此。免费诊断将与您一起规划路径。"
        }
      ],
      "lacunasTitulo": "从这里开始：",
      "cta": "获取免费诊断",
      "limpar": "重新评估",
      "anexada": "随申请一起发送的自我评估结果：",
      "rotuloEmail": "NR-1 自我评估"
    },
    continuidade: {
      "rotulo": "签约之后",
      "titulo": "持续循环，而不是束之高阁的报告",
      "intro": "心理社会风险会随目标、团队和管理者而变化。因此 Psyra 以循环方式陪伴企业：测量、行动、再测量。",
      "ciclo": [
        {
          "quando": "启动",
          "t": "协助上线",
          "d": "与人力资源和职业安全团队（SESMT）一起确定群组（GHE）、调查周期和对员工的沟通。"
        },
        {
          "quando": "调查",
          "t": "按群组的仪表板",
          "d": "每个群组达到 5 份回答后即显示结果，并说明影响最大的因素。"
        },
        {
          "quando": "计划",
          "t": "有负责人和期限的行动",
          "d": "按优先级排列的行动计划，经持证心理学家审核，并在仪表板中跟踪。"
        },
        {
          "quando": "复评",
          "t": "再次测量",
          "d": "开展新一轮调查，检查行动是否降低了风险，并更新 PGR。"
        },
        {
          "quando": "始终",
          "t": "审计证据",
          "d": "记录方法、问卷版本和历史，以便向检查人员展示流程。"
        }
      ],
      "apoioTitulo": "您不会独自面对仪表板",
      "apoio": [
        "协助上线，并与 Psyra 团队一起解读结果",
        "所有套餐都提供支持，Panorama 享有优先支持",
        "签约前提供免费初步诊断"
      ]
    },
    ctaFixo: {
      "texto": "免费 NR-1 诊断",
      "botao": "预约"
    },
    faq: {
      rotulo: "常见问题",
      titulo: "常见问题",
      itens: [
        {
          p: "免费诊断包括什么？",
          r: "与团队沟通，了解公司在 NR-1 方面的现状（本页的自我评估会有帮助）；用示例数据演示仪表板；并提出群组（GHE）划分和调查时间表建议。免费，且不要求签约。",
        },
        { p: "企业能看到每位员工的回答吗？", r: "不能。结果只按至少有 5 份回答的群组（GHE）呈现，更小的群组会被隐藏。" },
        {
          p: "自由文本会被怎样处理？",
          r: "文本在保存前会自动匿名化（姓名、CPF、电子邮箱、电话）。文本只在群组层面被分析，绝不会单独展示。",
        },
        {
          p: "如果某个部门的结果很差怎么办？",
          r: "结果是改进的起点，而不是评判。仪表板会显示影响最大的因素，由持证心理学家审核的行动计划会确定先做什么。",
        },
        {
          p: "AI 会对某个人做出决定吗？",
          r: "不会。Psyra 不评估个人，只按群组指出风险因素并给出解释。决定由企业和负责的心理学家做出。",
        },
        {
          p: "Psyra 会取代心理学家或职业安全团队（SESMT）吗？",
          r: "不会。Psyra 负责整理证据和优先事项；行动计划由持证心理学家审核，并纳入企业的 PGR。",
        },
        {
          p: "这能满足 NR-1 的要求吗？",
          r: "自 2026 年 5 月 26 日起，NR-1（MTE 第 1,419/2024 号部令）要求将心理社会风险纳入职业风险管理。Psyra 提供按群组的风险识别和可纳入 PGR 的行动计划。自 2026 年 6 月起，相关罚款已被巴西联邦最高法院暂停（ADPF 1316，并于 9 月延长），但管理风险的义务依然有效。",
        },
        {
          p: "Psyra 的 AI 已经过验证了吗？",
          r: "量表模型已完成训练，并在训练时未见过的企业上测试：F1 为 0.73，ROC-AUC 为 0.89（见“模型”部分）。使用真实回答的实地验证将在获得研究伦理委员会批准后的试点中进行。文本模型（MentalBERT-PT）仍在调整中；在此之前，仪表板使用规则并在页面上注明。",
        },
        {
          p: "员工回答的是什么问卷？",
          r: "Psyra 自有问卷：10 个维度共 46 个题目，参考 COPSOQ 并针对 NR-1 调整，另有可选的自由文本栏。最终题目在使用前由负责的心理学家审核。",
        },
        {
          p: "数据保护（LGPD）方面如何处理？",
          r: "我们只采集必要的数据，文本在保存前匿名化，结果只按群组呈现。法律依据、数据保存期限和数据保护负责人将在试点前通过法律意见正式确定。",
        },
        {
          p: "需要多长时间？",
          r: "问卷开放时长由企业决定；每个群组达到 5 份回答后，即可查看该群组的结果。",
        },
        {
          p: "支持哪些语言？",
          r: "问卷和文本分析支持巴西葡萄牙语。英文和中文页面用于向国际读者介绍产品；若要用其他语言施测，需要单独进行本地化改编和验证。",
        },
      ],
    },
    contato: {
      rotulo: "联系我们",
      titulo: "从免费诊断开始",
      intro: "在一次简短的交流中，我们会演示 Psyra 如何阅读葡萄牙语自由文本、如何按群组汇总结果，以及您的企业需要为 NR-1 准备什么。",
      campos: {
        nome: "姓名",
        empresa: "企业",
        email: "工作邮箱",
        telefone: "电话",
        porte: "大致员工人数（选填）",
        selecione: "请选择",
        interesse: "您希望了解什么？",
      },
      faixas: ["最多 50", "51 至 200", "201 至 1,000", "超过 1,000"],
      interesses: ["免费诊断", "参加 2026 年试点", "了解套餐", "其他事项"],
      consentimentoAntes: "我已阅读",
      consentimentoLink: "隐私政策",
      consentimentoDepois: "，并同意这些数据仅用于就诊断事宜与我联系。",
      assunto: "免费诊断",
      naoInformado: "未填写",
      okTitulo: "邮件已准备好",
      okTexto: "我们已在您的邮件应用中填好申请内容。如果没有自动打开，请发邮件至",
      direto: "想直接写邮件？",
    },
    rodape: {
      descricao: "用葡萄牙语预测识别心理社会风险，符合 NR-1，结果始终按群组汇总。",
      navegacao: "导航",
      sobre: "关于",
      contato: "联系",
      privacidade: "隐私政策",
      direitos: "保留所有权利。",
      origem: "FECAP 人工智能专业 PTI 项目",
    },
    privacidade: {
      titulo: "隐私政策",
      intro: "隐私是员工如实作答的前提。本页概述 Psyra AI 如何处理数据。",
      aviso: "初步版本：法律依据、数据保存期限和数据保护负责人将在试点前通过法律意见正式确定。",
      voltar: "返回首页",
      blocos: [
        { t: "处理的数据", d: "以匿名方式收集的组织调查回答（量表和自由文本），用于识别心理社会风险。" },
        { t: "匿名化", d: "文本中的姓名、CPF、电子邮箱和电话会在回答保存前被自动删除。若删除失败，该回答不会被保存。" },
        { t: "按群组汇总", d: "结果只按同质暴露组（GHE）汇总呈现，每组至少 5 份回答。没有个人结果，签约企业也看不到。" },
        { t: "可解释性", d: "风险提示附有影响因素说明（SHAP），符合 LGPD 第 20 条。" },
        { t: "审计", d: "以哈希链记录，可核查处理了什么、何时处理，而不暴露个人内容。" },
        { t: "联系方式", d: "有关数据处理的问题，请发送至" },
      ],
    },
  },
};
