// Explicações expansíveis de cada parte da solução na landing (pt-BR, inglês, chinês).
// A ordem segue os cartões de "Solução" (3) e os passos de "Como funciona" (4). Sprint: S10 | Risco: None

export const EXPLICACOES = {
  pt: {
    abrir: "Entenda como funciona",
    fechar: "Mostrar menos",
    solucao: [
      [
        "A pergunta aberta é lida por um modelo de linguagem em português do Brasil, com base no BERTimbau. Ele entende o contexto da frase: “não aguento mais a pressão” e “a pressão está sob controle” recebem leituras diferentes, coisa que uma contagem de palavras não faz.",
        "O texto só chega ao modelo depois de anonimizado, e o resultado é sempre do grupo. O ajuste fino com respostas reais acontece no piloto, depois da aprovação do Comitê de Ética.",
      ],
      [
        "Para cada grupo, o SHAP calcula quanto cada dimensão empurrou o índice para cima ou para baixo. O RH vê, por exemplo, que no Atendimento o que mais pesou foi a carga de trabalho, seguida do apoio da liderança.",
        "Assim a empresa age na causa, não no sintoma, e cumpre o direito de explicação de decisões automatizadas do Art. 20 da LGPD.",
      ],
      [
        "O painel organiza o que a NR-1 pede no gerenciamento de riscos: inventário por grupo homogêneo de exposição, nível de risco, fatores que pesaram e plano de ação.",
        "Nada entra no PGR sem a revisão e a assinatura de uma psicóloga com CRP ativo. A trilha de auditoria registra cada passo, para mostrar à fiscalização como o risco foi avaliado.",
      ],
    ],
    como: [
      [
        "O RH cria um ciclo no painel e recebe um link e um QR code. O colaborador abre no celular ou no computador, sem login e sem nome, e responde 46 perguntas de 1 a 5 em cerca de 8 minutos.",
        "No fim, se quiser, escreve com as próprias palavras. Tudo acontece dentro da Psyra, sem formulários de terceiros.",
      ],
      [
        "Antes de gravar, o texto passa por um anonimizador que apaga nomes, CPF, e-mails e telefones. Se ele falhar, a resposta é recusada e nada é salvo.",
        "Depois, um modelo XGBoost calibrado lê a escala e o modelo de linguagem lê o texto. Quando os dois contam histórias diferentes, o grupo aparece no Revelador.",
      ],
      [
        "Uma resposta só vira resultado quando o grupo tem pelo menos 5 pessoas (k-anonimato). Abaixo disso, o grupo aparece como oculto e nenhum número é mostrado.",
        "O RH nunca vê respostas individuais, e o banco isola os dados de cada empresa.",
      ],
      [
        "Para cada grupo em risco moderado ou alto, o painel sugere ações a partir do fator que mais pesou. A psicóloga revisa, ajusta e assina; só então o plano entra no PGR.",
        "No ciclo seguinte, a empresa compara os resultados e vê se as ações funcionaram.",
      ],
    ],
  },
  en: {
    abrir: "See how it works",
    fechar: "Show less",
    solucao: [
      [
        "The open question is read by a language model for Brazilian Portuguese, built on BERTimbau. It understands context: “I can't take the pressure anymore” and “the pressure is under control” get different readings, which a word count cannot do.",
        "Text only reaches the model after it is anonymized, and the result is always for the group. Fine-tuning with real answers happens in the pilot, after ethics committee approval.",
      ],
      [
        "For each group, SHAP computes how much each dimension pushed the index up or down. HR sees, for example, that in Customer Service workload weighed most, followed by leadership support.",
        "The company acts on causes, not symptoms, and meets the right to an explanation of automated decisions in Art. 20 of Brazil's LGPD.",
      ],
      [
        "The dashboard organizes what NR-1 requires for risk management: an inventory by homogeneous exposure group, risk level, the factors that weighed most and an action plan.",
        "Nothing goes into the PGR without review and signature by a psychologist with an active CRP license. The audit trail records each step, to show inspectors how the risk was assessed.",
      ],
    ],
    como: [
      [
        "HR creates a cycle in the dashboard and gets a link and a QR code. Employees open it on their phone or computer, with no login and no name, and answer 46 questions on a 1-to-5 scale in about 8 minutes.",
        "At the end they can write in their own words, if they want. Everything happens inside Psyra, with no third-party forms.",
      ],
      [
        "Before storage, the text goes through an anonymizer that removes names, CPF numbers, emails and phone numbers. If it fails, the answer is rejected and nothing is saved.",
        "Then a calibrated XGBoost model reads the scale and the language model reads the text. When they tell different stories, the group shows up in the Revealer.",
      ],
      [
        "Answers only become results when a group has at least 5 people (k-anonymity). Below that, the group is shown as hidden and no number is displayed.",
        "HR never sees individual answers, and the database isolates each company's data.",
      ],
      [
        "For each group at moderate or high risk, the dashboard suggests actions based on the factor that weighed most. The psychologist reviews, adjusts and signs; only then does the plan go into the PGR.",
        "In the next cycle, the company compares results and sees whether the actions worked.",
      ],
    ],
  },
  zh: {
    abrir: "了解运作方式",
    fechar: "收起",
    solucao: [
      [
        "开放题由基于 BERTimbau 的巴西葡萄牙语语言模型阅读。它能理解语境：“我再也受不了这种压力了”和“压力还在可控范围内”会得到不同的解读，这是单纯统计词语做不到的。",
        "文本只有在匿名化之后才会进入模型，结果始终按组呈现。使用真实回答的微调将在伦理委员会批准后的试点中进行。",
      ],
      [
        "对每个组，SHAP 会计算每个维度将指数推高或拉低了多少。例如，人力资源部门可以看到，在客户服务组中影响最大的是工作负荷，其次是领导支持。",
        "这样企业就能针对原因而不是症状采取行动，并满足巴西《通用数据保护法》（LGPD）第 20 条关于自动化决策解释权的要求。",
      ],
      [
        "仪表板按照 NR-1 对风险管理的要求整理信息：按同质暴露组的清单、风险等级、影响最大的因素以及行动计划。",
        "任何内容都必须经过持有有效 CRP 执照的心理学家审核并签署后，才能纳入 PGR。审计记录会保存每一步，以便向检查人员说明风险是如何评估的。",
      ],
    ],
    como: [
      [
        "人力资源部门在仪表板中创建一个周期，获得链接和二维码。员工用手机或电脑打开，无需登录也不填姓名，用约 8 分钟回答 46 道 1 到 5 分的问题。",
        "最后，如果愿意，还可以用自己的话写下感受。一切都在 Psyra 内完成，不使用第三方表单。",
      ],
      [
        "存储之前，文本会经过匿名化处理，删除姓名、CPF、电子邮件和电话号码。如果处理失败，回答会被拒收，不保存任何内容。",
        "随后，经过校准的 XGBoost 模型读取量表，语言模型读取文本。当两者讲述不同的故事时，该组会出现在“揭示器”中。",
      ],
      [
        "只有当一个组至少有 5 人作答时，回答才会形成结果（k-匿名）。低于这个数量时，该组显示为已隐藏，不显示任何数字。",
        "人力资源部门永远看不到个人回答，数据库也会隔离每家公司的数据。",
      ],
      [
        "对处于中或高风险的组，仪表板会根据影响最大的因素给出行动建议。心理学家审核、调整并签署后，计划才会纳入 PGR。",
        "在下一个周期，企业可以对比结果，看看这些行动是否奏效。",
      ],
    ],
  },
};
