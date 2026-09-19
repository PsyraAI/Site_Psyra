// Catálogo comercial de planos — mesma fonte para landing e superadmin.
// IDs internos (starter/professional/enterprise) batem com o CHECK do banco.

export const PLANOS = [
  {
    id: "starter",
    nome: "Sinal",
    preco: "R$ 1.200",
    periodo: "/mês",
    desc: "Entrada para empresas menores ou para começar o mapeamento básico de risco psicossocial.",
    destaque: false,
    itens: [
      "Pesquisa anônima com texto livre",
      "Análise de risco psicossocial por grupo",
      "Painel com indicadores essenciais",
      "Relatório básico para NR-1",
    ],
    funcionalidades: {
      pesquisaAnonima: true,
      riscoPorGrupo: true,
      painelEssencial: true,
      relatorioBasicoNr1: true,
      explicabilidadeShap: false,
      comparativoGrupos: false,
      relatoriosPeriodicosPgr: false,
      planoAcao: false,
      multiplasUnidades: false,
      relatoriosAvancados: false,
      acompanhamentoContinuo: false,
      trilhaAuditoria: false,
      suportePrioritario: false,
      capitalEmRisco: false,
    },
  },
  {
    id: "professional",
    nome: "Padrão",
    preco: "R$ 2.500",
    periodo: "/mês",
    desc: "Plano intermediário, com análise aprofundada e relatórios mais completos.",
    destaque: true,
    itens: [
      "Tudo do plano Sinal",
      "Análise de texto livre com explicabilidade (SHAP)",
      "Comparativo entre grupos e áreas",
      "Relatórios periódicos para PGR",
      "Recomendações de plano de ação",
      "Estimativa de capital em risco por setor",
    ],
    funcionalidades: {
      pesquisaAnonima: true,
      riscoPorGrupo: true,
      painelEssencial: true,
      relatorioBasicoNr1: true,
      explicabilidadeShap: true,
      comparativoGrupos: true,
      relatoriosPeriodicosPgr: true,
      planoAcao: true,
      multiplasUnidades: false,
      relatoriosAvancados: false,
      acompanhamentoContinuo: false,
      trilhaAuditoria: false,
      suportePrioritario: false,
      capitalEmRisco: true,
    },
  },
  {
    id: "enterprise",
    nome: "Panorama",
    preco: "R$ 4.500",
    periodo: "/mês",
    desc: "Plano completo para empresas maiores, com cobertura total e suporte prioritário.",
    destaque: false,
    itens: [
      "Tudo do plano Padrão",
      "Cobertura de múltiplas unidades e GHEs",
      "Relatórios avançados para PGR/NR-1",
      "Acompanhamento contínuo dos indicadores",
      "Trilha de auditoria completa",
      "Suporte prioritário",
      "Estimativa de capital em risco por setor",
    ],
    funcionalidades: {
      pesquisaAnonima: true,
      riscoPorGrupo: true,
      painelEssencial: true,
      relatorioBasicoNr1: true,
      explicabilidadeShap: true,
      comparativoGrupos: true,
      relatoriosPeriodicosPgr: true,
      planoAcao: true,
      multiplasUnidades: true,
      relatoriosAvancados: true,
      acompanhamentoContinuo: true,
      trilhaAuditoria: true,
      suportePrioritario: true,
      capitalEmRisco: true,
    },
  },
];

export function obterPlano(id) {
  return PLANOS.find((plano) => plano.id === id) || PLANOS[0];
}

export function rotuloPlano(id) {
  return obterPlano(id).nome;
}

export function planoPermiteCapital(id) {
  return Boolean(obterPlano(id).funcionalidades.capitalEmRisco);
}
