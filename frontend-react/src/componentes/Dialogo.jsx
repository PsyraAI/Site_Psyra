// Diálogo modal acessível (foco preso, Esc fecha, clique fora fecha). Sprint: S10 | Risco: None

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function Dialogo({ aberto, titulo, aoFechar, rotuloFechar = "Fechar", children, acoes }) {
  const idTitulo = useId();
  const caixa = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const anterior = document.activeElement;
    const foco = () => {
      const alvo = caixa.current?.querySelector("input, select, textarea, button:not([data-fechar])");
      (alvo ?? caixa.current)?.focus();
    };
    const t = window.setTimeout(foco, 20);
    const tecla = (evento) => {
      if (evento.key === "Escape") aoFechar();
      if (evento.key === "Tab" && caixa.current) {
        const focaveis = [...caixa.current.querySelectorAll("button, input, select, textarea, a[href]")].filter((el) => !el.disabled);
        if (!focaveis.length) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener("keydown", tecla);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", tecla);
      anterior?.focus?.();
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div className="dialogo-fundo" onPointerDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="dialogo" role="dialog" aria-modal="true" aria-labelledby={idTitulo} ref={caixa} tabIndex={-1}>
        <div className="dialogo__topo">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="dialogo__fechar" onClick={aoFechar} aria-label={rotuloFechar} data-fechar>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="dialogo__corpo">{children}</div>
        {acoes ? <div className="dialogo__acoes">{acoes}</div> : null}
      </div>
    </div>
  );
}
