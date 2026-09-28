import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ProvedorAuth, RotaProtegida } from "./contexto/Auth";
import Admin from "./paginas/Admin";
import Entrada from "./paginas/Entrada";
import Landing, { Privacidade } from "./paginas/Landing";
import Painel from "./paginas/Painel";
import Responder from "./paginas/Responder";
import { aplicarTema } from "./lib/tema";
import "./estilos/tema-claro.css";

// Landing, privacidade e questionário do colaborador ficam sempre no tema escuro da marca;
// acesso, painel e operação seguem a preferência (claro, escuro ou do sistema).
const ROTAS_SEMPRE_ESCURAS = ["/", "/privacidade"];

function TemaPorRota() {
  const { pathname } = useLocation();
  useEffect(() => {
    const publica = ROTAS_SEMPRE_ESCURAS.includes(pathname) || pathname.startsWith("/responder");
    aplicarTema(publica);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <TemaPorRota />
      <ProvedorAuth>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/privacidade" element={<Privacidade />} />
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
