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

// O questionário do colaborador fica sempre no tema escuro da marca (tela neutra, igual para todos).
// Landing, privacidade, acesso, painel e operação seguem a preferência (claro, escuro ou do sistema).
// A landing e a privacidade existem em pt-BR (/), inglês (/en) e chinês simplificado (/zh).
const ROTAS_PUBLICAS = ["/", "/privacidade", "/en", "/en/privacy", "/zh", "/zh/privacy"];

function TemaPorRota() {
  const { pathname } = useLocation();
  useEffect(() => {
    const rota = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    const publica = ROTAS_PUBLICAS.includes(rota) || rota.startsWith("/responder");
    aplicarTema(rota.startsWith("/responder"));
    if (!publica && !rota.startsWith("/entrar")) document.documentElement.lang = "pt-BR";
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
