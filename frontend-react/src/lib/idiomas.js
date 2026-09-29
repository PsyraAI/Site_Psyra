// Idiomas das páginas públicas (landing, privacidade, acesso). Sprint: S10 | Risco: None
// Questionário, painel e análise de texto seguem só em pt-BR: o instrumento e o modelo
// foram desenhados e validados em português (adaptação para outro idioma exige o
// processo da ITC — tradução, revisão, piloto e equivalência).

export const IDIOMAS = {
  pt: { id: "pt", html: "pt-BR", locale: "pt-BR", nome: "Português", inicio: "/", privacidade: "/privacidade" },
  en: { id: "en", html: "en", locale: "en-US", nome: "English", inicio: "/en", privacidade: "/en/privacy" },
  zh: { id: "zh", html: "zh-Hans", locale: "zh-CN", nome: "简体中文", inicio: "/zh", privacidade: "/zh/privacy" },
};

export const ORDEM_IDIOMAS = ["pt", "en", "zh"];
export const CHAVE_IDIOMA = "psyra-idioma";
export const EMAIL_CONTATO = "psyra.ai.io@gmail.com";

/** Idioma salvo pelo visitante (ou null se ele nunca escolheu). */
export function idiomaSalvo() {
  try {
    const valor = localStorage.getItem(CHAVE_IDIOMA);
    return IDIOMAS[valor] ? valor : null;
  } catch {
    return null;
  }
}

export function salvarIdioma(id) {
  try {
    if (IDIOMAS[id]) localStorage.setItem(CHAVE_IDIOMA, id);
  } catch {
    /* navegação privada: segue sem persistir */
  }
}

/** Idioma sugerido pelo navegador — só sugere, nunca redireciona. */
export function idiomaDoNavegador() {
  const lista = typeof navigator === "undefined" ? [] : navigator.languages || [navigator.language];
  for (const tag of lista) {
    const base = String(tag || "").toLowerCase();
    if (base.startsWith("pt")) return "pt";
    if (base.startsWith("zh")) return "zh";
    if (base.startsWith("en")) return "en";
  }
  return null;
}

/** Idioma das telas sem URL própria (acesso): escolha salva > navegador > pt. */
export function idiomaPreferido() {
  return idiomaSalvo() || idiomaDoNavegador() || "pt";
}

/** Aplica lang, título e descrição da página ativa. */
export function aplicarIdiomaNoDocumento(id, titulo, descricao) {
  const cfg = IDIOMAS[id] || IDIOMAS.pt;
  document.documentElement.lang = cfg.html;
  if (titulo) document.title = titulo;
  if (descricao) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", descricao);
  }
}

/** Valores sempre em reais (BRL), com o formato do idioma. */
export function formatarReais(valor, id, casas = 0) {
  const cfg = IDIOMAS[id] || IDIOMAS.pt;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function formatarNumero(valor, id) {
  const cfg = IDIOMAS[id] || IDIOMAS.pt;
  return new Intl.NumberFormat(cfg.locale).format(valor);
}
