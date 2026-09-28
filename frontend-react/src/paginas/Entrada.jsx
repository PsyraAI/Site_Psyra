// Psyra AI — tela de entrada unificada.
// Fluxo: escolha de perfil → login → /painel (empresa) ou /admin (operação Psyra).
// Contas de empresa são criadas pela equipe Psyra no painel de operação (/admin).

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../contexto/Auth";
import { apiAdmin, sessaoAdmin } from "../lib/api";
import AlternarTema from "../componentes/AlternarTema";
import MarcaLogo from "../componentes/MarcaLogo";
import "../estilos/operacao.css";

const PERFIS = {
  empresa: {
    id: "empresa",
    rotulo: "Empresa cliente",
    titulo: "Entrar no painel",
    descricao: "Resultados agregados por grupo (n ≥ 5), conformidade NR-1 e plano de ação.",
    icone: Building2,
    placeholder: "voce@empresa.com.br",
  },
  superadmin: {
    id: "superadmin",
    rotulo: "Operação Psyra",
    titulo: "Entrar na operação",
    descricao: "Equipe interna: empresas, planos e contas de acesso.",
    icone: ShieldCheck,
    placeholder: "ops@psyra.ai",
  },
};

const EMAIL_CONTATO = "psyra.ai.io@gmail.com";

export default function Entrada() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();

  const perfilInicial =
    local.state?.perfil === "superadmin" ||
    new URLSearchParams(local.search).get("perfil") === "superadmin"
      ? "superadmin"
      : null;

  const [perfil, setPerfil] = useState(perfilInicial);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
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
  }

  function voltarEscolha() {
    setPerfil(null);
    setErro("");
    setSenha("");
    setVerSenha(false);
  }

  async function aoEntrar(evento) {
    evento.preventDefault();
    setErro("");
    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }
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
    <main className="entrada entrada--v2">
      <div className="entrada__atmosfera" aria-hidden="true">
        <div className="entrada__brilho" />
        <div className="entrada__grain" />
      </div>

      <AlternarTema className="entrada__tema" />

      <div className="acesso">
        <header className="acesso__marca rise" style={{ animationDelay: "0.04s" }}>
          <MarcaLogo className="marca__logo marca__logo--hero" size={72} />
          <div>
            <span className="acesso__nome">Psyra AI</span>
            <span className="acesso__eyebrow">Saúde psicossocial · Conformidade NR-1</span>
          </div>
        </header>

        {!perfilAtual ? (
          <section className="acesso__cartao rise" style={{ animationDelay: "0.12s" }}>
            <h1 className="acesso__titulo">
              Como você quer <em>entrar</em>?
            </h1>
            <p className="acesso__apoio">Escolha o acesso certo para o seu papel.</p>

            <div className="acesso__perfis">
              {Object.values(PERFIS).map(({ id, rotulo, descricao, icone: Icone }) => (
                <button
                  key={id}
                  className="acesso__perfil"
                  type="button"
                  onClick={() => escolherPerfil(id)}
                >
                  <span className="acesso__perfil-icone" aria-hidden="true">
                    <Icone size={22} />
                  </span>
                  <span className="acesso__perfil-texto">
                    <strong>{rotulo}</strong>
                    <span>{descricao}</span>
                  </span>
                  <ArrowRight className="acesso__perfil-seta" size={18} aria-hidden="true" />
                </button>
              ))}
            </div>

            <div className="acesso__conta">
              <p>
                <strong>Sua empresa ainda não tem acesso?</strong> As contas são criadas pela
                equipe Psyra depois do diagnóstico gratuito.
              </p>
              <a
                className="botao botao--fantasma botao--pequeno"
                href={`mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent("Solicitar acesso à Psyra")}`}
              >
                <Mail size={15} aria-hidden="true" /> Solicitar acesso
              </a>
            </div>
          </section>
        ) : (
          <section className="acesso__cartao rise">
            <button className="acesso__voltar" type="button" onClick={voltarEscolha}>
              <ArrowLeft size={15} aria-hidden="true" /> Trocar tipo de acesso
            </button>
            <div className="acesso__form-topo">
              <span className="acesso__perfil-icone" aria-hidden="true">
                <perfilAtual.icone size={22} />
              </span>
              <div>
                <p className="acesso__rotulo">{perfilAtual.rotulo}</p>
                <h1 className="acesso__titulo acesso__titulo--form">{perfilAtual.titulo}</h1>
              </div>
            </div>
            <p className="acesso__apoio acesso__apoio--form">{perfilAtual.descricao}</p>

            <form onSubmit={aoEntrar} noValidate>
              <div className="campo">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder={perfilAtual.placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="campo">
                <label htmlFor="senha">Senha</label>
                <div className="campo-senha">
                  <input
                    id="senha"
                    type={verSenha ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="campo-senha__olho"
                    onClick={() => setVerSenha((v) => !v)}
                    aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {verSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <p className="erro" role="alert">
                {erro}
              </p>
              <button className="botao botao--bloco" type="submit" disabled={enviando}>
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

            <p className="acesso__privacidade">
              <Lock size={12} aria-hidden="true" /> Resultados sempre por grupo. Nunca dados
              individuais.
            </p>
          </section>
        )}

        <button
          className="acesso__inicio rise"
          type="button"
          style={{ animationDelay: "0.2s" }}
          onClick={() => navegar("/")}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Voltar à página inicial
        </button>

        {import.meta.env.DEV ? (
          <p className="credenciais">Ambiente local · empresa demo: gestor@demo.psyra.ai</p>
        ) : null}
      </div>
    </main>
  );
}
