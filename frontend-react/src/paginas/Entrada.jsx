// Psyra AI — tela de entrada unificada.
// Fluxo: boas-vindas → escolha de perfil → login → /painel ou /admin.

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, KeyRound, Lock, Mail, Shield, TimerReset } from "lucide-react";

import { useAuth } from "../contexto/Auth";
import { api, apiAdmin, sessao, sessaoAdmin } from "../lib/api";
import MarcaLogo from "../componentes/MarcaLogo";
import SeletorIdioma from "../componentes/SeletorIdioma";
import AlternarTema from "../componentes/AlternarTema";
import CampoSenha from "../componentes/CampoSenha";
import Dialogo from "../componentes/Dialogo";
import { useIdiomaApp } from "../lib/idiomaApp";
import { TEXTOS_APP } from "../lib/textosApp";
import { TEXTOS_CONTA } from "../lib/textosConta";
import { EMAIL_CONTATO, IDIOMAS, aplicarIdiomaNoDocumento } from "../lib/idiomas";
import { TEXTOS_ENTRADA } from "../lib/textosEntrada";

export default function Entrada() {
  const { usuario, entrar, atualizarSessao, expirou } = useAuth();
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
  const [lembrar, setLembrar] = useState(false);
  const [esqueciAberto, setEsqueciAberto] = useState(false);
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirma, setSenhaConfirma] = useState("");
  const [pedirAtual, setPedirAtual] = useState(false);
  const [idioma, setIdioma] = useIdiomaApp();
  const t = TEXTOS_ENTRADA[idioma];
  const tc = TEXTOS_CONTA[idioma];

  // sessão com senha temporária (recarregou a página no meio do primeiro acesso)
  useEffect(() => {
    const guardada = sessao.ler();
    if (guardada?.trocar_senha && etapa !== "primeiro") {
      setPerfil("empresa");
      setPedirAtual(true);
      setEtapa("primeiro");
    }
  }, [etapa]);

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
    setEtapa("login");
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
      const dados = await entrar(email.trim(), senha, lembrar);
      if (dados.trocar_senha) {
        setEtapa("primeiro");
        return;
      }
      navegar("/painel", { replace: true });
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  async function aoCriarSenha(evento) {
    evento.preventDefault();
    setErro("");
    if (senhaNova !== senhaConfirma) {
      setErro(tc.entrada.naoConfere);
      return;
    }
    setEnviando(true);
    try {
      const dados = await api.trocarSenha(senha, senhaNova);
      atualizarSessao({ ...dados, trocar_senha: false });
      navegar("/painel", { replace: true });
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  const perfilAtual = perfil ? t.perfis[perfil] : null;

  return (
    <main className="entrada" lang={IDIOMAS[idioma].html}>
      <div className="entrada__atmosfera" aria-hidden="true">
        <div className="entrada__brilho" />
        <div className="entrada__grain" />
      </div>
      <div className="entrada__idioma">
        <AlternarTema rotuloClaro={TEXTOS_APP[idioma].temaClaro} rotuloEscuro={TEXTOS_APP[idioma].temaEscuro} />
        <SeletorIdioma atual={idioma} rotulo={t.idioma} aoTrocar={setIdioma} />
      </div>

      <div className="entrada__conteudo">
        <p className="entrada__eyebrow rise" style={{ animationDelay: "0.04s" }}>
          {t.eyebrow}
        </p>

        <div className="entrada__marca rise" style={{ animationDelay: "0.1s" }}>
          <MarcaLogo className="marca__logo marca__logo--entrada" size={64} />
          <span className="marca__nome">Psyra AI</span>
        </div>

        {expirou && etapa !== "primeiro" ? (
          <p className="entrada__expirou" role="status">
            <TimerReset size={15} aria-hidden="true" /> {tc.entrada.expirou}
          </p>
        ) : null}

        {etapa === "escolha" ? (
          <>
            <h1 className="entrada__headline rise" style={{ animationDelay: "0.18s" }}>
              {t.perguntaAntes}
              <em>{t.perguntaDestaque}</em>
              {t.perguntaDepois}
            </h1>
            <p className="entrada__tagline rise" style={{ animationDelay: "0.26s" }}>
              {t.apoio}
            </p>
            {t.avisoIdioma ? <p className="entrada__aviso-idioma">{t.avisoIdioma}</p> : null}

            <div className="entrada__perfis rise" style={{ animationDelay: "0.34s" }}>
              <button
                className="entrada__perfil"
                type="button"
                onClick={() => escolherPerfil("empresa")}
              >
                <Building2 size={22} aria-hidden="true" />
                <span className="entrada__perfil-titulo">{t.perfis.empresa.rotulo}</span>
                <span className="entrada__perfil-texto">{t.perfis.empresa.descricao}</span>
                <span className="entrada__perfil-cta">
                  {t.continuar} <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>

              <button
                className="entrada__perfil"
                type="button"
                onClick={() => escolherPerfil("superadmin")}
              >
                <Shield size={22} aria-hidden="true" />
                <span className="entrada__perfil-titulo">{t.perfis.superadmin.rotulo}</span>
                <span className="entrada__perfil-texto">{t.perfis.superadmin.descricao}</span>
                <span className="entrada__perfil-cta">
                  {t.continuar} <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>
            </div>

            <button
              className="botao botao--fantasma rise"
              type="button"
              style={{ width: "100%", marginTop: 16, animationDelay: "0.42s" }}
              onClick={() => navegar(IDIOMAS[idioma].inicio)}
            >
              <ArrowLeft size={16} aria-hidden="true" /> {t.voltar}
            </button>
            <p className="entrada__tagline" style={{ marginTop: 18 }}>
              <strong>{t.semContaTitulo}</strong> {t.semContaTexto}
            </p>
            <a
              className="botao botao--fantasma"
              style={{ width: "100%", marginTop: 8 }}
              href={`mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(t.assunto)}`}
            >
              <Mail size={15} aria-hidden="true" /> {t.solicitar}
            </a>
          </>
        ) : etapa === "primeiro" ? (
          <div className="entrada__form rise">
            <div className="entrada__form-card">
              <p className="entrada__form-perfil">
                <KeyRound size={13} aria-hidden="true" /> {perfilAtual?.rotulo}
              </p>
              <h1>{tc.entrada.primeiroTitulo}</h1>
              <p className="entrada__form-apoio">{tc.entrada.primeiroTexto}</p>
              <form onSubmit={aoCriarSenha} noValidate>
                {pedirAtual ? (
                  <CampoSenha id="senha-temp" rotulo={tc.config.seguranca.atual} valor={senha} aoMudar={setSenha} textos={tc.senha} />
                ) : null}
                <CampoSenha
                  id="senha-nova"
                  rotulo={tc.entrada.nova}
                  valor={senhaNova}
                  aoMudar={setSenhaNova}
                  textos={tc.senha}
                  autoComplete="new-password"
                  mostrarForca
                />
                <CampoSenha
                  id="senha-confirma"
                  rotulo={tc.entrada.confirmar}
                  valor={senhaConfirma}
                  aoMudar={setSenhaConfirma}
                  textos={tc.senha}
                  autoComplete="new-password"
                />
                <p className="erro" role="alert">
                  {erro}
                </p>
                <button className="botao" type="submit" style={{ width: "100%" }} disabled={enviando || !senhaNova}>
                  {enviando ? tc.entrada.salvando : tc.entrada.salvarEntrar} <ArrowRight size={17} aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="entrada__form rise">
            <div className="entrada__form-card">
              <p className="entrada__form-perfil">{perfilAtual?.rotulo}</p>
              <h1>{perfilAtual?.titulo}</h1>
              <p className="entrada__form-apoio">{perfilAtual?.descricao}</p>
              <form onSubmit={aoEntrar} noValidate>
                <div className="campo">
                  <label htmlFor="email">{t.email}</label>
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
                <CampoSenha id="senha" rotulo={t.senha} valor={senha} aoMudar={setSenha} textos={tc.senha} />
                {perfil !== "superadmin" ? (
                  <div className="entrada__opcoes">
                    <label className="entrada__lembrar">
                      <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
                      <span>{tc.entrada.lembrar}</span>
                    </label>
                    <button type="button" className="link-acao entrada__esqueci" onClick={() => setEsqueciAberto(true)}>
                      {tc.entrada.esqueci}
                    </button>
                  </div>
                ) : null}
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
                      <span className="spinner" aria-hidden="true" /> {t.entrando}
                    </>
                  ) : (
                    <>
                      {t.entrar} <ArrowRight size={17} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <p className="entrada__privacidade">
                <Lock size={12} aria-hidden="true" /> {t.privacidade}
              </p>
              <p className="entrada__legal">
                {t.aceiteLegal}{" "}
                <Link to={IDIOMAS[idioma]?.termos || "/termos"}>{t.termos}</Link> {t.e}{" "}
                <Link to={IDIOMAS[idioma]?.privacidade || "/privacidade"}>{t.politica}</Link>.
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
              <ArrowLeft size={16} aria-hidden="true" /> {t.trocar}
            </button>

            <button
              className="botao botao--fantasma"
              type="button"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => navegar(IDIOMAS[idioma].inicio)}
            >
              <ArrowLeft size={16} aria-hidden="true" /> {t.voltar}
            </button>
          </div>
        )}

        <Dialogo
          aberto={esqueciAberto}
          titulo={tc.entrada.esqueciTitulo}
          aoFechar={() => setEsqueciAberto(false)}
          rotuloFechar={tc.entrada.entendi}
          acoes={
            <>
              <a className="botao botao--fantasma" href={`mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(tc.entrada.esqueciTitulo)}`}>
                <Mail size={15} aria-hidden="true" /> {tc.entrada.falarEquipe}
              </a>
              <button className="botao" type="button" onClick={() => setEsqueciAberto(false)}>
                {tc.entrada.entendi}
              </button>
            </>
          }
        >
          <ol className="entrada__esqueci-passos">
            {tc.entrada.esqueciTexto.map((linha) => (
              <li key={linha}>{linha}</li>
            ))}
          </ol>
        </Dialogo>

        {import.meta.env.DEV ? (
          <p className="credenciais rise" style={{ animationDelay: "0.48s" }}>
            Ambiente local · conta de teste: gestor@demo.psyra.ai
          </p>
        ) : null}
      </div>
    </main>
  );
}
