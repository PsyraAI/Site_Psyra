// Psyra AI — cliente da API. Sprint: S6.
// Única porta de saída para o backend. Nenhum componente chama fetch direto.

const CHAVE_SESSAO = "psyra.sessao";
const CHAVE_ADMIN = "psyra.admin.sessao";

// Sessão: por padrão some ao fechar a aba (sessionStorage). Com "manter conectado",
// fica neste aparelho (localStorage) pelo prazo do token (7 dias). Só o token e o perfil;
// nenhum dado de resposta fica no navegador.
function criarSessao(chave) {
  const ler = (armazenamento) => {
    try {
      const bruto = armazenamento.getItem(chave);
      return bruto ? JSON.parse(bruto) : null;
    } catch {
      return null;
    }
  };
  return {
    ler() {
      return ler(sessionStorage) ?? ler(localStorage);
    },
    gravar(dados) {
      try {
        const persistente = Boolean(dados?.lembrar);
        (persistente ? localStorage : sessionStorage).setItem(chave, JSON.stringify(dados));
        (persistente ? sessionStorage : localStorage).removeItem(chave);
      } catch {
        /* navegador sem armazenamento: a sessão vive só na memória da página */
      }
    },
    limpar() {
      try {
        sessionStorage.removeItem(chave);
        localStorage.removeItem(chave);
      } catch {
        /* nada a limpar */
      }
    },
  };
}

export const EVENTO_SESSAO_EXPIRADA = "psyra:sessao-expirada";

export const sessao = criarSessao(CHAVE_SESSAO);
export const sessaoAdmin = criarSessao(CHAVE_ADMIN);

export class ErroApi extends Error {
  constructor(mensagem, status, detalhe = null) {
    super(mensagem);
    this.status = status;
    this.detalhe = detalhe;
    this.codigo = detalhe?.codigo || null;
  }
}

function mensagemDeErro(detalhe) {
  if (typeof detalhe === "string") return detalhe;
  if (detalhe && typeof detalhe === "object" && !Array.isArray(detalhe)) {
    if (typeof detalhe.mensagem === "string") return detalhe.mensagem;
    if (typeof detalhe.detail === "string") return detalhe.detail;
  }
  if (Array.isArray(detalhe)) {
    const mensagens = detalhe
      .map((item) => item?.msg)
      .filter(Boolean);
    if (mensagens.length) return mensagens.join(" ");
  }
  return "Não foi possível concluir a operação.";
}

async function requisitarComSessao(caminho, opcoes = {}, armazenamento = sessao) {
  const atual = armazenamento.ler();
  const cabecalhos = { "Content-Type": "application/json", ...(opcoes.headers || {}) };
  if (atual?.access_token) cabecalhos.Authorization = `Bearer ${atual.access_token}`;

  let resposta;
  try {
    resposta = await fetch(caminho, { ...opcoes, headers: cabecalhos });
  } catch {
    throw new ErroApi("Não foi possível falar com o servidor. Ele está rodando?", 0);
  }

  if (resposta.status === 401 && atual?.access_token) {
    armazenamento.limpar();
    window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
    throw new ErroApi("Sessão expirada. Entre novamente.", 401);
  }

  if (resposta.status === 204) return null;
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const detalhe = corpo.detail ?? corpo;
    throw new ErroApi(mensagemDeErro(detalhe), resposta.status, detalhe);
  }
  return corpo;
}

const requisitar = (caminho, opcoes = {}) =>
  requisitarComSessao(caminho, opcoes, sessao);

export const api = {
  saude: () => requisitar("/health"),
  entrar: (email, senha, lembrar = false) =>
    requisitar("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha, lembrar }),
    }),
  perfil: () => requisitar("/v1/auth/me"),
  sairDeTodos: () => requisitar("/v1/auth/sair-de-todos", { method: "POST" }),
  trocarSenha: (senhaAtual, senhaNova) =>
    requisitar("/v1/conta/senha", {
      method: "PUT",
      body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova }),
    }),
  atualizarConta: (dados) => requisitar("/v1/conta", { method: "PATCH", body: JSON.stringify(dados) }),
  configuracoes: (empresaId) => requisitar(`/v1/empresas/${empresaId}/configuracoes`),
  salvarConfiguracoes: (empresaId, dados) =>
    requisitar(`/v1/empresas/${empresaId}/configuracoes`, { method: "PATCH", body: JSON.stringify(dados) }),
  equipe: (empresaId) => requisitar(`/v1/empresas/${empresaId}/usuarios`),
  convidar: (empresaId, dados) =>
    requisitar(`/v1/empresas/${empresaId}/usuarios`, { method: "POST", body: JSON.stringify(dados) }),
  acessoUsuario: (empresaId, usuarioId, ativo) =>
    requisitar(`/v1/empresas/${empresaId}/usuarios/${usuarioId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ ativo }),
    }),
  senhaTemporaria: (empresaId, usuarioId) =>
    requisitar(`/v1/empresas/${empresaId}/usuarios/${usuarioId}/senha-temporaria`, { method: "POST" }),
  qualidade: (empresaId, coletaId) => requisitar(`/v1/empresas/${empresaId}/coletas/${coletaId}/qualidade`),
  listarColetas: (empresaId) => requisitar(`/v1/empresas/${empresaId}/coletas`),
  listarGhes: (empresaId) => requisitar(`/v1/empresas/${empresaId}/ghes`),
  encerrarColeta: (empresaId, coletaId) =>
    requisitar(`/v1/empresas/${empresaId}/coletas/${coletaId}/encerrar`, { method: "POST" }),
  criarColeta: (empresaId, dados) =>
    requisitar(`/v1/empresas/${empresaId}/coletas`, {
      method: "POST",
      body: JSON.stringify(dados),
    }),
  // Contrato do painel — o mesmo documentado em fetchPainel() no psyra_dashboard.jsx.
  painel: (empresaId, coletaId) =>
    requisitar(`/v1/empresas/${empresaId}/coletas/${coletaId}/painel`),
  capitalRisco: (empresaId, coletaId) =>
    requisitar(`/v1/empresas/${empresaId}/coletas/${coletaId}/capital-risco`),
  googleForm: (empresaId, coletaId) =>
    requisitar(`/v1/empresas/${empresaId}/coletas/${coletaId}/google-form`),
  configurarGoogleForm: (empresaId, coletaId, dados) =>
    requisitar(`/v1/empresas/${empresaId}/coletas/${coletaId}/google-form`, {
      method: "PUT",
      body: JSON.stringify(dados),
    }),
  auditoria: (empresaId) => requisitar(`/v1/empresas/${empresaId}/auditoria`),
  formularioPublico: (token) => requisitar(`/v1/coletas/${token}/formulario`),
  enviarResposta: (payload) =>
    requisitar("/v1/coleta", { method: "POST", body: JSON.stringify(payload) }),
  registrarInicio: (token, etapa, gheCodigo = null) =>
    requisitar(`/v1/coletas/${token}/inicio`, {
      method: "POST",
      body: JSON.stringify({ etapa, ghe_codigo: gheCodigo }),
    }).catch(() => null),
};

const adminRequest = (caminho, opcoes = {}) =>
  requisitarComSessao(caminho, opcoes, sessaoAdmin);

export const apiAdmin = {
  entrar: (email, senha) =>
    adminRequest("/v1/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    }),
  perfil: () => adminRequest("/v1/admin/me"),
  empresas: () => adminRequest("/v1/admin/empresas"),
  criarEmpresa: (dados) =>
    adminRequest("/v1/admin/empresas", {
      method: "POST",
      body: JSON.stringify(dados),
    }),
  atualizarEmpresa: (empresaId, dados) =>
    adminRequest(`/v1/admin/empresas/${empresaId}`, {
      method: "PATCH",
      body: JSON.stringify(dados),
    }),
  statusEmpresa: (empresaId, ativo) =>
    adminRequest(`/v1/admin/empresas/${empresaId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ ativo }),
    }),
  usuarios: (empresaId) =>
    adminRequest(`/v1/admin/empresas/${empresaId}/usuarios`),
  criarUsuario: (empresaId, dados) =>
    adminRequest(`/v1/admin/empresas/${empresaId}/usuarios`, {
      method: "POST",
      body: JSON.stringify(dados),
    }),
  statusUsuario: (usuarioId, ativo) =>
    adminRequest(`/v1/admin/usuarios/${usuarioId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ ativo }),
    }),
  redefinirSenha: (usuarioId, senha) =>
    adminRequest(`/v1/admin/usuarios/${usuarioId}/redefinir-senha`, {
      method: "POST",
      body: JSON.stringify({ senha }),
    }),
};
