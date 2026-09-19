// Psyra AI — página do painel. Sprint: S6.
// Shell de app com sidebar. `fetchPainel` real: chama a API, adapta e distribui.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  ShieldCheck,
  ClipboardList,
  Banknote,
  LogOut,
  Lock,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Save,
} from "lucide-react";

import {
  Conformidade,
  Grupos,
  PlanoAcao,
  CapitalRisco,
  Revelador,
  Selo,
  VisaoGeral,
  PainelSkeleton,
} from "../componentes/TelasPainel";
import { useAuth } from "../contexto/Auth";
import { adaptarPainel } from "../lib/adaptadores";
import { api, ErroApi } from "../lib/api";
import { planoPermiteCapital } from "../lib/planos";
import MarcaLogo from "../componentes/MarcaLogo";

const SECOES = [
  { id: "visao", rotulo: "Visão geral", icone: LayoutDashboard },
  { id: "grupos", rotulo: "Riscos por grupo", icone: Users },
  { id: "revelador", rotulo: "O Revelador", icone: Sparkles },
  { id: "capital", rotulo: "Capital em risco", icone: Banknote },
  { id: "conformidade", rotulo: "Conformidade NR-1", icone: ShieldCheck },
  { id: "plano", rotulo: "Plano de ação", icone: ClipboardList },
];

export default function Painel() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();

  const [coletas, setColetas] = useState([]);
  const [coletaId, setColetaId] = useState(null);
  const [painel, setPainel] = useState(null);
  const [secao, setSecao] = useState("visao");
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [configForms, setConfigForms] = useState(null);
  const [urlForms, setUrlForms] = useState("");
  const [salvandoForms, setSalvandoForms] = useState(false);
  const [criandoColeta, setCriandoColeta] = useState(false);
  const [capital, setCapital] = useState(null);
  const [capitalCarregando, setCapitalCarregando] = useState(false);
  const [capitalErro, setCapitalErro] = useState("");
  const capitalLiberado = planoPermiteCapital(usuario?.plano);

  const aoSair = useCallback(() => {
    sair();
    navegar("/", { replace: true });
  }, [sair, navegar]);

  useEffect(() => {
    api
      .listarColetas(usuario.empresa_id)
      .then((lista) => {
        setColetas(lista);
        if (lista.length) {
          const comRespostas = lista.find((coleta) => coleta.total_respostas > 0);
          setColetaId((comRespostas ?? lista[0]).id);
        }
      })
      .catch((falha) => setErro(falha.message));
  }, [usuario.empresa_id]);

  useEffect(() => {
    if (!coletaId) return;
    let ativo = true;
    setPainel(null);
    setConfigForms(null);
    setCopiado(false);
    Promise.all([
      api.painel(usuario.empresa_id, coletaId),
      api.googleForm(usuario.empresa_id, coletaId),
    ])
      .then(([payload, forms]) => {
        if (!ativo) return;
        setPainel(adaptarPainel(payload));
        setConfigForms(forms);
        setUrlForms(forms.google_form_url ?? "");
      })
      .catch((falha) => ativo && setErro(falha.message));
    return () => {
      ativo = false;
    };
  }, [usuario.empresa_id, coletaId]);

  useEffect(() => {
    if (!coletaId || secao !== "capital") return;
    if (!capitalLiberado) {
      setCapital(null);
      setCapitalErro("");
      setCapitalCarregando(false);
      return;
    }
    let ativo = true;
    setCapitalCarregando(true);
    setCapitalErro("");
    api
      .capitalRisco(usuario.empresa_id, coletaId)
      .then((dados) => {
        if (ativo) setCapital(dados);
      })
      .catch((falha) => {
        if (!ativo) return;
        if (falha instanceof ErroApi && falha.codigo === "plano_insuficiente") {
          setCapital(null);
          return;
        }
        setCapitalErro(falha.message);
      })
      .finally(() => ativo && setCapitalCarregando(false));
    return () => {
      ativo = false;
    };
  }, [usuario.empresa_id, coletaId, secao, capitalLiberado]);

  const coletaAtual = coletas.find((coleta) => coleta.id === coletaId);
  const urlQuestionario =
    configForms?.ativo && configForms.google_form_url ? configForms.google_form_url : "";
  const webhookUrl = configForms
    ? `${window.location.origin}${configForms.webhook_path}`
    : "";

  const criarColetaForms = useCallback(async () => {
    setErro("");
    setCriandoColeta(true);
    try {
      const hoje = new Intl.DateTimeFormat("pt-BR").format(new Date());
      const nova = await api.criarColeta(usuario.empresa_id, {
        titulo: `Google Forms — ${hoje}`,
        origem_dados: "teste",
        instrumento: "psyra_form_v1",
      });
      setColetas((atuais) => [nova, ...atuais]);
      setColetaId(nova.id);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCriandoColeta(false);
    }
  }, [usuario.empresa_id]);

  const salvarGoogleForm = useCallback(
    async (evento) => {
      evento.preventDefault();
      setErro("");
      setSalvandoForms(true);
      try {
        const configurada = await api.configurarGoogleForm(
          usuario.empresa_id,
          coletaId,
          { url: urlForms.trim(), ativo: true }
        );
        setConfigForms(configurada);
        setUrlForms(configurada.google_form_url ?? "");
      } catch (falha) {
        setErro(falha.message);
      } finally {
        setSalvandoForms(false);
      }
    },
    [usuario.empresa_id, coletaId, urlForms]
  );

  const copiarLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(urlQuestionario);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar o link. Selecione o texto e copie manualmente.");
    }
  }, [urlQuestionario]);

  const conteudo = () => {
    if (!coletaId) {
      return (
        <div className="superficie">
          <h2 className="secao-titulo">Nenhum ciclo de coleta ainda</h2>
          <p className="aviso secao-lead">
            Crie um ciclo Google Forms para começar a ver riscos, revelador e
            capital em risco neste painel.
          </p>
          <button
            className="botao"
            type="button"
            onClick={criarColetaForms}
            disabled={criandoColeta}
          >
            <Plus size={15} aria-hidden="true" />
            {criandoColeta ? "Criando…" : "Criar ciclo Google Forms"}
          </button>
        </div>
      );
    }
    if (secao === "capital") {
      return (
        <CapitalRisco
          bloqueado={!capitalLiberado}
          dados={capital}
          carregando={capitalCarregando}
          erro={capitalErro}
        />
      );
    }
    if (!painel) return <PainelSkeleton />;
    switch (secao) {
      case "grupos":
        return <Grupos grupos={painel.grupos} />;
      case "revelador":
        return <Revelador itens={painel.revelador} />;
      case "conformidade":
        return <Conformidade conformidade={painel.conformidade} />;
      case "plano":
        return <PlanoAcao acoes={painel.planoAcao} />;
      default:
        return <VisaoGeral resumo={painel.resumo} grupos={painel.grupos} />;
    }
  };

  const secaoAtual = SECOES.find((s) => s.id === secao);

  return (
    <div className="app">
      {/* -------- SIDEBAR -------- */}
      <aside className="sidebar">
        <div className="sidebar__marca">
          <MarcaLogo className="marca__logo" size={36} />
          <div>
            <div className="marca__nome">Psyra AI</div>
            <div className="sidebar__sub">Risco psicossocial</div>
          </div>
        </div>

        <p className="sidebar__sep">Painel</p>
        <nav className="sidebar__nav" aria-label="Seções do painel">
          {SECOES.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              type="button"
              className={`nav-item${secao === id ? " nav-item--ativo" : ""}`}
              aria-current={secao === id ? "page" : undefined}
              onClick={() => setSecao(id)}
            >
              <Icone size={18} aria-hidden="true" />
              <span>{rotulo}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__rodape">
          <div className="sidebar__privacidade">
            <Lock size={14} aria-hidden="true" />
            <span>Resultados sempre por grupo (n ≥ 5). A Psyra não gera diagnósticos individuais.</span>
          </div>
        </div>
      </aside>

      {/* -------- CONTEÚDO -------- */}
      <div className="conteudo">
        <header className="topbar">
          <div>
            <div className="topbar__titulo">{secaoAtual?.rotulo}</div>
            <div className="topbar__sub">{usuario.empresa_nome}</div>
          </div>
          <div className="topbar__dir">
            <div className="topbar__usuario">
              <b>{usuario.nome}</b>
              <span>Gestor de conta</span>
            </div>
            <button className="botao botao--fantasma botao--pequeno" type="button" onClick={aoSair}>
              <LogOut size={15} aria-hidden="true" /> Sair
            </button>
          </div>
        </header>

        <main className="conteudo__corpo">
          {erro && (
            <p className="erro" role="alert" style={{ marginBottom: 16 }}>
              {erro}
            </p>
          )}

          {painel && <Selo selo={painel.selo} />}

          <div className="pagina-cabecalho">
            <div className="pagina-cabecalho__linha">
              <div>
                <p className="pagina-cabecalho__eyebrow">Painel de risco · NR-1</p>
                <h1>
                  {painel
                    ? painel.coleta.titulo
                    : coletaId
                      ? "Carregando ciclo…"
                      : "Sem ciclo de coleta"}
                </h1>
                {painel && (
                  <p className="pagina-cabecalho__aviso">
                    Ciclo {painel.coleta.status} · origem dos dados: {painel.coleta.origemDados}
                  </p>
                )}
                {!coletaId && !erro && (
                  <p className="pagina-cabecalho__aviso">
                    Esta empresa ainda não tem coleta. Use o botão abaixo para criar.
                  </p>
                )}
              </div>

              <div className="campo campo--topbar pagina-cabecalho__campo">
                <label htmlFor="seletor-coleta">Ciclo de coleta</label>
                <select
                  id="seletor-coleta"
                  value={coletaId ?? ""}
                  onChange={(evento) => setColetaId(evento.target.value)}
                  disabled={!coletas.length}
                >
                  {!coletas.length ? (
                    <option value="">Nenhum ciclo</option>
                  ) : (
                    coletas.map((coleta) => (
                      <option value={coleta.id} key={coleta.id}>
                        {coleta.titulo} — {coleta.total_respostas} respostas
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {coletaAtual && (
            <aside className="superficie link-coleta" aria-label="Integração Google Forms">
              <div className="link-coleta__cabecalho">
                <h2 className="secao-titulo">
                  <Link2 size={18} aria-hidden="true" />
                  Integração Google Forms
                </h2>
                <p className="secao-lead">
                  Cada coleta usa uma cópia exclusiva do formulário da conta{" "}
                  <strong>{usuario.empresa_nome}</strong>. A empresa é determinada pelo
                  vínculo autenticado, nunca por uma resposta do colaborador.
                </p>
              </div>

              {coletaAtual.instrumento !== "psyra_form_v1" ? (
                <div className="integracao-vazia">
                  <p className="aviso">
                    Este ciclo usa outro instrumento. Crie um ciclo próprio antes de
                    vincular uma cópia do Formulário Psyra.
                  </p>
                  <button
                    className="botao botao--pequeno"
                    type="button"
                    onClick={criarColetaForms}
                    disabled={criandoColeta}
                  >
                    <Plus size={15} aria-hidden="true" />
                    {criandoColeta ? "Criando…" : "Criar ciclo Google Forms"}
                  </button>
                </div>
              ) : (
                <>
                  <form className="integracao-form" onSubmit={salvarGoogleForm}>
                    <div className="campo">
                      <label htmlFor="url-google-form">URL pública da cópia do formulário</label>
                      <input
                        id="url-google-form"
                        type="url"
                        value={urlForms}
                        onChange={(evento) => setUrlForms(evento.target.value)}
                        placeholder="https://docs.google.com/forms/d/e/.../viewform"
                        required
                      />
                    </div>
                    <button
                      className="botao botao--pequeno"
                      type="submit"
                      disabled={salvandoForms}
                    >
                      <Save size={15} aria-hidden="true" />
                      {salvandoForms ? "Salvando…" : "Vincular formulário"}
                    </button>
                  </form>

                  {urlQuestionario && (
                    <div className="link-coleta__linha">
                      <code className="link-coleta__url" title={urlQuestionario}>
                        {urlQuestionario}
                      </code>
                      <div className="link-coleta__acoes">
                        <button
                          className="botao botao--fantasma botao--pequeno"
                          type="button"
                          onClick={copiarLink}
                        >
                          {copiado ? (
                            <>
                              <Check size={15} aria-hidden="true" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy size={15} aria-hidden="true" /> Copiar
                            </>
                          )}
                        </button>
                        <a
                          className="botao botao--fantasma botao--pequeno"
                          href={urlQuestionario}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={15} aria-hidden="true" /> Abrir
                        </a>
                      </div>
                    </div>
                  )}

                  {configForms?.google_form_id && (
                    <div className="integracao-credenciais">
                      <p>
                        Use estes valores nas propriedades do Apps Script desta cópia:
                      </p>
                      <label>
                        WEBHOOK_URL
                        <code>{webhookUrl}</code>
                      </label>
                      <label>
                        WEBHOOK_SECRET
                        <code>{configForms.webhook_secret}</code>
                      </label>
                      <p className="aviso">
                        O webhook precisa usar um domínio HTTPS público; localhost não é
                        acessível pelos servidores do Google.
                      </p>
                    </div>
                  )}
                </>
              )}
            </aside>
          )}

          <section aria-live="polite">{conteudo()}</section>
        </main>
      </div>
    </div>
  );
}
