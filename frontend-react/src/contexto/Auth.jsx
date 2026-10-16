// Psyra AI — contexto de autenticação. Sprint: S6 | Risco: R2.
// Substitui a simulação de login da tela de entrada por chamada real à API.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { api, sessao, EVENTO_SESSAO_EXPIRADA } from "../lib/api";

const ContextoAuth = createContext(null);

export function ProvedorAuth({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = sessao.ler();
    return guardado?.trocar_senha ? null : guardado;
  });
  const [carregando, setCarregando] = useState(true);
  const [expirou, setExpirou] = useState(false);

  useEffect(() => {
    const aoExpirar = () => {
      setUsuario(null);
      setExpirou(true);
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  // Revalida o token guardado contra o servidor antes de confiar nele.
  useEffect(() => {
    const guardado = sessao.ler();
    if (!guardado) {
      setCarregando(false);
      return;
    }
    api
      .perfil()
      .then((perfil) => {
        const atualizado = {
          ...guardado,
          plano: perfil.plano ?? guardado.plano ?? "starter",
          porte: perfil.porte ?? guardado.porte,
          atuacao: perfil.atuacao ?? guardado.atuacao,
          empresa_nome: perfil.empresa_nome ?? guardado.empresa_nome,
          nome: perfil.nome ?? guardado.nome,
          email: perfil.email ?? guardado.email,
          papel: perfil.papel ?? guardado.papel,
          trocar_senha: perfil.trocar_senha ?? false,
          ultimo_acesso_em: perfil.ultimo_acesso_em ?? null,
        };
        sessao.gravar(atualizado);
        setUsuario(atualizado.trocar_senha ? null : atualizado);
      })
      .catch(() => {
        sessao.limpar();
        setUsuario(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (email, senha, lembrar = false) => {
    const dados = await api.entrar(email, senha, lembrar);
    sessao.gravar(dados);
    setExpirou(false);
    if (!dados.trocar_senha) setUsuario(dados);
    return dados;
  }, []);

  const atualizarSessao = useCallback((parcial) => {
    const atual = sessao.ler() || {};
    const novo = { ...atual, ...parcial };
    sessao.gravar(novo);
    if (!novo.trocar_senha) setUsuario(novo);
    return novo;
  }, []);

  const sair = useCallback(() => {
    sessao.limpar();
    setUsuario(null);
  }, []);

  return (
    <ContextoAuth.Provider value={{ usuario, carregando, entrar, sair, atualizarSessao, expirou }}>
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
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  return children;
}
