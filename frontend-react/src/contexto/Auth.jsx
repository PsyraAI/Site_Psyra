// Psyra AI — contexto de autenticação. Sprint: S6 | Risco: R2.
// Substitui a simulação de login da tela de entrada por chamada real à API.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { api, sessao } from "../lib/api";

const ContextoAuth = createContext(null);

export function ProvedorAuth({ children }) {
  const [usuario, setUsuario] = useState(() => sessao.ler());
  const [carregando, setCarregando] = useState(true);

  // Revalida o token guardado contra o servidor antes de confiar nele.
  useEffect(() => {
    const guardado = sessao.ler();
    if (!guardado) {
      setCarregando(false);
      return;
    }
    api
      .perfil()
      .then(() => setUsuario(guardado))
      .catch(() => {
        sessao.limpar();
        setUsuario(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const dados = await api.entrar(email, senha);
    sessao.gravar(dados);
    setUsuario(dados);
    return dados;
  }, []);

  const sair = useCallback(() => {
    sessao.limpar();
    setUsuario(null);
  }, []);

  return (
    <ContextoAuth.Provider value={{ usuario, carregando, entrar, sair }}>
      {children}
    </ContextoAuth.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(ContextoAuth);
  if (!contexto) throw new Error("useAuth precisa estar dentro de <ProvedorAuth>");
  return contexto;
}

/** Guarda de rota: sem sessão válida, devolve para a entrada. */
export function RotaProtegida({ children }) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) {
    return (
      <div className="entrada">
        <p className="aviso">Verificando sessão…</p>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/" replace state={{ de: local.pathname }} />;
  return children;
}
