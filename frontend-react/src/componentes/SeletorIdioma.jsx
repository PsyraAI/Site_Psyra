// Seletor de idioma: nomes nativos, sem bandeiras, com ícone de globo. Sprint: S10 | Risco: None
// Nas páginas com URL por idioma (landing, privacidade) usa links; nas demais, troca o estado.

import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Globe } from "lucide-react";

import { IDIOMAS, ORDEM_IDIOMAS, salvarIdioma } from "../lib/idiomas";

export default function SeletorIdioma({ atual, rotulo, destino, aoTrocar, className = "", alinhar = "fim" }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const idLista = useId();

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento) => {
      if (raiz.current && !raiz.current.contains(evento.target)) setAberto(false);
    };
    const tecla = (evento) => {
      if (evento.key === "Escape") setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  function escolher(id) {
    salvarIdioma(id);
    setAberto(false);
    if (aoTrocar) aoTrocar(id);
  }

  return (
    <div ref={raiz} className={`seletor-idioma ${className}`}>
      <button
        type="button"
        className="seletor-idioma__botao"
        aria-haspopup="true"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-label={`${rotulo}: ${IDIOMAS[atual].nome}`}
        onClick={() => setAberto((v) => !v)}
      >
        <Globe size={16} aria-hidden="true" />
        <span lang={IDIOMAS[atual].html}>{IDIOMAS[atual].nome}</span>
        <ChevronDown size={14} aria-hidden="true" className="seletor-idioma__seta" />
      </button>
      {aberto ? (
        <ul id={idLista} className={`seletor-idioma__lista seletor-idioma__lista--${alinhar}`}>
          {ORDEM_IDIOMAS.map((id) => {
            const cfg = IDIOMAS[id];
            const conteudo = (
              <>
                <span lang={cfg.html}>{cfg.nome}</span>
                {id === atual ? <Check size={14} aria-hidden="true" /> : null}
              </>
            );
            return (
              <li key={id}>
                {destino ? (
                  <Link
                    to={destino(id)}
                    hrefLang={cfg.html}
                    lang={cfg.html}
                    aria-current={id === atual ? "true" : undefined}
                    onClick={() => escolher(id)}
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <button type="button" aria-current={id === atual ? "true" : undefined} onClick={() => escolher(id)}>
                    {conteudo}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
