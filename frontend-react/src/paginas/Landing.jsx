// Landing comercial Psyra AI em pt-BR (/), inglês (/en) e chinês simplificado (/zh).
// Sprint: S10 | Risco: R2 — nenhum dado individual; gráficos fictícios levam o selo de ilustrativos.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  EyeOff,
  FileCheck2,
  FileText,
  Fingerprint,
  History,
  ListOrdered,
  Lock,
  MessageSquareText,
  Moon,
  Scale,
  ShieldCheck,
  Sun,
  UserX,
  Users,
} from "lucide-react";

import { PLANOS } from "../lib/planos";
import MarcaLogo from "../componentes/MarcaLogo";
import SeletorIdioma from "../componentes/SeletorIdioma";
import { BarrasHero, GraficoCusto, GraficoFatores, GraficoRevelador, GraficoRiscos } from "../componentes/GraficosLanding";
import {
  EMAIL_CONTATO,
  IDIOMAS,
  aplicarIdiomaNoDocumento,
  formatarReais,
  idiomaDoNavegador,
  idiomaSalvo,
  salvarIdioma,
} from "../lib/idiomas";
import { TEXTOS } from "../lib/textosLanding";
import { useTema } from "../lib/tema";

const ICONES_PASSOS = [MessageSquareText, ShieldCheck, Users, ClipboardCheck];
const ICONES_ENTREGAS = [FileText, Scale, ListOrdered, FileCheck2];
const ICONES_CONFIANCA = [Users, EyeOff, UserX, Lock, Fingerprint, History];
const SECOES_MENU = ["solucao", "como-funciona", "painel", "planos", "duvidas"];

function Logo({ className = "lp-logo" }) {
  return <MarcaLogo className={className} size={42} />;
}

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return undefined;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      setVisible(true);
      return undefined;
    }
    setVisible(false);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`lp-reveal ${className}`} data-visible={visible ? "true" : "false"} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function Cabecalho({ rotulo, titulo, intro, id }) {
  return (
    <>
      <p className="lp-eyebrow">{rotulo}</p>
      <h2 id={id}>{titulo}</h2>
      {intro ? <p className="lp-section__intro">{intro}</p> : null}
    </>
  );
}

function useIdiomaDaPagina(idioma, titulo, descricao) {
  useEffect(() => {
    aplicarIdiomaNoDocumento(idioma, titulo, descricao);
  }, [idioma, titulo, descricao]);
}

/**
 * Estado da rolagem: sombra no cabeçalho depois do topo, barra de progresso de leitura
 * e seção visível (para destacar o item do menu). Um quadro por evento (requestAnimationFrame).
 */
function usarRolagem(ids) {
  const [rolou, setRolou] = useState(false);
  const [ativa, setAtiva] = useState(null);
  const barra = useRef(null);
  const chave = ids.join(",");

  useEffect(() => {
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const y = window.scrollY;
      setRolou(y > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barra.current) barra.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    const aoRolar = () => {
      if (!quadro) quadro = window.requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
      if (quadro) window.cancelAnimationFrame(quadro);
    };
  }, []);

  useEffect(() => {
    const secoes = chave
      .split(",")
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!secoes.length || !("IntersectionObserver" in window)) return undefined;
    const io = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) setAtiva(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    secoes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [chave]);

  return { rolou, ativa, barra };
}

/** Alterna entre modo claro e escuro; a escolha vale também para o painel. */
function BotaoTema({ t }) {
  const { tema, alternar } = useTema();
  const claro = tema === "claro";
  const rotulo = claro ? t.tema.escuro : t.tema.claro;
  const Icone = claro ? Moon : Sun;
  return (
    <button type="button" className="lp-tema" onClick={alternar} aria-label={rotulo} title={rotulo}>
      <Icone key={tema} size={17} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

function Header({ t, idioma, destino }) {
  const { rolou, ativa, barra } = usarRolagem(SECOES_MENU);
  const itens = [
    ["solucao", t.nav.solucao],
    ["como-funciona", t.nav.como],
    ["painel", t.nav.painel],
    ["planos", t.nav.planos],
    ["duvidas", t.nav.duvidas],
  ];
  return (
    <header className="lp-header" data-rolou={rolou ? "true" : "false"}>
      <div className="lp-wrap lp-header__inner">
        <Link to={IDIOMAS[idioma].inicio} className="lp-brand">
          <Logo />
          <span className="lp-brand__name">Psyra AI</span>
        </Link>
        <nav className="lp-nav" aria-label={t.nav.rotulo}>
          {itens.map(([id, texto]) => (
            <a key={id} href={`${IDIOMAS[idioma].inicio}#${id}`} aria-current={ativa === id ? "true" : undefined}>
              {texto}
            </a>
          ))}
        </nav>
        <div className="lp-header__actions">
          <BotaoTema t={t} />
          <SeletorIdioma atual={idioma} rotulo={t.idioma.rotulo} destino={destino} />
          <Link className="lp-btn lp-btn--ghost" to="/entrar">
            {t.acoes.entrar}
          </Link>
          <a className="lp-btn lp-btn--primary lp-btn--cta-topo" href={`${IDIOMAS[idioma].inicio}#contato`}>
            {t.acoes.diagnostico}
          </a>
        </div>
      </div>
      <div className="lp-progresso" aria-hidden="true">
        <span ref={barra} />
      </div>
    </header>
  );
}

function SugestaoIdioma({ idioma }) {
  const [sugerido, setSugerido] = useState(null);

  useEffect(() => {
    if (idioma !== "pt" || idiomaSalvo()) return;
    const doNavegador = idiomaDoNavegador();
    if (doNavegador && doNavegador !== "pt") setSugerido(doNavegador);
  }, [idioma]);

  if (!sugerido) return null;
  const s = TEXTOS[sugerido].sugestao;
  const cfg = IDIOMAS[sugerido];
  return (
    <div className="lp-sugestao" role="region" aria-label={s.texto} lang={cfg.html}>
      <div className="lp-wrap lp-sugestao__inner">
        <p>{s.texto}</p>
        <div className="lp-sugestao__acoes">
          <Link className="lp-btn lp-btn--primary" to={cfg.inicio} onClick={() => salvarIdioma(sugerido)}>
            {s.ir}
          </Link>
          <button
            type="button"
            className="lp-btn lp-btn--ghost"
            onClick={() => {
              salvarIdioma("pt");
              setSugerido(null);
            }}
          >
            {s.ficar}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvisoTraducao({ t }) {
  if (!t.aviso) return null;
  return (
    <div className="lp-aviso-traducao">
      <p className="lp-wrap">{t.aviso}</p>
    </div>
  );
}

function Footer({ t, idioma, destino }) {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer__grid">
        <div className="lp-footer__brand">
          <Link to={IDIOMAS[idioma].inicio} className="lp-brand">
            <Logo />
            <span className="lp-brand__name">Psyra AI</span>
          </Link>
          <p>{t.rodape.descricao}</p>
          <p className="lp-footer__origem">{t.rodape.origem}</p>
        </div>
        <div>
          <h3>{t.rodape.navegacao}</h3>
          <ul>
            <li>
              <a href={`${IDIOMAS[idioma].inicio}#sobre`}>{t.rodape.sobre}</a>
            </li>
            <li>
              <a href={`${IDIOMAS[idioma].inicio}#planos`}>{t.nav.planos}</a>
            </li>
            <li>
              <a href={`${IDIOMAS[idioma].inicio}#contato`}>{t.rodape.contato}</a>
            </li>
            <li>
              <Link to={IDIOMAS[idioma].privacidade}>{t.rodape.privacidade}</Link>
            </li>
            <li>
              <Link to="/entrar">{t.acoes.entrar}</Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>{t.rodape.contato}</h3>
          <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>
          <div className="lp-footer__idioma">
            <SeletorIdioma atual={idioma} rotulo={t.idioma.rotulo} destino={destino} alinhar="inicio" />
          </div>
          <p className="lp-footer__copy">
            © {new Date().getFullYear()} Psyra AI. {t.rodape.direitos}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing({ idioma = "pt" }) {
  const t = TEXTOS[idioma] || TEXTOS.pt;
  useIdiomaDaPagina(idioma, t.meta.titulo, t.meta.descricao);
  const destino = (id) => IDIOMAS[id].inicio;

  return (
    <div className="lp-root" lang={IDIOMAS[idioma].html}>
      <SugestaoIdioma idioma={idioma} />
      <Header t={t} idioma={idioma} destino={destino} />
      <AvisoTraducao t={t} />
      <main>
        <Hero t={t} idioma={idioma} />
        <Problema t={t} />
        <Solucao t={t} idioma={idioma} />
        <ComoFunciona t={t} />
        <Modelo t={t} />
        <Painel t={t} idioma={idioma} />
        <Entregas t={t} />
        <Planos t={t} idioma={idioma} />
        <Confianca t={t} idioma={idioma} />
        <Sobre t={t} />
        <Duvidas t={t} />
        <Contato t={t} idioma={idioma} />
      </main>
      <Footer t={t} idioma={idioma} destino={destino} />
    </div>
  );
}

function Hero({ t, idioma }) {
  const c = t.hero.card;
  return (
    <section className="lp-hero">
      <div className="lp-hero__glow" aria-hidden="true" />
      <div className="lp-wrap lp-hero__grid">
        <Reveal>
          <p className="lp-pill">{t.hero.pill}</p>
          <h1>
            <span className="lp-metric">{t.hero.numero}</span> {t.hero.titulo}
          </h1>
          <p className="lp-lead">{t.hero.lead}</p>
          <div className="lp-hero__ctas">
            <a className="lp-btn lp-btn--primary lp-btn--lg" href="#contato">
              {t.acoes.diagnostico}
            </a>
            <a className="lp-btn lp-btn--ghost lp-btn--lg" href="#painel">
              {t.acoes.verPainel}
            </a>
          </div>
          <ul className="lp-garantias">
            {t.hero.garantias.map((g) => (
              <li key={g}>
                <ShieldCheck size={15} aria-hidden="true" /> {g}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={150}>
          <div className="lp-demo-card">
            <div className="lp-demo-card__topo">
              <p className="lp-demo-card__label">{c.rotulo}</p>
              <span className="lp-selo">{t.ilustrativo}</span>
            </div>
            <div className="lp-demo-card__stack">
              {[
                { g: c.grupoA, id: "A", chip: "lp-chip--ok" },
                { g: c.grupoB, id: "B", chip: "lp-chip--bad" },
              ].map(({ g, id, chip }) => (
                <div className="lp-demo-item" key={id}>
                  <div className="lp-demo-item__row">
                    <span>{g.nome}</span>
                    <span className="lp-metric">3/5</span>
                  </div>
                  <BarrasHero t={t} idioma={idioma} grupo={id} />
                  <p lang="pt-BR">{g.frase}</p>
                  {g.traducao ? <p className="lp-demo-item__traducao">{g.traducao}</p> : null}
                  <span className={`lp-chip ${chip}`}>{g.chip}</span>
                </div>
              ))}
            </div>
            <p className="lp-demo-card__note">{c.nota}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Problema({ t }) {
  const p = t.problema;
  return (
    <section id="problema" className="lp-section lp-section--deep" aria-labelledby="titulo-problema">
      <div className="lp-wrap">
        <Reveal>
          <Cabecalho id="titulo-problema" rotulo={p.rotulo} titulo={p.titulo} intro={p.intro} />
        </Reveal>
        <div className="lp-problema-grid">
          <Reveal>
            <div className="lp-card lp-card--destaque">
              <p className="lp-metric lp-text-destructive">{t.hero.numero}</p>
              <p>{p.legenda}</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="lp-card">
              <h3 className="lp-card__titulo-pequeno">{p.linhaTitulo}</h3>
              <ol className="lp-timeline">
                {p.marcos.map((m, i) => (
                  <li key={m.data} className={i === p.marcos.length - 1 ? "lp-timeline__atual" : ""}>
                    <span className="lp-timeline__data lp-metric">{m.data}</span>
                    <p>{m.texto}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
        <Reveal delay={200}>
          <div className="lp-banner">
            <p>{p.banner}</p>
            <a className="lp-btn lp-btn--primary" href="#contato">
              {t.acoes.diagnostico}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Solucao({ t, idioma }) {
  const s = t.solucao;
  return (
    <section id="solucao" className="lp-section lp-section--light" aria-labelledby="titulo-solucao">
      <div className="lp-wrap">
        <Reveal>
          <Cabecalho id="titulo-solucao" rotulo={s.rotulo} titulo={s.titulo} intro={s.intro} />
        </Reveal>
        <div className="lp-grid lp-grid--3">
          {s.cards.map((c, i) => (
            <Reveal key={c.t} delay={i * 120}>
              <div className="lp-card">
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="lp-panel-dark lp-revelador">
            <div className="lp-revelador__texto">
              <p className="lp-eyebrow">{s.revelador.rotulo}</p>
              <h3>{s.revelador.titulo}</h3>
              <p>{s.revelador.texto}</p>
              <a className="lp-btn lp-btn--primary" href="#contato">
                {t.acoes.diagnostico}
              </a>
            </div>
            <GraficoRevelador t={t} idioma={idioma} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ComoFunciona({ t }) {
  const c = t.como;
  return (
    <section id="como-funciona" className="lp-section lp-section--night" aria-labelledby="titulo-como">
      <div className="lp-wrap">
        <Reveal>
          <Cabecalho id="titulo-como" rotulo={c.rotulo} titulo={c.titulo} intro={c.intro} />
        </Reveal>
        <ol className="lp-grid lp-grid--4 lp-passos">
          {c.passos.map((p, i) => {
            const Icone = ICONES_PASSOS[i];
            return (
              <li key={p.t} className="lp-passo">
                <Reveal delay={i * 110}>
                  <div className="lp-card lp-step">
                    <div className="lp-step__topo">
                      <span className="lp-metric">{i + 1}</span>
                      <Icone size={24} strokeWidth={1.7} aria-hidden="true" />
                    </div>
                    <h3>{p.t}</h3>
                    <p>{p.d}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
        <Reveal delay={180}>
          <p className="lp-note">{c.instrumento}</p>
        </Reveal>
        <Reveal delay={200}>
          <div className="lp-banner lp-banner--ok">
            <span className="lp-badge">n ≥ 5</span>
            <p>{c.banner}</p>
            <a className="lp-btn lp-btn--ghost" href="#contato">
              {t.acoes.diagnostico}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Modelo({ t }) {
  const m = t.modelo;
  return (
    <section id="modelo" className="lp-section lp-section--light lp-modelo" aria-labelledby="titulo-modelo">
      <div className="lp-wrap">
        <Reveal>
          <Cabecalho id="titulo-modelo" rotulo={m.rotulo} titulo={m.titulo} intro={m.intro} />
        </Reveal>
        <ul className="lp-grid lp-grid--3 lp-modelo__lista">
          {m.itens.map((item, i) => (
            <li key={item.t}>
              <Reveal delay={(i % 3) * 100}>
                <div className="lp-card lp-modelo__card">
                  <p className="lp-metric lp-modelo__valor">{item.v}</p>
                  <h3>{item.t}</h3>
                  <p>{item.d}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
        <Reveal delay={150}>
          <p className="lp-note lp-modelo__nota">{m.nota}</p>
        </Reveal>
      </div>
    </section>
  );
}

function Painel({ t, idioma }) {
  const p = t.painel;
  const [aba, setAba] = useState("riscos");
  const abas = ["riscos", "fatores"];

  function teclado(evento) {
    if (evento.key !== "ArrowRight" && evento.key !== "ArrowLeft") return;
    evento.preventDefault();
    const delta = evento.key === "ArrowRight" ? 1 : -1;
    const proxima = abas[(abas.indexOf(aba) + delta + abas.length) % abas.length];
    setAba(proxima);
    document.getElementById(`aba-${proxima}`)?.focus();
  }

  return (
    <section id="painel" className="lp-section lp-section--deep" aria-labelledby="titulo-painel">
      <div className="lp-wrap">
        <Reveal>
          <Cabecalho id="titulo-painel" rotulo={p.rotulo} titulo={p.titulo} intro={p.intro} />
        </Reveal>
        <Reveal delay={100}>
          <div className="lp-painel">
            <div className="lp-painel__topo">
              <div className="lp-abas" role="tablist" aria-label={p.titulo}>
                {abas.map((id) => (
                  <button
                    key={id}
                    id={`aba-${id}`}
                    type="button"
                    role="tab"
                    className="lp-aba"
                    aria-selected={aba === id}
                    aria-controls={`painel-${id}`}
                    tabIndex={aba === id ? 0 : -1}
                    onClick={() => setAba(id)}
                    onKeyDown={teclado}
                  >
                    {p.abas[id]}
                  </button>
                ))}
              </div>
              <span className="lp-selo">{t.ilustrativo}</span>
            </div>
            <div id="painel-riscos" role="tabpanel" aria-labelledby="aba-riscos" hidden={aba !== "riscos"}>
              <GraficoRiscos t={t} idioma={idioma} />
            </div>
            <div id="painel-fatores" role="tabpanel" aria-labelledby="aba-fatores" hidden={aba !== "fatores"}>
              <GraficoFatores t={t} idioma={idioma} />
            </div>
            <p className="lp-painel__rodape">{p.rodape}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Entregas({ t }) {
  const e = t.entregas;
  return (
    <section id="entregas" className="lp-section lp-section--night" aria-labelledby="titulo-entregas">
      <div className="lp-wrap">
        <Reveal>
          <Cabecalho id="titulo-entregas" rotulo={e.rotulo} titulo={e.titulo} intro={e.intro} />
        </Reveal>
        <div className="lp-grid lp-grid--4">
          {e.itens.map((item, i) => {
            const Icone = ICONES_ENTREGAS[i];
            return (
              <Reveal key={item.t} delay={i * 100}>
                <div className="lp-card">
                  <Icone className="lp-card__icone" size={24} strokeWidth={1.7} aria-hidden="true" />
                  <h3>{item.t}</h3>
                  <p>{item.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={150}>
          <div className="lp-tabela-wrap">
            <table className="lp-tabela">
              <caption>{e.comparacao.titulo}</caption>
              <thead>
                <tr>
                  {e.comparacao.colunas.map((c, i) =>
                    i === 0 ? (
                      <td key="vazio" />
                    ) : (
                      <th key={c} scope="col" className={i === 2 ? "lp-tabela__psyra" : ""}>
                        {c}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {e.comparacao.linhas.map(([rotulo, clima, psyra]) => (
                  <tr key={rotulo}>
                    <th scope="row">{rotulo}</th>
                    <td>{clima}</td>
                    <td className="lp-tabela__psyra">{psyra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Planos({ t, idioma }) {
  const pl = t.planos;
  return (
    <section id="planos" className="lp-section lp-section--deep" aria-labelledby="titulo-planos">
      <div className="lp-wrap">
        <Reveal>
          <Cabecalho id="titulo-planos" rotulo={pl.rotulo} titulo={pl.titulo} intro={pl.intro} />
        </Reveal>
        <Reveal delay={80}>
          <GraficoCusto t={t} idioma={idioma} planos={PLANOS} />
        </Reveal>
        <div className="lp-grid lp-grid--3 lp-planos">
          {PLANOS.map((p, i) => {
            const texto = pl.lista[p.id];
            return (
              <Reveal key={p.id} delay={i * 120}>
                <div className={`lp-card lp-plan ${p.destaque ? "lp-plan--hot" : ""}`}>
                  <div className="lp-plan__top">
                    <h3>{p.nome}</h3>
                    {p.destaque ? <span className="lp-plan__badge">{pl.recomendado}</span> : null}
                  </div>
                  <p className="lp-plan__price">
                    <span className="lp-metric">{formatarReais(p.valorMensal, idioma)}</span>
                    <span>{pl.periodo}</span>
                  </p>
                  <p className="lp-plan__faixa">{texto.faixa}</p>
                  <p>{texto.desc}</p>
                  <ul>
                    {texto.itens.map((item) => (
                      <li key={item}>
                        <span aria-hidden="true">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a className={`lp-btn ${p.destaque ? "lp-btn--primary" : "lp-btn--ghost"}`} href="#contato">
                    {t.acoes.falar}
                  </a>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={200}>
          <p className="lp-note-center">
            <strong>{pl.nota}</strong>
            {pl.moeda ? <span className="lp-note-center__moeda">{pl.moeda}</span> : null}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Confianca({ t, idioma }) {
  const c = t.confianca;
  return (
    <section id="privacidade" className="lp-section lp-section--light" aria-labelledby="titulo-confianca">
      <div className="lp-wrap">
        <Reveal>
          <Cabecalho id="titulo-confianca" rotulo={c.rotulo} titulo={c.titulo} intro={c.intro} />
        </Reveal>
        <div className="lp-grid lp-grid--3">
          {c.itens.map((item, i) => {
            const Icone = ICONES_CONFIANCA[i];
            return (
              <Reveal key={item.t} delay={(i % 3) * 100}>
                <div className="lp-card">
                  <Icone className="lp-card__icone" size={24} strokeWidth={1.7} aria-hidden="true" />
                  <h3>{item.t}</h3>
                  <p>{item.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={150}>
          <div className="lp-ia">
            <h3>{c.iaTitulo}</h3>
            <ul>
              {c.ia.map((linha) => (
                <li key={linha}>{linha}</li>
              ))}
            </ul>
            <p className="lp-ia__etica">{c.etica}</p>
            <Link className="lp-link" to={IDIOMAS[idioma].privacidade}>
              {c.link} →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Sobre({ t }) {
  const s = t.sobre;
  return (
    <section id="sobre" className="lp-section lp-section--night" aria-labelledby="titulo-sobre">
      <div className="lp-wrap lp-sobre-grid">
        <Reveal>
          <p className="lp-eyebrow">{s.rotulo}</p>
          <h2 id="titulo-sobre">{s.pilotoTitulo}</h2>
          <p className="lp-section__intro">{s.pilotoTexto}</p>
          <a className="lp-btn lp-btn--primary lp-sobre__cta" href="#contato">
            {t.acoes.piloto}
          </a>
        </Reveal>
        <Reveal delay={150}>
          <div className="lp-about-card">
            <div className="lp-about-card__title">
              <Logo />
              <h3>{s.equipeTitulo}</h3>
            </div>
            <p>{s.equipeIntro}</p>
            <ul className="lp-equipe">
              {s.pessoas.map((pessoa) => (
                <li key={pessoa.nome}>
                  <strong>{pessoa.nome}</strong> — {pessoa.papel}
                </li>
              ))}
            </ul>
            <p>{s.compromisso}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Duvidas({ t }) {
  const f = t.faq;
  return (
    <section id="duvidas" className="lp-section lp-section--deep" aria-labelledby="titulo-duvidas">
      <div className="lp-wrap lp-wrap--estreito">
        <Reveal>
          <Cabecalho id="titulo-duvidas" rotulo={f.rotulo} titulo={f.titulo} />
        </Reveal>
        <div className="lp-faq">
          {f.itens.map((item) => (
            <details key={item.p} className="lp-faq__item">
              <summary>{item.p}</summary>
              <p>{item.r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contato({ t, idioma }) {
  const c = t.contato;
  const [enviado, setEnviado] = useState(false);

  function enviar(evento) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const valor = (campo) => String(dados.get(campo) || "").trim();
    const empresa = valor("empresa");
    const corpo = [
      `${c.campos.nome}: ${valor("nome")}`,
      `${c.campos.empresa}: ${empresa}`,
      `${c.campos.email}: ${valor("email")}`,
      `${c.campos.telefone}: ${valor("telefone")}`,
      `${c.campos.porte.replace(/\s*\(.*\)$/, "")}: ${valor("porte") || c.naoInformado}`,
      `Idioma: ${IDIOMAS[idioma].nome}`,
    ].join("\n");
    const assunto = `${c.assunto} — ${empresa}`;
    setEnviado(true);
    window.location.href = `mailto:${EMAIL_CONTATO}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  }

  return (
    <section id="contato" className="lp-section lp-section--night" aria-labelledby="titulo-contato">
      <div className="lp-wrap lp-contato-grid">
        <Reveal>
          <Cabecalho id="titulo-contato" rotulo={c.rotulo} titulo={c.titulo} intro={c.intro} />
          <p className="lp-contato__direto">
            {c.direto} <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>
          </p>
        </Reveal>
        <Reveal delay={120}>
          <form className="lp-form" onSubmit={enviar}>
            {enviado ? (
              <div className="lp-form-ok" role="status">
                <p>{c.okTitulo}</p>
                <p>
                  {c.okTexto} <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
                </p>
              </div>
            ) : (
              <>
                {[
                  { id: "nome", type: "text", auto: "name" },
                  { id: "empresa", type: "text", auto: "organization" },
                  { id: "email", type: "email", auto: "email" },
                  { id: "telefone", type: "tel", auto: "tel" },
                ].map((campo) => (
                  <div className="campo" key={campo.id}>
                    <label htmlFor={`lp-${campo.id}`}>{c.campos[campo.id]}</label>
                    <input id={`lp-${campo.id}`} name={campo.id} type={campo.type} autoComplete={campo.auto} required />
                  </div>
                ))}
                <div className="campo">
                  <label htmlFor="lp-porte">{c.campos.porte}</label>
                  <select id="lp-porte" name="porte" defaultValue="">
                    <option value="">{c.campos.selecione}</option>
                    {c.faixas.map((faixa) => (
                      <option key={faixa} value={faixa}>
                        {faixa}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lp-consentimento">
                  <input id="lp-consentimento" name="consentimento" type="checkbox" required />
                  <label htmlFor="lp-consentimento">
                    {c.consentimentoAntes}
                    <Link to={IDIOMAS[idioma].privacidade}>{c.consentimentoLink}</Link>
                    {c.consentimentoDepois}
                  </label>
                </div>
                <button className="lp-btn lp-btn--primary lp-btn--block" type="submit">
                  {t.acoes.diagnostico}
                </button>
              </>
            )}
          </form>
        </Reveal>
      </div>
    </section>
  );
}

export function Privacidade({ idioma = "pt" }) {
  const t = TEXTOS[idioma] || TEXTOS.pt;
  const p = t.privacidade;
  useIdiomaDaPagina(idioma, `${p.titulo} — Psyra AI`, p.intro);
  const destino = (id) => IDIOMAS[id].privacidade;

  return (
    <div className="lp-root" lang={IDIOMAS[idioma].html}>
      <Header t={t} idioma={idioma} destino={destino} />
      <AvisoTraducao t={t} />
      <main className="lp-wrap lp-privacidade">
        <h1>{p.titulo}</h1>
        <p className="lp-section__intro">{p.intro}</p>
        <p className="lp-privacidade__aviso">{p.aviso}</p>
        <div className="lp-privacidade__blocos">
          {p.blocos.map((b, i) => (
            <section key={b.t} className="lp-card">
              <h2>{b.t}</h2>
              <p>
                {b.d}
                {i === p.blocos.length - 1 ? (
                  <>
                    {" "}
                    <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
                  </>
                ) : null}
              </p>
            </section>
          ))}
        </div>
        <Link className="lp-link lp-privacidade__voltar" to={IDIOMAS[idioma].inicio}>
          ← {p.voltar}
        </Link>
      </main>
      <Footer t={t} idioma={idioma} destino={destino} />
    </div>
  );
}
