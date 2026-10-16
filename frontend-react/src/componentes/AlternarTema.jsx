// Alternador de tema claro/escuro. Sprint: S10 | Risco: None

import { Moon, Sun } from "lucide-react";

import { useTema } from "../lib/tema";

export default function AlternarTema({ rotuloClaro = "Modo claro", rotuloEscuro = "Modo escuro", className = "" }) {
  const { tema, alternar } = useTema();
  const rotulo = tema === "claro" ? rotuloEscuro : rotuloClaro;
  const Icone = tema === "claro" ? Moon : Sun;
  return (
    <button
      type="button"
      className={`tema-icone ${className}`}
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      data-tema-atual={tema}
    >
      <Icone size={17} aria-hidden="true" />
    </button>
  );
}
