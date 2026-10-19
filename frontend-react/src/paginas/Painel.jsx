// Psyra AI — painel do RH. Sprint: S10 | Risco: R2.
// Shell com barra lateral, tema claro/escuro, idioma (pt/en/zh) e questionário próprio
// (o link anônimo do ciclo substitui o Google Forms). Resultados sempre por grupo (n ≥ 5).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  ShieldCheck,
  ClipboardList,
  Banknote,
  Lock,
  Link2,
  Plus,
  Printer,
  Menu,
  X,
  CalendarDays,
  Gauge,
  BookOpenCheck,
  Settings,
} from "lucide-react";

import { Conformidade, Grupos, PlanoAcao, CapitalRisco, Revelador, VisaoGeral, PainelSkeleton } from "../componentes/TelasPainel";
import PainelQuestionario from "../componentes/PainelQuestionario";
import QualidadeColeta from "../componentes/QualidadeColeta";
import Metodologia from "../componentes/Metodologia";
import Configuracoes from "../componentes/Configuracoes";
import MenuUsuario from "../componentes/MenuUsuario";
import Dialogo from "../componentes/Dialogo";
import AlternarTema from "../componentes/AlternarTema";
import SeletorIdioma from "../componentes/SeletorIdioma";
import MarcaLogo from "../componentes/MarcaLogo";
import { useAuth } from "../contexto/Auth";
import { adaptarPainel } from "../lib/adaptadores";
import { api, ErroApi } from "../lib/api";
import { planoPermiteCapital } from "../lib/planos";
import { useIdiomaApp } from "../lib/idiomaApp";
import { TEXTOS_APP, formatarData, mesAno } from "../lib/textosApp";
import { TEXTOS_CONTA } from "../lib/textosConta";

const SECOES = [
  { id: "visao", icone: LayoutDashboard, grupo: "painel" },
  { id: "grupos", icone: Users, grupo: "painel" },
  { id: "revelador", icone: Sparkles, grupo: "painel" },
  { id: "capital", icone: Banknote, grupo: "painel" },
  { id: "conformidade", icone: ShieldCheck, grupo: "painel" },
  { id: "plano", icone: ClipboardList, grupo: "painel" },
  { id: "questionario", icone: Link2, grupo: "coleta" },
  { id: "qualidade", icone: Gauge, grupo: "coleta" },
  { id: "metodologia", icone: BookOpenCheck, grupo: "conta" },
  { id: "configuracoes", icone: Settings, grupo: "conta" },
];
const SECOES_DA_CONTA = new Set(["metodologia", "configuracoes"]);

export default function Painel() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const [idioma, setIdioma] = useIdiomaApp();
  const t = TEXTOS_APP[idioma];
  const tc = TEXTOS_CONTA[idioma];

  const [coletas, setColetas] = useState([]);
  const [coletaId, setColetaId] = useState(null);
  const [ghes, setGhes] = useState([]);
  const [painel, setPainel] = useState(null);
  const [secao, setSecao] = useState("visao");
  const [destaque, setDestaque] = useState(null);
  const [erro, setErro] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);
  const [tituloNovo, setTituloNovo] = useState("");
  const [criandoColeta, setCriandoColeta] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [capital, setCapital] = useState(null);
  const [capitalCarregando, setCapitalCarregando] = useState(false);
  const [capitalErro, setCapitalErro] = useState("");
  const capitalLiberado = planoPermiteCapital(usuario?.plano);
  const [qualidade, setQualidade] = useState(null);
  const [qualidadeErro, setQualidadeErro] = useState("");
  const [versaoPolitica, setVersaoPolitica] = useState(0);

  useEffect(() => {
    document.title = `${t.secoes[secao]} — Psyra AI`;
  }, [t, secao]);

  const aoSair = useCallback(() => {
    sair();
    navegar("/", { replace: true });
  }, [sair, navegar]);

  useEffect(() => {
    setCarregandoLista(true);
    Promise.all([api.listarColetas(usuario.empresa_id), api.listarGhes(usuario.empresa_id).catch(() => [])])
      .then(([lista, grupos]) => {
        setColetas(lista);
        setGhes(grupos);
        if (lista.length) {
          // abre o ciclo com mais respostas (o mais informativo); empate fica com o mais recente
          const principal = lista.reduce((melhor, c) => (c.total_respostas > melhor.total_respostas ? c : melhor), lista[0]);
          setColetaId(principal.id);
        }
      })
      .catch((falha) => setErro(falha.message))
      .finally(() => setCarregandoLista(false));
  }, [usuario.empresa_id]);

  const carregarPainel = useCallback(() => {
    if (!coletaId) return () => {};
    let ativo = true;
    setPainel(null);
    api
      .painel(usuario.empresa_id, coletaId)
      .then((payload) => ativo && setPainel(adaptarPainel(payload)))
      .catch((falha) => ativo && setErro(falha.message));
    return () => {
      ativo = false;
    };
  }, [usuario.empresa_id, coletaId]);

  useEffect(() => carregarPainel(), [carregarPainel]);

  useEffect(() => {
    if (!coletaId || secao !== "capital") return;
    if (!capitalLiberado) {
      setCapital(null);
      return;
    }
    let ativo = true;
    setCapitalCarregando(true);
    setCapitalErro("");
    api
      .capitalRisco(usuario.empresa_id, coletaId)
      .then((dados) => ativo && setCapital(dados))
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

  useEffect(() => {
    if (!coletaId || secao !== "qualidade") return undefined;
    let ativo = true;
    setQualidade(null);
    setQualidadeErro("");
    api
      .qualidade(usuario.empresa_id, coletaId)
      .then((dados) => ativo && setQualidade(dados))
      .catch((falha) => ativo && setQualidadeErro(falha.message));
    return () => {
      ativo = false;
    };
  }, [usuario.empresa_id, coletaId, secao, versaoPolitica]);

  const aoMudarPolitica = useCallback(() => {
    setVersaoPolitica((v) => v + 1);
    carregarPainel();
  }, [carregarPainel]);

  const coletaAtual = coletas.find((coleta) => coleta.id === coletaId);
  const planoPorGrupo = useMemo(() => new Set((painel?.planoAcao ?? []).map((a) => a.grupo)), [painel]);

  const abrirNovo = useCallback(() => {
    setTituloNovo(t.tituloPadrao(mesAno(idioma)));
    setNovoAberto(true);
  }, [t, idioma]);

  const criarColeta = useCallback(
    async (evento) => {
      evento?.preventDefault();
      setErro("");
      setCriandoColeta(true);
      try {
        const nova = await api.criarColeta(usuario.empresa_id, {
          titulo: tituloNovo.trim() || t.tituloPadrao(mesAno(idioma)),
          origem_dados: "teste",
          instrumento: "psyra_form_v1",
        });
        setColetas((atuais) => [{ ...nova, total_respostas: 0 }, ...atuais]);
        setColetaId(nova.id);
        setSecao("questionario");
        setNovoAberto(false);
      } catch (falha) {
        setErro(falha.message);
      } finally {
        setCriandoColeta(false);
      }
    },
    [usuario.empresa_id, tituloNovo, t, idioma]
  );

  const encerrarColeta = useCallback(async () => {
    if (!coletaAtual) return;
    setEncerrando(true);
    try {
      const atualizada = await api.encerrarColeta(usuario.empresa_id, coletaAtual.id);
      setColetas((lista) => lista.map((c) => (c.id === atualizada.id ? { ...c, ...atualizada } : c)));
      carregarPainel();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEncerrando(false);
    }
  }, [usuario.empresa_id, coletaAtual, carregarPainel]);

  const irPara = useCallback((id) => {
    setSecao(id);
    setMenuAberto(false);
    if (id !== "grupos") setDestaque(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const conteudo = () => {
    if (secao === "configuracoes") {
      return <Configuracoes tc={tc} idioma={idioma} aoTrocarIdioma={setIdioma} aoMudarPolitica={aoMudarPolitica} />;
    }
    if (secao === "metodologia") {
      return <Metodologia tm={tc.metodo} motor={painel?.selo?.motor ?? "regra-v0.1"} />;
    }
    if (carregandoLista) return <PainelSkeleton />;
    if (!coletaId) {
      return (
        <div className="superficie estado-inicial">
          <div className="estado-inicial__icone">
            <Link2 size={26} aria-hidden="true" />
          </div>
          <h2 className="secao-titulo">{t.vazioTitulo}</h2>
          <p className="aviso secao-lead">{t.vazioTexto}</p>
          <button className="botao" type="button" onClick={abrirNovo}>
            <Plus size={15} aria-hidden="true" /> {t.criar}
          </button>
        </div>
      );
    }
    if (secao === "questionario") {
      return (
        <PainelQuestionario
          t={t}
          coleta={coletaAtual}
          ghes={ghes}
          grupos={painel?.grupos}
          aoEncerrar={encerrarColeta}
          encerrando={encerrando}
        />
      );
    }
    if (secao === "qualidade") {
      return <QualidadeColeta dados={qualidade} carregando={!qualidade && !qualidadeErro} erro={qualidadeErro} tq={tc.qualidade} locale={t.locale} />;
    }
    if (secao === "capital") {
      return <CapitalRisco t={t} idioma={idioma} bloqueado={!capitalLiberado} dados={capital} carregando={capitalCarregando} erro={capitalErro} />;
    }
    if (!painel) return <PainelSkeleton />;
    switch (secao) {
      case "grupos":
        return (
          <Grupos
            grupos={painel.grupos}
            t={t}
            idioma={idioma}
            destaque={destaque}
            planoPorGrupo={planoPorGrupo}
            aoVerPlano={() => irPara("plano")}
          />
        );
      case "revelador":
        return <Revelador itens={painel.revelador} t={t} />;
      case "conformidade":
        return <Conformidade conformidade={painel.conformidade} t={t} />;
      case "plano":
        return <PlanoAcao acoes={painel.planoAcao} t={t} idioma={idioma} mostrarValor={capitalLiberado} />;
      default:
        return (
          <VisaoGeral
            resumo={painel.resumo}
            grupos={painel.grupos}
            t={t}
            aoAbrirGrupo={(codigo) => {
              setDestaque(codigo);
              irPara("grupos");
            }}
          />
        );
    }
  };

  const navegacao = (grupo) =>
    SECOES.filter((s) => s.grupo === grupo).map(({ id, icone: Icone }) => (
      <button
        key={id}
        type="button"
        className={`nav-item${secao === id ? " nav-item--ativo" : ""}`}
        aria-current={secao === id ? "page" : undefined}
        onClick={() => irPara(id)}
      >
        <Icone size={18} aria-hidden="true" />
        <span>{t.secoes[id]}</span>
        {id === "questionario" && coletaAtual ? (
          <span className={`nav-item__selo nav-item__selo--${coletaAtual.status}`}>{coletaAtual.total_respostas}</span>
        ) : null}
      </button>
    ));

  return (
    <div className={`app${menuAberto ? " app--menu" : ""}`}>
      <aside className="sidebar" aria-label="Psyra AI">
        <div className="sidebar__marca">
          <MarcaLogo className="marca__logo" size={44} />
          <div>
            <div className="marca__nome">Psyra AI</div>
            <div className="sidebar__sub">{t.marcaSub}</div>
          </div>
          <button type="button" className="sidebar__fechar" onClick={() => setMenuAberto(false)} aria-label={t.fecharMenu}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="sidebar__sep">{t.sepPainel}</p>
        <nav className="sidebar__nav" aria-label={t.sepPainel}>
          {navegacao("painel")}
        </nav>
        <p className="sidebar__sep">{t.sepColeta}</p>
        <nav className="sidebar__nav" aria-label={t.sepColeta}>
          {navegacao("coleta")}
        </nav>
        <p className="sidebar__sep">{t.sepConta}</p>
        <nav className="sidebar__nav" aria-label={t.sepConta}>
          {navegacao("conta")}
        </nav>

        <div className="sidebar__rodape">
          <div className="sidebar__privacidade">
            <Lock size={14} aria-hidden="true" />
            <span>{t.privacidadeLateral}</span>
          </div>
        </div>
      </aside>
      <button type="button" className="app__veu" aria-hidden="true" tabIndex={-1} onClick={() => setMenuAberto(false)} />

      <div className="conteudo">
        <header className="topbar">
          <div className="topbar__esq">
            <button type="button" className="topbar__menu" onClick={() => setMenuAberto(true)} aria-label={t.menu}>
              <Menu size={20} aria-hidden="true" />
            </button>
            <div>
              <div className="topbar__titulo">{t.secoes[secao]}</div>
              <div className="topbar__sub">{usuario.empresa_nome}</div>
            </div>
          </div>
          <div className="topbar__dir">
            <SeletorIdioma atual={idioma} rotulo={t.idioma} aoTrocar={setIdioma} className="topbar__idioma" />
            <AlternarTema rotuloClaro={t.temaClaro} rotuloEscuro={t.temaEscuro} />
            <MenuUsuario usuario={usuario} textos={tc.menu} aoIr={irPara} aoSair={aoSair} />
          </div>
        </header>

        <main className="conteudo__corpo">
          {erro ? (
            <p className="erro" role="alert">
              {erro}
            </p>
          ) : null}

          <div className="pagina-cabecalho" hidden={SECOES_DA_CONTA.has(secao)}>
            <div className="pagina-cabecalho__linha">
              <div>
                <p className="pagina-cabecalho__eyebrow">{t.eyebrow}</p>
                <h1>{painel ? painel.coleta.titulo : coletaId ? coletaAtual?.titulo ?? t.carregandoCiclo : t.semCiclo}</h1>
                {coletaAtual ? (
                  <div className="ciclo-meta">
                    <span className={`ciclo-meta__status ciclo-meta__status--${coletaAtual.status}`}>
                      <i aria-hidden="true" /> {t.statusColeta[coletaAtual.status] ?? coletaAtual.status}
                    </span>
                    <span className="ciclo-meta__chip">{t.respostas(coletaAtual.total_respostas)}</span>
                    {coletaAtual.aberta_em ? (
                      <span className="ciclo-meta__chip">
                        <CalendarDays size={13} aria-hidden="true" /> {t.abertaEm(formatarData(coletaAtual.aberta_em, idioma))}
                      </span>
                    ) : null}
                    {t.origem[coletaAtual.origem_dados] ? <span className="ciclo-meta__chip">{t.origem[coletaAtual.origem_dados]}</span> : null}
                  </div>
                ) : !carregandoLista && !erro ? (
                  <p className="pagina-cabecalho__aviso">{t.semCicloAviso}</p>
                ) : null}
              </div>

              <div className="pagina-cabecalho__acoes">
                <div className="campo campo--topbar pagina-cabecalho__campo">
                  <label htmlFor="seletor-coleta">{t.seletorCiclo}</label>
                  <select
                    id="seletor-coleta"
                    value={coletaId ?? ""}
                    onChange={(evento) => setColetaId(evento.target.value)}
                    disabled={!coletas.length}
                  >
                    {!coletas.length ? (
                      <option value="">{t.nenhumCiclo}</option>
                    ) : (
                      coletas.map((coleta) => (
                        <option value={coleta.id} key={coleta.id}>
                          {coleta.titulo} — {t.respostas(coleta.total_respostas)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="pagina-cabecalho__botoes">
                  <button className="botao botao--pequeno" type="button" onClick={abrirNovo}>
                    <Plus size={15} aria-hidden="true" /> {t.novoCiclo}
                  </button>
                  <button className="botao botao--fantasma botao--pequeno" type="button" onClick={() => window.print()} disabled={!painel}>
                    <Printer size={15} aria-hidden="true" /> {t.exportar}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <section aria-live="polite" key={`${secao}-${idioma}`} className="secao-entrada">
            {conteudo()}
          </section>
        </main>
      </div>

      <Dialogo
        aberto={novoAberto}
        titulo={t.dialogoTitulo}
        aoFechar={() => setNovoAberto(false)}
        rotuloFechar={t.fechar}
        acoes={
          <>
            <button className="botao botao--fantasma" type="button" onClick={() => setNovoAberto(false)}>
              {t.cancelar}
            </button>
            <button className="botao" type="submit" form="form-novo-ciclo" disabled={criandoColeta}>
              <Plus size={15} aria-hidden="true" /> {criandoColeta ? t.criando : t.criar}
            </button>
          </>
        }
      >
        <form id="form-novo-ciclo" onSubmit={criarColeta}>
          <p className="aviso" style={{ marginTop: 0 }}>
            {t.dialogoTexto}
          </p>
          <div className="campo">
            <label htmlFor="titulo-ciclo">{t.dialogoCampo}</label>
            <input id="titulo-ciclo" value={tituloNovo} maxLength={120} onChange={(e) => setTituloNovo(e.target.value)} />
          </div>
          <p className="aviso" style={{ marginBottom: 0 }}>
            {t.q.instrumento}
          </p>
        </form>
      </Dialogo>
    </div>
  );
}
