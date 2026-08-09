// Psyra AI — adaptador de dados do painel. Sprint: S6 | Risco: R2.
//
// ┌───────────────────────────────────────────────────────────────────────────┐
// │ ESTE É O PONTO DE ENCAIXE DO `psyra_dashboard.jsx`.                        │
// │                                                                           │
// │ O backend devolve o payload de GET /v1/empresas/{id}/coletas/{id}/painel. │
// │ Se o componente do Pedro esperar nomes de campo diferentes, a tradução     │
// │ acontece AQUI e em nenhum outro lugar — nem no backend, nem dentro dos     │
// │ componentes. Trocar a camada de apresentação é editar este arquivo.        │
// └───────────────────────────────────────────────────────────────────────────┘
//
// Contrato de entrada (resumido):
//   { empresa, coleta, resumo, ghes[], revelador[], conformidade, plano_acao[], selo }
//
// Regra inegociável: grupo com `mascarado: true` chega SEM número nenhum
// (indice_likert, indice_texto, divergencia e nivel_risco vêm null do servidor).
// A interface nunca deve inventar valor para esses casos — nem 0, nem "—" como
// número, nem barra vazia sugerindo risco baixo.

export const NIVEIS = {
  alto: { rotulo: "Alto", cor: "var(--perigo)", classe: "alto" },
  moderado: { rotulo: "Moderado", cor: "var(--ambar)", classe: "moderado" },
  baixo: { rotulo: "Baixo", cor: "var(--verde)", classe: "baixo" },
};

export const corDoNivel = (nivel) => NIVEIS[nivel]?.cor ?? "var(--ardosia)";

/** Formata índice 0–100 preservando a diferença entre "zero" e "suprimido". */
export function formatarIndice(valor) {
  return valor === null || valor === undefined ? "—" : valor.toFixed(1);
}

/** Normaliza o payload da API para as props consumidas pelas telas do painel. */
export function adaptarPainel(payload) {
  const { resumo, ghes, revelador, conformidade, plano_acao: plano, selo, coleta } = payload;

  return {
    coleta: {
      id: coleta.id,
      titulo: coleta.titulo,
      status: coleta.status,
      origemDados: coleta.origem_dados,
      abertaEm: coleta.aberta_em,
    },

    // Visão geral
    resumo: {
      totalRespostas: resumo.total_respostas,
      indiceGeral: resumo.indice_geral,
      ghesAvaliados: resumo.ghes_avaliados,
      ghesVisiveis: resumo.ghes_visiveis,
      ghesMascarados: resumo.ghes_mascarados,
      distribuicao: resumo.distribuicao_risco,
    },

    // Riscos por grupo — `fatores` é o drill-down; hoje vem do motor de regra,
    // depois passa a vir do SHAP sem mudar o formato.
    grupos: ghes.map((g) => ({
      codigo: g.codigo,
      nome: g.nome,
      setor: g.setor,
      nRespostas: g.n_respostas,
      mascarado: Boolean(g.mascarado),
      motivoMascara: g.motivo_mascara ?? null,
      indiceLikert: g.indice_likert ?? null,
      indiceTexto: g.indice_texto ?? null,
      divergencia: g.divergencia ?? null,
      nivelRisco: g.nivel_risco ?? null,
      fatores: (g.fatores ?? []).map((f) => ({
        bloco: f.bloco,
        dimensao: f.dimensao,
        indice: f.indice,
      })),
    })),

    // O Revelador — elemento-assinatura da marca
    revelador: revelador.map((r) => ({
      grupo: r.ghe,
      indiceLikert: r.indice_likert,
      indiceTexto: r.indice_texto,
      divergencia: r.divergencia,
      leitura: r.leitura,
    })),

    // Conformidade NR-1 / LGPD
    conformidade: {
      itens: [
        ["Inventário de riscos psicossociais por grupo", conformidade.nr1_inventario_riscos],
        ["Resultados apresentados apenas por grupo", conformidade.resultado_por_ghe],
        ["Texto livre anonimizado antes do armazenamento", conformidade.anonimizacao_texto_livre],
        ["Trilha de auditoria encadeada (SHA-256)", conformidade.trilha_auditoria_sha256],
        ["Aprovação do comitê de ética (CEP) registrada", conformidade.cep_aprovado],
        ["PGR assinado por psicóloga com CRP ativo", conformidade.pgr_assinado_crp],
      ].map(([rotulo, atendido]) => ({ rotulo, atendido: Boolean(atendido) })),
      nMinimo: conformidade.k_anonimato_n_minimo,
      observacao: conformidade.observacao,
    },

    // Plano de ação (insumo do PGR)
    planoAcao: plano.map((a) => ({
      grupo: a.ghe,
      prioridade: a.prioridade,
      dimensao: a.dimensao,
      acao: a.acao_sugerida,
      status: a.status,
    })),

    selo: {
      provisorio: Boolean(selo.provisorio),
      origemDados: selo.origem_dados,
      motor: selo.motor,
      aviso: selo.aviso,
    },
  };
}
