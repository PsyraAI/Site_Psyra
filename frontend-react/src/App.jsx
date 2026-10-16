import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ProvedorAuth, RotaProtegida } from "./contexto/Auth";
import Admin from "./paginas/Admin";
import Entrada from "./paginas/Entrada";
import Landing, { Privacidade } from "./paginas/Landing";
import Painel from "./paginas/Painel";
import Responder from "./paginas/Responder";
import { aplicarTema } from "./lib/tema";

// Todas as telas seguem a preferência de tema (claro, escuro ou do sistema): landing,
// privacidade, acesso, painel do RH e questionário do colaborador. Sprint: S10 | Risco: None
function TemaPorRota() {
  const { pathname } = useLocation();
  useEffect(() => {
    aplicarTema();
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <TemaPorRota />
      <ProvedorAuth>
        <Routes>
          <Route path="/" element={<Landing idioma="pt" />} />
          <Route path="/en" element={<Landing idioma="en" />} />
          <Route path="/zh" element={<Landing idioma="zh" />} />
          <Route path="/privacidade" element={<Privacidade idioma="pt" />} />
          <Route path="/en/privacy" element={<Privacidade idioma="en" />} />
          <Route path="/zh/privacy" element={<Privacidade idioma="zh" />} />
          <Route path="/entrar" element={<Entrada />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="/painel"
            element={
              <RotaProtegida>
                <Painel />
              </RotaProtegida>
            }
          />
          <Route path="/responder/:token" element={<Responder />} />
          <Route path="/responder" element={<Responder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProvedorAuth>
    </BrowserRouter>
  );
}
