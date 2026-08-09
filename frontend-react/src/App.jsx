// Psyra AI — roteamento da aplicação. Sprint: S6.
// Entrada unificada escolhe perfil (empresa ou superadmin) e encaminha o login.

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProvedorAuth, RotaProtegida } from "./contexto/Auth";
import Admin from "./paginas/Admin";
import Entrada from "./paginas/Entrada";
import Painel from "./paginas/Painel";
import Responder from "./paginas/Responder";

export default function App() {
  return (
    <BrowserRouter>
      <ProvedorAuth>
        <Routes>
          <Route path="/" element={<Entrada />} />
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
