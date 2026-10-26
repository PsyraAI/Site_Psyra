// Phrona — guia do painel (coruja da marca). Sprint: S10 | Risco: R2
// Botão fixo que abre um painel lateral com três abas: o que é a tela atual, perguntas
// frequentes com busca e o tour "do sinal à ação". Não usa IA nem rede: os textos estão em
// lib/textosPhrona.js e nada do painel é enviado para fora do navegador.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Search, X } from "lucide-react";

import { TEXTOS_PHRONA, normalizar } from "../lib/textosPhrona";

const CHAVE_CONVITE = "psyra.phrona.convite";

function lerConvite() {
  try {
    return window.localStorage.getItem(CHAVE_CONVITE) === "visto";
  } catch {
    return true; // sem armazenamento (aba anônima): não insiste com o convite
  }
}

function marcarConvite() {
  try {
    window.localStorage.setItem(CHAVE_CONVITE, "visto");
  } catch {
    /* sem armazenamento: o convite volta na próxima visita, sem erro */
  }
}

/** Coruja da Phrona: desenho próprio, em traço simples, nas cores da marca. */
export function CorujaPhrona({ tamanho = 28 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M10 14 L15 6 L19 12 Q24 10 29 12 L33 6 L38 14 Q42 22 40 32 Q37 43 24 44 Q11 43 8 32 Q6 22 10 14 Z" fill="currentColor" opacity="0.22" />
      <path d="M10 14 L15 6 L19 12 Q24 10 29 12 L33 6 L38 14 Q42 22 40 32 Q37 43 24 44 Q11 43 8 32 Q6 22 10 14 Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="17.5" cy="22" r="6" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="30.5" cy="22" r="6" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="17.5" cy="22" r="2.2" fill="currentColor" />
      <circle cx="30.5" cy="22" r="2.2" fill="currentColor" />
      <path d="M22 28 L24 32 L26 28 Z" fill="currentColor" />
      <path d="M15 36 Q24 40 33 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export default function Phrona({ secao, idioma = "pt", aoIr, nomesSecoes }) {
  const t = TEXTOS_PHRONA[idioma] ?? TEXTOS_PHRONA.pt;
  const [aberta, setAberta] = useState(false);
  const [aba, setAba] = useState("tela");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(null);
  const [passo, setPasso] = useState(0);
  const [convite, setConvite] = useState(false);
  const painelRef = useRef(null);
  const botaoRef = useRef(null);

  useEffect(() => {
    if (lerConvite()) return undefined;
    const id = window.setTimeout(() => setConvite(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  const fecharConvite = useCallback(() => {
    setConvite(false);
    marcarConvite();
  }, []);

  const abrir = useCallback((qual = "tela") => {
    setAba(qual);
    setAberta(true);
    fecharConvite();
  }, [fecharConvite]);

  const fechar = useCallback(() => {
    setAberta(false);
    botaoRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!aberta) return undefined;
    painelRef.current?.querySelector("[data-foco-inicial]")?.focus();
    const aoTeclar = (evento) => {
      if (evento.key === "Escape") fechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, fechar]);

  const tela = t.telas[secao] ?? t.telas.visao;
  const perguntas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return t.perguntas;
    return t.perguntas.filter(([p, r]) => normalizar(`${p} ${r}`).includes(termo));
  }, [busca, t]);

  const total = t.passos.length;
  const [destinoPasso, tituloPasso, textoPasso] = t.passos[Math.min(passo, total - 1)];
  const irParaPasso = useCallback(
    (indice) => {
      const alvo = Math.max(0, Math.min(total - 1, indice));
      setPasso(alvo);
      aoIr?.(t.passos[alvo][0]);
    },
    [aoIr, t, total]
  );

  return (
    <>
      {convite && !aberta ? (
        <div className="phrona-convite" role="dialog" aria-label={t.nome}>
          <div className="phrona-convite__topo">
            <span className="phrona-convite__coruja"><CorujaPhrona tamanho={30} /></span>
            <p>{t.convite}</p>
          </div>
          <div className="phrona-convite__acoes">
            <button type="button" className="botao botao--pequeno" onClick={() => { abrir("tour"); irParaPasso(0); }}>
              {t.conviteSim}
            </button>
            <button type="button" className="botao botao--fantasma botao--pequeno" onClick={fecharConvite}>
              {t.conviteNao}
            </button>
          </div>
        </div>
      ) : null}

      <button
        ref={botaoRef}
        type="button"
        className={`phrona-botao${aberta ? " phrona-botao--aberta" : ""}`}
        onClick={() => (aberta ? fechar() : abrir("tela"))}
        aria-expanded={aberta}
        aria-controls="phrona-painel"
        aria-label={aberta ? t.fechar : t.abrir}
        title={t.nome}
      >
        {aberta ? <X size={22} aria-hidden="true" /> : <CorujaPhrona tamanho={30} />}
      </button>

      {aberta ? (
        <aside id="phrona-painel" ref={painelRef} className="phrona-painel" role="dialog" aria-modal="false" aria-label={`${t.nome} · ${t.papel}`}>
          <header className="phrona-painel__topo">
            <span className="phrona-painel__coruja"><CorujaPhrona tamanho={34} /></span>
            <div>
              <p className="phrona-painel__nome">{t.nome}</p>
              <p className="phrona-painel__papel">{t.papel}</p>
            </div>
            <button type="button" className="phrona-painel__fechar" onClick={fechar} aria-label={t.fechar} data-foco-inicial>
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="phrona-abas" role="tablist">
            {["tela", "perguntas", "tour"].map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={aba === id}
                className={`phrona-aba${aba === id ? " phrona-aba--ativa" : ""}`}
                onClick={() => setAba(id)}
              >
                {t.abas[id]}
              </button>
            ))}
          </div>

          <div className="phrona-painel__corpo">
            {aba === "tela" ? (
              <div className="phrona-tela">
                <h2>{tela.titulo}</h2>
                <p>{tela.texto}</p>
                <p className="phrona-rotulo">{t.comoLer}</p>
                <ul>
                  {tela.pontos.map((ponto) => (
                    <li key={ponto}>{ponto}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {aba === "perguntas" ? (
              <div className="phrona-perguntas">
                <label className="phrona-busca">
                  <Search size={15} aria-hidden="true" />
                  <span className="sr-only">{t.buscar}</span>
                  <input type="search" value={busca} placeholder={t.buscar} onChange={(e) => setBusca(e.target.value)} />
                </label>
                {perguntas.length === 0 ? <p className="phrona-vazio">{t.semResultado}</p> : null}
                <ul className="phrona-faq">
                  {perguntas.map(([pergunta, resposta]) => {
                    const ativo = aberto === pergunta;
                    return (
                      <li key={pergunta}>
                        <button type="button" className="phrona-faq__pergunta" aria-expanded={ativo} onClick={() => setAberto(ativo ? null : pergunta)}>
                          <span>{pergunta}</span>
                          <ChevronDown size={16} aria-hidden="true" />
                        </button>
                        {ativo ? <p className="phrona-faq__resposta">{resposta}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {aba === "tour" ? (
              <div className="phrona-tour">
                <p className="phrona-tour__intro">{t.tour.intro}</p>
                <ol className="phrona-tour__trilha" aria-label={t.abas.tour}>
                  {t.passos.map(([id, titulo], i) => (
                    <li key={id} className={i === passo ? "atual" : i < passo ? "feito" : ""}>
                      <button type="button" onClick={() => irParaPasso(i)} aria-current={i === passo ? "step" : undefined}>
                        <span className="phrona-tour__num">{i < passo ? <Check size={12} aria-hidden="true" /> : i + 1}</span>
                        <span>{titulo}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="phrona-tour__cartao">
                  <p className="phrona-rotulo">{t.tour.passo(passo + 1, total)} · {nomesSecoes?.[destinoPasso] ?? ""}</p>
                  <h3>{tituloPasso}</h3>
                  <p>{textoPasso}</p>
                  {secao !== destinoPasso ? (
                    <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => aoIr?.(destinoPasso)}>
                      {t.tour.ir}
                    </button>
                  ) : null}
                </div>
                <div className="phrona-tour__nav">
                  <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => irParaPasso(passo - 1)} disabled={passo === 0}>
                    <ArrowLeft size={14} aria-hidden="true" /> {t.tour.anterior}
                  </button>
                  {passo < total - 1 ? (
                    <button type="button" className="botao botao--pequeno" onClick={() => irParaPasso(passo + 1)}>
                      {t.tour.proximo} <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="button" className="botao botao--pequeno" onClick={() => { setPasso(0); setAba("tela"); }}>
                      <Check size={14} aria-hidden="true" /> {t.tour.fim}
                    </button>
                  )}
                </div>
                {passo === total - 1 ? <p className="phrona-tour__fim">{t.tour.concluido}</p> : null}
              </div>
            ) : null}
          </div>

          <p className="phrona-painel__rodape">{t.rodape}</p>
        </aside>
      ) : null}
    </>
  );
}
