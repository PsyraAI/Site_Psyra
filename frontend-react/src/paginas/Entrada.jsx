// Psyra AI — tela de entrada unificada.
// Fluxo: boas-vindas → escolha de perfil → login → /painel ou /admin.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Lock, Shield } from "lucide-react";

import { useAuth } from "../contexto/Auth";
import { apiAdmin, sessaoAdmin } from "../lib/api";
import MarcaLogo from "../componentes/MarcaLogo";

const PERFIS = {
  empresa: {
    id: "empresa",
    titulo: "Empresa piloto",
    descricao: "Ver o resultado agregado da pesquisa do formulário.",
    destino: "/painel",
  },
  superadmin: {
    id: "superadmin",
    titulo: "Superadmin",
    descricao: "Operação global: cadastrar empresas e usuários.",
    destino: "/admin",
  },
};

export default function Entrada() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();

  const perfilInicial =
    local.state?.perfil === "superadmin" ||
    new URLSearchParams(local.search).get("perfil") === "superadmin"
      ? "superadmin"
      : null;

  const [etapa, setEtapa] = useState(perfilInicial ? "login" : "escolha");
  const [perfil, setPerfil] = useState(perfilInicial);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario) navegar("/painel", { replace: true });
  }, [usuario, navegar]);

  useEffect(() => {
    const admin = sessaoAdmin.ler();
    if (!admin?.access_token) return;
    apiAdmin
      .perfil()
      .then(() => navegar("/admin", { replace: true }))
      .catch(() => sessaoAdmin.limpar());
  }, [navegar]);

  function escolherPerfil(id) {
    setPerfil(id);
    setErro("");
    setEtapa("login");
  }

  async function aoEntrar(evento) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      if (perfil === "superadmin") {
        const dados = await apiAdmin.entrar(email.trim(), senha);
        sessaoAdmin.gravar(dados);
        navegar("/admin", { replace: true });
        return;
      }
      await entrar(email.trim(), senha);
      navegar("/painel", { replace: true });
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  const perfilAtual = perfil ? PERFIS[perfil] : null;

  return (
    <main className="entrada">
      <div className="entrada__atmosfera" aria-hidden="true">
        <div className="entrada__brilho" />
        <div className="entrada__grain" />
      </div>

      <div className="entrada__conteudo">
        <p className="entrada__eyebrow rise" style={{ animationDelay: "0.04s" }}>
          Saúde psicossocial · Conformidade NR-1
        </p>

        <div className="entrada__marca rise" style={{ animationDelay: "0.1s" }}>
          <MarcaLogo className="marca__logo marca__logo--entrada" size={64} />
          <span className="marca__nome">Psyra AI</span>
        </div>

        {etapa === "escolha" ? (
          <>
            <h1 className="entrada__headline rise" style={{ animationDelay: "0.18s" }}>
              Como você quer <em>entrar</em>?
            </h1>
            <p className="entrada__tagline rise" style={{ animationDelay: "0.26s" }}>
              Escolha o acesso certo para o seu papel.
            </p>

            <div className="entrada__perfis rise" style={{ animationDelay: "0.34s" }}>
              <button
                className="entrada__perfil"
                type="button"
                onClick={() => escolherPerfil("empresa")}
              >
                <Building2 size={22} aria-hidden="true" />
                <span className="entrada__perfil-titulo">Empresa piloto</span>
                <span className="entrada__perfil-texto">
                  Ver o resultado agregado da pesquisa do formulário.
                </span>
                <span className="entrada__perfil-cta">
                  Continuar <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>

              <button
                className="entrada__perfil"
                type="button"
                onClick={() => escolherPerfil("superadmin")}
              >
                <Shield size={22} aria-hidden="true" />
                <span className="entrada__perfil-titulo">Superadmin</span>
                <span className="entrada__perfil-texto">
                  Operação global da Psyra: empresas e usuários.
                </span>
                <span className="entrada__perfil-cta">
                  Continuar <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>
            </div>

            <button
              className="botao botao--fantasma rise"
              type="button"
              style={{ width: "100%", marginTop: 16, animationDelay: "0.42s" }}
              onClick={() => navegar("/")}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Voltar à página inicial
            </button>
          </>
        ) : (
          <div className="entrada__form rise">
            <div className="entrada__form-card">
              <p className="entrada__form-perfil">{perfilAtual?.titulo}</p>
              <h1>
                {perfil === "superadmin" ? "Entrar na operação" : "Entrar no painel"}
              </h1>
              <p className="entrada__form-apoio">{perfilAtual?.descricao}</p>
              <form onSubmit={aoEntrar} noValidate>
                <div className="campo">
                  <label htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder={
                      perfil === "superadmin" ? "ops@psyra.ai" : "voce@empresa.com.br"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="campo">
                  <label htmlFor="senha">Senha</label>
                  <input
                    id="senha"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                </div>
                <p className="erro" role="alert">
                  {erro}
                </p>
                <button
                  className="botao"
                  type="submit"
                  style={{ width: "100%" }}
                  disabled={enviando}
                >
                  {enviando ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Entrando…
                    </>
                  ) : (
                    <>
                      Entrar <ArrowRight size={17} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <p className="entrada__privacidade">
                <Lock size={12} aria-hidden="true" /> Resultados sempre por grupo.
                Nunca dados individuais.
              </p>
            </div>

            <button
              className="botao botao--fantasma"
              type="button"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => {
                setEtapa("escolha");
                setPerfil(null);
                setErro("");
                setSenha("");
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Voltar à escolha
            </button>

            <button
              className="botao botao--fantasma"
              type="button"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => navegar("/")}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Voltar à página inicial
            </button>
          </div>
        )}

        {import.meta.env.DEV ? (
          <p className="credenciais rise" style={{ animationDelay: "0.48s" }}>
            Ambiente local · empresa demo: gestor@demo.psyra.ai
          </p>
        ) : null}
      </div>
    </main>
  );
}
