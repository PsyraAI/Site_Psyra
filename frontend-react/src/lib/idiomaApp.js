// Idioma das telas de uso (painel do RH). Sprint: S10 | Risco: None
// Usa a mesma escolha salva da landing e da tela de acesso; muda sem recarregar.

import { useCallback, useEffect, useState } from "react";

import { IDIOMAS, idiomaPreferido, salvarIdioma } from "./idiomas";

const EVENTO = "psyra-idioma-alterado";

export function useIdiomaApp() {
  const [idioma, setIdiomaEstado] = useState(idiomaPreferido);

  useEffect(() => {
    document.documentElement.lang = IDIOMAS[idioma]?.html ?? "pt-BR";
  }, [idioma]);

  useEffect(() => {
    const sincronizar = () => setIdiomaEstado(idiomaPreferido());
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  const setIdioma = useCallback((novo) => {
    if (!IDIOMAS[novo]) return;
    salvarIdioma(novo);
    setIdiomaEstado(novo);
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  return [idioma, setIdioma];
}
