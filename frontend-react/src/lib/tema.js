// Psyra AI — preferência de tema (claro, escuro ou do sistema).
// A marca nasce escura; o modo claro vale para a landing, a privacidade e as telas de uso
// (acesso, painel e operação). Só o questionário do colaborador fica sempre escuro.
// A escolha fica só neste navegador (localStorage); não é dado pessoal e não vai ao servidor.

import { useCallback, useEffect, useState } from "react";

const CHAVE = "psyra-tema";
const OPCOES = ["escuro", "claro", "sistema"];
const EVENTO = "psyra-tema-alterado";

function lerPreferencia() {
  try {
    const salvo = window.localStorage.getItem(CHAVE);
    return OPCOES.includes(salvo) ? salvo : "escuro";
  } catch {
    return "escuro";
  }
}

function sistemaEhClaro() {
  return Boolean(window.matchMedia?.("(prefers-color-scheme: light)").matches);
}

export function resolverTema(preferencia) {
  if (preferencia === "sistema") return sistemaEhClaro() ? "claro" : "escuro";
  return preferencia === "claro" ? "claro" : "escuro";
}

/** Aplica o tema no <html>. `forcarEscuro` é usado nas páginas públicas (landing, questionário). */
export function aplicarTema(forcarEscuro = false) {
  const tema = forcarEscuro ? "escuro" : resolverTema(lerPreferencia());
  document.documentElement.dataset.tema = tema;
  document.documentElement.style.colorScheme = tema === "claro" ? "light" : "dark";
  return tema;
}

/** Liga por um instante a transição de cores, para a troca de tema não "piscar". */
function suavizarTroca() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const raiz = document.documentElement;
  raiz.classList.add("tema-transicao");
  window.clearTimeout(suavizarTroca.timer);
  suavizarTroca.timer = window.setTimeout(() => raiz.classList.remove("tema-transicao"), 500);
}

export function useTema() {
  const [preferencia, setPreferenciaEstado] = useState(lerPreferencia);
  const [tema, setTema] = useState(() => resolverTema(lerPreferencia()));

  useEffect(() => {
    const sincronizar = () => {
      const atual = lerPreferencia();
      setPreferenciaEstado(atual);
      setTema(aplicarTema());
    };
    const midia = window.matchMedia?.("(prefers-color-scheme: light)");
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    midia?.addEventListener?.("change", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
      midia?.removeEventListener?.("change", sincronizar);
    };
  }, []);

  const definirPreferencia = useCallback((nova) => {
    if (!OPCOES.includes(nova)) return;
    try {
      window.localStorage.setItem(CHAVE, nova);
    } catch {
      /* navegação privada: vale só nesta página */
    }
    setPreferenciaEstado(nova);
    suavizarTroca();
    setTema(aplicarTema());
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  const alternar = useCallback(() => {
    definirPreferencia(tema === "claro" ? "escuro" : "claro");
  }, [tema, definirPreferencia]);

  return { tema, preferencia, definirPreferencia, alternar };
}
