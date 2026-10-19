// Navegação das páginas públicas sem recarregar a página. Sprint: S10 | Risco: None
// - Trocar de idioma mantém a seção que a pessoa estava lendo (sem voltar ao topo).
// - Links para seções (#planos, #contato…) vindos de outra página não recarregam o site.
// - "/" abre sempre em português; /en e /zh só quando o visitante escolhe.

import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";


let posicaoTroca = null;

/** Guarda a seção visível (e o deslocamento dela na tela) antes de trocar de idioma. */
export function guardarPosicaoTroca() {
  try {
    const cabecalho = document.querySelector(".lp-header");
    const topo = cabecalho ? cabecalho.getBoundingClientRect().bottom : 0;
    const secoes = [...document.querySelectorAll("main section[id], main > [id]")];
    const atual = secoes.find((s) => s.getBoundingClientRect().bottom > topo + 8);
    posicaoTroca = atual
      ? { id: atual.id, deslocamento: atual.getBoundingClientRect().top }
      : { y: window.scrollY };
  } catch {
    posicaoTroca = null;
  }
}

/** Depois da troca, devolve a pessoa para a mesma seção, na mesma altura da tela. */
export function useRestaurarPosicaoTroca(chave) {
  useLayoutEffect(() => {
    if (!posicaoTroca) return;
    const p = posicaoTroca;
    posicaoTroca = null;
    const el = p.id ? document.getElementById(p.id) : null;
    const y = el ? window.scrollY + el.getBoundingClientRect().top - p.deslocamento : p.y;
    window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
  }, [chave]);
}

/** Rola até a seção do endereço (#id) quando a navegação veio de um link interno. */
export function useRolarParaHash() {
  const { hash, key } = useLocation();
  useEffect(() => {
    if (!hash) return undefined;
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return undefined;
    }
    const quadro = window.requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(quadro);
  }, [hash, key]);
}

/**
 * Mantido por compatibilidade com as páginas que o chamam. Desde 17/10/2026 a rota "/" abre
 * SEMPRE em português: a escolha salva de outro idioma não redireciona mais para /en ou /zh
 * (era isso que fazia a landing "abrir em inglês"). Os endereços /en e /zh seguem valendo.
 */
// eslint-disable-next-line no-unused-vars
export function useIdiomaEscolhido(idioma, destino) {}
