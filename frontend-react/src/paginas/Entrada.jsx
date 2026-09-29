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
import SeletorIdioma from "../componentes/SeletorIdioma";
import { EMAIL_CONTATO, IDIOMAS, aplicarIdiomaNoDocumento, idiomaPreferido } from "../lib/idiomas";
import { TEXTOS_ENTRADA } from "../lib/textosEntrada";
import "../estilos/operacao.css";

const PERFIS = {
  empresa: { id: "empresa", icone: Building2, placeholder: "voce@empresa.com.br" },
  superadmin: { id: "superadmin", icone: ShieldCheck, placeholder: "ops@psyra.ai" },
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

  const [perfil, setPerfil] = useState(perfilInicial);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [idioma, setIdioma] = useState(idiomaPreferido);
  const t = TEXTOS_ENTRADA[idioma];

  useEffect(() => {
    aplicarIdiomaNoDocumento(idioma, t.titulo);
  }, [idioma, t.titulo]);

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
      setErro(t.erroVazio);
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

  const perfilAtual = perfil ? { ...PERFIS[perfil], ...t.perfis[perfil] } : null;

  return (
    <main className="entrada entrada--v2">
      <div className="entrada__atmosfera" aria-hidden="true">
        <div className="entrada__brilho" />
        <div className="entrada__grain" />
      </div>

      <div className="entrada__controles">
        <SeletorIdioma
          atual={idioma}
          rotulo={t.idioma}
          aoTrocar={setIdioma}
          className="seletor-idioma--app"
        />
        <AlternarTema className="entrada__tema" />
      </div>

      <div className="acesso">
        <header className="acesso__marca rise" style={{ animationDelay: "0.04s" }}>
          <MarcaLogo className="marca__logo marca__logo--hero" size={72} />
          <div>
            <span className="acesso__nome">Psyra AI</span>
            <span className="acesso__eyebrow">{t.eyebrow}</span>
          </div>
        </header>

        {!perfilAtual ? (
          <section className="acesso__cartao rise" style={{ animationDelay: "0.12s" }}>
            <h1 className="acesso__titulo">
              {t.perguntaAntes}
              <em>{t.perguntaDestaque}</em>
              {t.perguntaDepois}
            </h1>
            <p className="acesso__apoio">{t.apoio}</p>
            {t.avisoIdioma ? <p className="acesso__aviso-idioma">{t.avisoIdioma}</p> : null}

            <div className="acesso__perfis">
              {Object.values(PERFIS).map(({ id, icone: Icone }) => {
                const { rotulo, descricao } = t.perfis[id];
                return (
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
                );
              })}
            </div>

            <div className="acesso__conta">
              <p>
                <strong>{t.semContaTitulo}</strong> {t.semContaTexto}
              </p>
              <a
                className="botao botao--fantasma botao--pequeno"
                href={`mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(t.assunto)}`}
              >
                <Mail size={15} aria-hidden="true" /> {t.solicitar}
              </a>
            </div>
          </section>
        ) : (
          <section className="acesso__cartao rise">
            <button className="acesso__voltar" type="button" onClick={voltarEscolha}>
              <ArrowLeft size={15} aria-hidden="true" /> {t.trocar}
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
                <label htmlFor="email">{t.email}</label>
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
                <label htmlFor="senha">{t.senha}</label>
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
                    aria-label={verSenha ? t.ocultarSenha : t.mostrarSenha}
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
                    <span className="spinner" aria-hidden="true" /> {t.entrando}
                  </>
                ) : (
                  <>
                    {t.entrar} <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <p className="acesso__privacidade">
              <Lock size={12} aria-hidden="true" /> {t.privacidade}
            </p>
          </section>
        )}

        <button
          className="acesso__inicio rise"
          type="button"
          style={{ animationDelay: "0.2s" }}
          onClick={() => navegar(IDIOMAS[idioma].inicio)}
        >
          <ArrowLeft size={15} aria-hidden="true" /> {t.voltar}
        </button>

        {import.meta.env.DEV ? (
          <p className="credenciais">Ambiente local · empresa demo: gestor@demo.psyra.ai</p>
        ) : null}
      </div>
    </main>
  );
}
