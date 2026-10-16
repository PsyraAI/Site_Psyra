// Botão "?" que expande uma explicação curta embaixo do rótulo. Sprint: S10 | Risco: None

import { useId, useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function Explicacao({ rotulo, children, className = "" }) {
  const [aberta, setAberta] = useState(false);
  const id = useId();
  return (
    <span className={`explicacao ${aberta ? "explicacao--aberta" : ""} ${className}`}>
      <button
        type="button"
        className="explicacao__botao"
        aria-expanded={aberta}
        aria-controls={id}
        onClick={(evento) => {
          evento.stopPropagation();
          setAberta((v) => !v);
        }}
        title={rotulo}
      >
        <HelpCircle size={14} aria-hidden="true" />
        <span className="sr-only">{rotulo}</span>
        <ChevronDown size={12} aria-hidden="true" className="explicacao__seta" />
      </button>
      <span id={id} role="region" className="explicacao__texto" hidden={!aberta}>
        {children}
      </span>
    </span>
  );
}
