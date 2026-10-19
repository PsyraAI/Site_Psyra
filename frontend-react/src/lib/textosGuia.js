// Guia público "NR-1 e riscos psicossociais" (página pilar para busca orgânica). Sprint: S10 | Risco: R2
// Conteúdo conferido em 17/10/2026. Cada afirmação tem fonte na lista do fim da página.
// Atualizar a seção "multas" sempre que o STF decidir algo novo na ADPF 1316.

export const ATUALIZADO_GUIA = "2026-10-17";

export const GUIA_NR1 = {
  meta: {
    titulo: "NR-1 e riscos psicossociais: guia prático para o PGR (2026) — Psyra AI",
    descricao:
      "O que a NR-1 (Portaria MTE 1.419/2024) exige sobre riscos psicossociais, a situação das multas no STF (ADPF 1316) e o passo a passo para mapear o risco por grupo e montar o plano de ação do PGR.",
  },
  rotulo: "Guia · NR-1",
  titulo: "NR-1 e riscos psicossociais: o que a empresa precisa fazer em 2026",
  lead: "Um guia direto para RH, SESMT e gestores: o que mudou na norma, como está a fiscalização e como sair do zero até um plano de ação defensável, sem expor nenhum colaborador.",
  atualizado: (d) => `Atualizado em ${d}`,
  tempo: "Leitura de 7 minutos",
  resumoTitulo: "Em 30 segundos",
  resumo: [
    "Desde **26/05/2026**, a NR-1 exige que os **riscos psicossociais** entrem no gerenciamento de riscos ocupacionais e no **PGR** das empresas com empregados CLT (Portaria MTE 1.419/2024).",
    "As **multas** ligadas a esses riscos estão **suspensas pelo STF** (ADPF 1316) desde 25/06/2026, decisão confirmada pelo Plenário em agosto e prorrogada em setembro por mais 90 dias. **A obrigação de gerenciar o risco continua valendo.**",
    "O caminho: mapear o risco **por grupo** (GHE), entender **quais fatores pesam**, definir **ações com responsável e prazo** e **medir de novo** no ciclo seguinte.",
  ],
  secoes: [
    {
      id: "o-que-mudou",
      t: "1. O que mudou na NR-1",
      b: [
        { p: "A Portaria MTE nº 1.419, de 27 de agosto de 2024, alterou o capítulo de Gerenciamento de Riscos Ocupacionais (GRO) da NR-1. A mudança deixa explícito que os **fatores de risco psicossociais relacionados ao trabalho** fazem parte dos perigos que a empresa precisa identificar, avaliar e controlar, ao lado dos riscos físicos, químicos, biológicos e de acidentes." },
        { p: "Na prática, isso significa que o **inventário de riscos** e o **plano de ação** do PGR precisam tratar de temas como sobrecarga, falta de autonomia, metas pouco claras, falta de apoio da liderança, assédio e conflitos, e o equilíbrio entre trabalho e vida pessoal." },
        { p: "A exigência passou a valer em **26/05/2026**, depois de um período educativo." },
      ],
    },
    {
      id: "multas",
      t: "2. E as multas? O que o STF decidiu",
      b: [
        { p: "Em **25/06/2026**, o ministro André Mendonça, relator da **ADPF 1316**, suspendeu por 90 dias as multas e demais sanções ligadas aos riscos psicossociais da NR-1 e enviou o caso ao núcleo de conciliação do STF. O Plenário confirmou a decisão por unanimidade em **agosto de 2026**, e em **setembro** a suspensão foi **prorrogada por mais 90 dias**." },
        { p: "**O que a suspensão não faz:** ela não revoga a norma. A obrigação de prevenir e gerenciar o risco continua, e o tema segue relevante na Justiça do Trabalho, em ações por adoecimento e assédio, independentemente da multa administrativa." },
        { callout: "Leitura prática: use a janela da suspensão para fazer o primeiro mapeamento com calma e com método, e não para adiar. Quem chega ao fim do prazo com inventário e plano de ação documentados está protegido nos dois cenários." },
      ],
    },
    {
      id: "por-que-importa",
      t: "3. Por que isso importa além da norma",
      b: [
        { p: "Em 2025, o Brasil registrou cerca de **546 mil afastamentos por transtornos mentais**, alta de 15,7% sobre 2024, segundo dados da Previdência Social divulgados pela imprensa. Afastamento, rotatividade e queda de produtividade custam caro, e o custo aparece antes da multa." },
        { p: "Pela estimativa da FIEMG, cerca de 20% das pessoas ocupadas têm algum problema de saúde mental e perdem por volta de 14% da produtividade ao longo do ano. A Psyra usa esse método para mostrar à diretoria a **ordem de grandeza do capital em risco** por setor." },
      ],
    },
    {
      id: "passo-a-passo",
      t: "4. Passo a passo para o PGR",
      b: [
        {
          ol: [
            "**Defina os grupos (GHEs).** Agrupe quem tem condições de trabalho parecidas: mesma área, função e jornada. Cada grupo precisa ter **pelo menos 5 pessoas respondendo**, ou o resultado fica oculto para proteger o anonimato.",
            "**Comunique antes de coletar.** Explique a finalidade, que a participação é voluntária e anônima e que o resultado só será usado para medidas coletivas, **nunca** para avaliar pessoas.",
            "**Aplique um questionário validado**, com escala e espaço para comentários abertos. Os comentários costumam mostrar o que as notas escondem.",
            "**Avalie o risco por grupo** e veja **quais dimensões pesam mais** no índice de cada grupo. Sem isso, o plano vira uma lista genérica.",
            "**Monte o plano de ação**: uma medida por fator prioritário, com **responsável, prazo e indicador**. Os grupos de risco alto vêm primeiro.",
            "**Leve à psicóloga responsável (CRP)**, que valida a interpretação e assina o documento técnico que entra no PGR.",
            "**Meça de novo** no ciclo seguinte e registre a evolução. O PGR é um processo contínuo, não um documento de gaveta.",
          ],
        },
      ],
    },
    {
      id: "erros",
      t: "5. Erros comuns (e como evitar)",
      b: [
        {
          ul: [
            "**Pedir nome ou matrícula no questionário.** Isso destrói a sinceridade e cria risco à LGPD. A resposta deve ser anônima.",
            "**Olhar só a média da empresa.** O risco se concentra em grupos: a média esconde o setor que está adoecendo.",
            "**Usar o resultado contra alguém.** O resultado é coletivo e serve à prevenção. Usá-lo para punir ou desligar viola a finalidade da coleta.",
            "**Plano sem dono.** Ação sem responsável e prazo não sai do papel, e não se sustenta numa fiscalização.",
            "**Ignorar a qualidade das respostas.** Pressa e respostas \"em linha reta\" distorcem o resultado. Acompanhe a taxa de resposta e os sinais de desatenção por grupo.",
          ],
        },
      ],
    },
    {
      id: "como-a-psyra-ajuda",
      t: "6. Como a Psyra ajuda",
      b: [
        { p: "A Psyra AI aplica o questionário no próprio site ou app, **apaga dados de identificação antes de gravar**, calcula o risco **só por grupo** (n ≥ 5) e mostra **quanto cada dimensão pesa** no índice. A plataforma lê também os comentários abertos em português e sinaliza quando o texto revela mais exposição do que as notas." },
        { p: "O painel sugere o **plano de ação** com responsável, prazo e indicador, estima o **capital em risco** e a projeção em 12 meses, e entrega o material para a **psicóloga com CRP** validar e assinar." },
      ],
    },
  ],
  faqTitulo: "Perguntas frequentes",
  faq: [
    { p: "A NR-1 vale para todas as empresas?", r: "Vale para organizações com empregados regidos pela CLT. Microempresas e empresas de pequeno porte têm tratamento diferenciado em alguns pontos do PGR; confirme o enquadramento da sua empresa com o SESMT ou a consultoria de segurança do trabalho." },
    { p: "Preciso de um psicólogo para cumprir a norma?", r: "A NR-1 não obriga a contratar psicólogo, mas a avaliação de fatores psicossociais e a interpretação técnica ganham muito com uma profissional com CRP. Na Psyra, o documento técnico do PGR só sai depois da validação e da assinatura dela." },
    { p: "Posso usar um formulário comum?", r: "Pode coletar com qualquer ferramenta, mas precisa garantir o anonimato, agrupar por GHE com número mínimo de respostas e transformar o resultado em plano de ação documentado. É aí que a maioria das planilhas para." },
    { p: "Com as multas suspensas, posso esperar?", r: "A obrigação continua e o risco trabalhista também. A suspensão é temporária e pode acabar. O caminho mais seguro é usar o período para fazer o primeiro ciclo com método." },
  ],
  ctaTitulo: "Faça o primeiro mapeamento sem custo",
  ctaTexto: "O diagnóstico inicial é gratuito: entendemos onde a empresa está na NR-1, mostramos o painel e propomos os grupos e o cronograma da coleta.",
  ctaBotao: "Agendar diagnóstico gratuito",
  ctaAuto: "Fazer a autoavaliação de prontidão",
  fontesTitulo: "Fontes",
  fontes: [
    { t: "MTE — NR-01 atualizada (texto oficial, PDF)", url: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-01-atualizada-2025-i.pdf" },
    { t: "Contábeis (24/08/2026) — STF confirma suspensão de sanções sobre riscos psicossociais", url: "https://www.contabeis.com.br/noticias/78964/stf-confirma-suspensao-de-sancoes-sobre-riscos-psicossociais" },
    { t: "SEPROSP (29/09/2026) — STF mantém suspensão de sanções da NR-1 por mais 90 dias", url: "https://www.seprosp.org.br/?p=6531" },
    { t: "DGABC (23/03/2026) — Afastamentos por transtorno mental chegam a 546 mil", url: "https://www.dgabc.com.br/Noticia/4291324/afastamentos-por-transtorno-mental-chegam-a-546-mil" },
    { t: "FIEMG — Os custos econômicos dos transtornos mentais (dados de 2019)", url: "https://www.fiemg.com.br/" },
  ],
  aviso: "Este guia é informativo e não substitui parecer jurídico nem a avaliação técnica da psicóloga responsável.",
  voltar: "Voltar à página inicial",
};
