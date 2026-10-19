import { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { ProvedorAuth, RotaProtegida } from "./contexto/Auth";
import Landing, { GuiaNr1, Privacidade } from "./paginas/Landing";

// Telas de uso carregadas sob demanda: a landing (porta de entrada do Google) não baixa o
// código do painel, do admin nem dos gráficos. Melhora o LCP e o tempo até interagir.
const Admin = lazy(() => import("./paginas/Admin"));
const Entrada = lazy(() => import("./paginas/Entrada"));
const Painel = lazy(() => import("./paginas/Painel"));
const Responder = lazy(() => import("./paginas/Responder"));

function Carregando() {
  return (
    <div className="carregando-rota" role="status" aria-live="polite">
      <span className="carregando-rota__ponto" aria-hidden="true" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
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
        <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/" element={<Landing idioma="pt" />} />
            <Route path="/en" element={<Landing idioma="en" />} />
            <Route path="/zh" element={<Landing idioma="zh" />} />
            <Route path="/privacidade" element={<Privacidade idioma="pt" />} />
            <Route path="/en/privacy" element={<Privacidade idioma="en" />} />
            <Route path="/zh/privacy" element={<Privacidade idioma="zh" />} />
            <Route
              path="/termos"
              element={<Privacidade idioma="pt" parte="termos" />}
            />
            <Route
              path="/en/terms"
              element={<Privacidade idioma="en" parte="termos" />}
            />
            <Route
              path="/zh/terms"
              element={<Privacidade idioma="zh" parte="termos" />}
            />
            <Route
              path="/termos-de-uso"
              element={<Navigate to="/termos" replace />}
            />
            <Route
              path="/politica-de-privacidade"
              element={<Navigate to="/privacidade" replace />}
            />
            <Route path="/guia-nr1" element={<GuiaNr1 />} />
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
        </Suspense>
      </ProvedorAuth>
    </BrowserRouter>
  );
}
