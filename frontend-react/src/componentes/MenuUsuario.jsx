// Menu da conta no topo do painel (avatar → configurações, como calcula, sair). Sprint: S10 | Risco: None

import { useEffect, useId, useRef, useState } from "react";
import { BookOpenCheck, ChevronDown, LogOut, Settings } from "lucide-react";

function iniciais(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase() || "RH";
}

export default function MenuUsuario({ usuario, textos, aoIr, aoSair }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  const idMenu = useId();

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento) => {
      if (caixa.current && !caixa.current.contains(evento.target)) setAberto(false);
    };
    const tecla = (evento) => evento.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    const primeiro = caixa.current?.querySelector('[role="menuitem"]');
    primeiro?.focus();
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const ir = (id) => {
    setAberto(false);
    aoIr(id);
  };

  return (
    <div className="menu-usuario" ref={caixa}>
      <button
        type="button"
        className="menu-usuario__botao"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={idMenu}
        aria-label={textos.abrir}
        onClick={() => setAberto((v) => !v)}
      >
        <span className="topbar__avatar" aria-hidden="true">
          {iniciais(usuario.nome)}
        </span>
        <span className="topbar__usuario-texto">
          <b>{usuario.nome}</b>
          <span>{textos.papeis[usuario.papel] ?? usuario.papel}</span>
        </span>
        <ChevronDown size={15} aria-hidden="true" className="menu-usuario__seta" />
      </button>
      {aberto ? (
        <div className="menu-usuario__lista" role="menu" id={idMenu}>
          <div className="menu-usuario__cabecalho">
            <b>{usuario.nome}</b>
            <span>{usuario.email}</span>
            <span className="menu-usuario__empresa">{usuario.empresa_nome}</span>
          </div>
          <button type="button" role="menuitem" onClick={() => ir("configuracoes")}>
            <Settings size={16} aria-hidden="true" /> {textos.configuracoes}
          </button>
          <button type="button" role="menuitem" onClick={() => ir("metodologia")}>
            <BookOpenCheck size={16} aria-hidden="true" /> {textos.metodologia}
          </button>
          <button type="button" role="menuitem" className="menu-usuario__sair" onClick={aoSair}>
            <LogOut size={16} aria-hidden="true" /> {textos.sair}
          </button>
        </div>
      ) : null}
    </div>
  );
}
