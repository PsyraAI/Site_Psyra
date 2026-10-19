// Textos do plano de ação explicável e da projeção de perda (pt/en/zh). Sprint: S10 | Risco: R1/R2
// O cálculo vem da API (agregado por grupo, n ≥ 5). Aqui só se monta a explicação no idioma.

const f1 = (locale, v) => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(v) || 0);

export const TEXTOS_PLANO = {
  pt: {
    lead: "Cada grupo em risco moderado ou alto recebe até 3 ações, uma para cada dimensão que mais empurra o índice para cima. Abra o cartão para ver por que a ação foi sugerida, quem cuida dela e como medir se funcionou.",
    porQueTitulo: "Por que este grupo está no plano",
    porQue: (p, L) => {
      const partes = [
        `Índice ${f1(L, p.indice)} de 100, nível ${p.nivelNome} (o nível ${p.nivelNome} começa em ${p.limiar}), com ${p.n} respostas.`,
      ];
      if (p.principal) {
        partes.push(
          `A dimensão que mais pesa é ${p.principal.dimensao} (nota ${f1(L, p.principal.indice)})` +
            (p.principal.contribuicao > 0 && p.indice > 50
              ? `: sozinha, ela responde por +${f1(L, p.principal.contribuicao)} dos ${f1(L, p.indice - 50)} pontos que o grupo está acima do ponto neutro (50).`
              : ".")
        );
      }
      return partes.join(" ");
    },
    contribTitulo: "Quanto cada dimensão pesa no índice",
    contribLead: "Pontos que cada dimensão soma (ou tira) do índice do grupo em relação ao ponto neutro 50. É a conta exata do cálculo atual; com o modelo treinado, este gráfico mostra os valores SHAP.",
    textoTitulo: "O que os comentários abertos acrescentam",
    textoMais: (d, L) => `No texto livre o índice fica ${f1(L, Math.abs(d))} pontos acima das notas.`,
    textoMenos: (d, L) => `No texto livre o índice fica ${f1(L, Math.abs(d))} pontos abaixo das notas.`,
    textoLeituraMais: "As notas sozinhas subestimam o problema. Ouça o grupo antes de fechar a ação.",
    textoLeituraMenos: "Confirme com o grupo se o espaço de texto foi pouco usado antes de concluir.",
    acoesTitulo: "Ações sugeridas",
    responsavel: "Responsável",
    prazo: "Prazo",
    prazoDias: (d) => `${d} dias`,
    indicador: "Como medir",
    indicadorTexto: (dim, hoje, L) => `${dim} abaixo de 40 no próximo ciclo (hoje ${f1(L, hoje)}).`,
    meta: "Meta do grupo",
    metaTexto: (de, para) => `Sair do nível ${de} para o ${para} no próximo ciclo.`,
    impacto: "Perda que pode ser evitada",
    impactoNota: "por mês, se o grupo cair um nível (método FIEMG)",
    referencia: "Base legal: NR-1 (Portaria MTE 1.419/2024). Os riscos psicossociais entram no inventário do PGR, e cada risco priorizado precisa de medida de prevenção com responsável e prazo.",
    detalhes: "Ver explicação",
    ocultarDetalhes: "Ocultar explicação",
    nivel: { alto: "alto", moderado: "moderado", baixo: "baixo" },
    // projeção
    projTitulo: "Perda acumulada em 12 meses: sem ação × com o plano",
    projLead: "Estimativa para planejar e priorizar. A linha de cima repete a perda de hoje por 12 meses. A de baixo supõe que cada grupo cai um nível depois que o plano de ação começa a valer.",
    semAcao: "Sem ação",
    comPlano: "Com o plano de ação",
    economia: "Perda evitada em 12 meses",
    economiaNota: "diferença entre as duas linhas no 12º mês",
    mensalHoje: "Perda mensal hoje",
    mensalDepois: "Perda mensal com o plano",
    mes: (m) => `mês ${m}`,
    premissas: "Premissas da estimativa",
    premissasLista: [
      "Sem ação: a perda mensal de hoje se repete por 12 meses.",
      "Com o plano: cada grupo cai um nível (alto → moderado, moderado → baixo). O efeito começa no 3º mês e fica completo no 6º, porque mudanças de gestão levam tempo.",
      "É uma hipótese para priorizar ações, não uma promessa de resultado. O efeito real é medido no ciclo seguinte do questionário.",
    ],
  },
  en: {
    lead: "Each group at moderate or high risk gets up to 3 actions, one for each dimension that pushes its index up the most. Open a card to see why the action was suggested, who owns it and how to measure whether it worked.",
    porQueTitulo: "Why this group is in the plan",
    porQue: (p, L) => {
      const partes = [`Index ${f1(L, p.indice)} out of 100, ${p.nivelNome} level (${p.nivelNome} starts at ${p.limiar}), from ${p.n} responses.`];
      if (p.principal) {
        partes.push(
          `The dimension that weighs most is ${p.principal.dimensao} (score ${f1(L, p.principal.indice)})` +
            (p.principal.contribuicao > 0 && p.indice > 50
              ? `: on its own it accounts for +${f1(L, p.principal.contribuicao)} of the ${f1(L, p.indice - 50)} points the group sits above the neutral point (50).`
              : ".")
        );
      }
      return partes.join(" ");
    },
    contribTitulo: "How much each dimension weighs in the index",
    contribLead: "Points each dimension adds to (or takes from) the group index relative to the neutral point 50. This is the exact arithmetic of the current calculation; with the trained model, this chart shows SHAP values.",
    textoTitulo: "What the open comments add",
    textoMais: (d, L) => `In free text the index is ${f1(L, Math.abs(d))} points above the scores.`,
    textoMenos: (d, L) => `In free text the index is ${f1(L, Math.abs(d))} points below the scores.`,
    textoLeituraMais: "The scores alone understate the problem. Listen to the group before closing the action.",
    textoLeituraMenos: "Check with the group whether the comment box was barely used before concluding.",
    acoesTitulo: "Suggested actions",
    responsavel: "Owner",
    prazo: "Deadline",
    prazoDias: (d) => `${d} days`,
    indicador: "How to measure",
    indicadorTexto: (dim, hoje, L) => `${dim} below 40 in the next cycle (today ${f1(L, hoje)}).`,
    meta: "Group goal",
    metaTexto: (de, para) => `Move from ${de} to ${para} in the next cycle.`,
    impacto: "Loss that can be avoided",
    impactoNota: "per month, if the group drops one level (FIEMG method)",
    referencia: "Legal basis: NR-1 (MTE Ordinance 1,419/2024). Psychosocial risks go into the PGR inventory, and each prioritized risk needs a prevention measure with an owner and a deadline.",
    detalhes: "Show explanation",
    ocultarDetalhes: "Hide explanation",
    nivel: { alto: "high", moderado: "moderate", baixo: "low" },
    projTitulo: "Accumulated loss over 12 months: no action × with the plan",
    projLead: "An estimate for planning and prioritizing. The top line repeats today's loss for 12 months. The bottom one assumes each group drops one level once the action plan takes effect.",
    semAcao: "No action",
    comPlano: "With the action plan",
    economia: "Loss avoided in 12 months",
    economiaNota: "gap between the two lines in month 12",
    mensalHoje: "Monthly loss today",
    mensalDepois: "Monthly loss with the plan",
    mes: (m) => `month ${m}`,
    premissas: "Assumptions",
    premissasLista: [
      "No action: today's monthly loss repeats for 12 months.",
      "With the plan: each group drops one level (high → moderate, moderate → low). The effect starts in month 3 and is complete by month 6, because management changes take time.",
      "This is a hypothesis to prioritize actions, not a promise. The real effect is measured in the next questionnaire cycle.",
    ],
  },
  zh: {
    lead: "处于中、高风险的每个组最多给出 3 项措施，每项对应一个最推高指数的维度。打开卡片可查看建议的理由、负责人以及如何衡量效果。",
    porQueTitulo: "该组为何列入计划",
    porQue: (p, L) => {
      const partes = [`指数 ${f1(L, p.indice)}/100，${p.nivelNome}级（${p.nivelNome}级从 ${p.limiar} 起），共 ${p.n} 份回答。`];
      if (p.principal) {
        partes.push(
          `影响最大的维度是${p.principal.dimensao}（得分 ${f1(L, p.principal.indice)}）` +
            (p.principal.contribuicao > 0 && p.indice > 50
              ? `：仅这一项就贡献了该组高于中性点（50）的 ${f1(L, p.indice - 50)} 分中的 +${f1(L, p.principal.contribuicao)} 分。`
              : "。")
        );
      }
      return partes.join("");
    },
    contribTitulo: "各维度在指数中的权重",
    contribLead: "相对于中性点 50，各维度为该组指数增加（或减少）的分数。这是当前计算的精确分解；使用训练好的模型后，此图显示 SHAP 值。",
    textoTitulo: "开放式评论补充了什么",
    textoMais: (d, L) => `自由文本的指数比评分高 ${f1(L, Math.abs(d))} 分。`,
    textoMenos: (d, L) => `自由文本的指数比评分低 ${f1(L, Math.abs(d))} 分。`,
    textoLeituraMais: "仅看评分会低估问题。确定措施前请先倾听该组的意见。",
    textoLeituraMenos: "下结论前，请与该组确认评论栏是否很少被使用。",
    acoesTitulo: "建议措施",
    responsavel: "负责人",
    prazo: "期限",
    prazoDias: (d) => `${d} 天`,
    indicador: "衡量方式",
    indicadorTexto: (dim, hoje, L) => `下一周期${dim}低于 40（目前 ${f1(L, hoje)}）。`,
    meta: "该组目标",
    metaTexto: (de, para) => `下一周期从${de}级降到${para}级。`,
    impacto: "可避免的损失",
    impactoNota: "每月，如果该组下降一个等级（FIEMG 方法）",
    referencia: "法律依据：NR-1（MTE 第 1.419/2024 号令）。心理社会风险纳入 PGR 清单，每个优先风险都需要有负责人和期限的预防措施。",
    detalhes: "查看说明",
    ocultarDetalhes: "隐藏说明",
    nivel: { alto: "高", moderado: "中", baixo: "低" },
    projTitulo: "12 个月累计损失：不采取措施 × 执行计划",
    projLead: "用于规划和排序的估算。上方曲线将今天的损失重复 12 个月；下方曲线假设行动计划生效后每个组下降一个等级。",
    semAcao: "不采取措施",
    comPlano: "执行行动计划",
    economia: "12 个月可避免的损失",
    economiaNota: "第 12 个月两条曲线之差",
    mensalHoje: "当前每月损失",
    mensalDepois: "执行计划后的每月损失",
    mes: (m) => `第 ${m} 月`,
    premissas: "估算前提",
    premissasLista: [
      "不采取措施：当前每月损失持续 12 个月。",
      "执行计划：每个组下降一个等级（高 → 中，中 → 低）。效果从第 3 个月开始，第 6 个月完全显现，因为管理变革需要时间。",
      "这是用于排序措施的假设，不是结果承诺。真实效果在下一次问卷周期中衡量。",
    ],
  },
};

const RESPONSAVEIS = {
  "Comitê de ética e RH": ["Ethics committee and HR", "伦理委员会和人力资源"],
  "Psicóloga responsável (CRP) e SESMT": ["Responsible psychologist (CRP) and occupational health team (SESMT)", "负责的心理学家（CRP）和职业安全卫生团队（SESMT）"],
  "RH e lideranças do grupo": ["HR and the group's leaders", "人力资源和该组管理者"],
  "Gestor da área e RH (dimensionamento)": ["Area manager and HR (staffing)", "部门经理和人力资源（人员配置）"],
  "Gestor da área": ["Area manager", "部门经理"],
  "Gestor da área e RH": ["Area manager and HR", "部门经理和人力资源"],
  "RH (remuneração e carreira)": ["HR (pay and careers)", "人力资源（薪酬与职业发展）"],
  "Diretoria e comunicação interna": ["Leadership team and internal communications", "管理层和内部沟通"],
  "RH e gestores (política de jornada)": ["HR and managers (working-hours policy)", "人力资源和经理（工时政策）"],
  "RH e SESMT": ["HR and occupational health team (SESMT)", "人力资源和职业安全卫生团队（SESMT）"],
};

export function traduzirResponsavel(texto, idioma) {
  if (idioma === "pt" || !texto) return texto;
  return RESPONSAVEIS[texto]?.[idioma === "en" ? 0 : 1] ?? texto;
}
