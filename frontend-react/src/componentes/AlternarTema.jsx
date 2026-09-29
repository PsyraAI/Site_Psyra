// Alternador de tema claro/escuro (ícone na barra superior ou linha na barra lateral).

import { Moon, Sun } from "lucide-react";

import { useTema } from "../lib/tema";

export default function AlternarTema({ variante = "icone", className = "" }) {
  const { tema, alternar } = useTema();
  const proximo = tema === "claro" ? "escuro" : "claro";
  const Icone = tema === "claro" ? Moon : Sun;
  const rotulo = `Ativar modo ${proximo}`;

  if (variante === "linha") {
    return (
      <button type="button" className={`nav-item tema-linha ${className}`} onClick={alternar}>
        <Icone size={18} aria-hidden="true" />
        <span>Modo {proximo}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`tema-icone ${className}`}
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
    >
      <Icone size={17} aria-hidden="true" />
    </button>
  );
}
