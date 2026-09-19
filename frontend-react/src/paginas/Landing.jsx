// Landing comercial Psyra AI — primeira tela do site (/).

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

function Logo({ className = "lp-logo" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <path d="M22 16c-6 4-8 10-8 16s3 10 8 12" />
        <path d="M42 16c6 4 8 10 8 16s-3 10-8 12" />
        <path d="M32 12v40" />
        <path d="M24 52h16" />
      </g>
      <circle cx="24" cy="30" r="2.5" fill="currentColor" />
      <circle cx="40" cy="30" r="2.5" fill="currentColor" />
    </svg>
  );
}

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      setVisible(true);
      return;
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
    <div
      ref={ref}
      className={`lp-reveal ${className}`}
      data-visible={visible ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Header() {
  return (
    <header className="lp-header">
      <div className="lp-wrap lp-header__inner">
        <Link to="/" className="lp-brand">
          <Logo />
          <span className="lp-brand__name">Psyra AI</span>
        </Link>
        <nav className="lp-nav" aria-label="Seções">
          <a href="#problema">O problema</a>
          <a href="#solucao">Solução</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#planos">Planos</a>
          <a href="#conformidade">Conformidade</a>
        </nav>
        <div className="lp-header__actions">
          <Link className="lp-btn lp-btn--ghost" to="/entrar">
            Entrar no painel
          </Link>
          <a className="lp-btn lp-btn--primary" href="#contato">
            Agendar diagnóstico gratuito
          </a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer__grid">
        <div className="lp-footer__brand">
          <Link to="/" className="lp-brand">
            <Logo />
            <span className="lp-brand__name">Psyra AI</span>
          </Link>
          <p>
            Detecção preditiva de riscos psicossociais em português, com conformidade NR-1 e
            resultados sempre agregados por grupo.
          </p>
        </div>
        <div>
          <h3>Navegação</h3>
          <ul>
            <li>
              <a href="#sobre">Sobre</a>
            </li>
            <li>
              <a href="#planos">Planos</a>
            </li>
            <li>
              <a href="#contato">Contato</a>
            </li>
            <li>
              <Link to="/privacidade">Política de Privacidade</Link>
            </li>
            <li>
              <Link to="/entrar">Entrar no painel</Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>Contato</h3>
          <a href="mailto:contato@psyra.ai">contato@psyra.ai</a>
          <p className="lp-footer__copy">
            © {new Date().getFullYear()} Psyra AI. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

const problemas = [
  {
    valor: "546 mil",
    legenda: "afastamentos por saúde mental no Brasil em 2025 (INSS/Dataprev)",
    cor: "lp-text-destructive",
  },
  {
    valor: "NR-1",
    legenda:
      "obrigatória desde maio/2026 para empresas CLT: mapear riscos psicossociais deixou de ser opcional",
    cor: "lp-text-warning",
  },
  {
    valor: "R$ 7.034",
    legenda: "multa de até este valor por infração para quem não mapear riscos psicossociais",
    cor: "lp-text-destructive",
  },
];

const passos = [
  {
    n: "1",
    t: "Pesquisa anônima",
    d: "Colaboradores respondem em texto livre e em escala, de forma anônima.",
  },
  {
    n: "2",
    t: "Análise por IA",
    d: "A IA lê o texto em português e cruza com a escala para identificar sinais de risco.",
  },
  {
    n: "3",
    t: "Agregação por grupo",
    d: "Resultados só existem por grupo (GHE) com n≥5. Nunca há resultado individual.",
  },
  {
    n: "4",
    t: "Plano de ação PGR",
    d: "A empresa recebe prioridades e plano de ação prontos para o PGR e a NR-1.",
  },
];

const planos = [
  {
    nome: "Sinal",
    preco: "R$ 1.200",
    desc: "Entrada para empresas menores ou para começar o mapeamento básico de risco psicossocial.",
    itens: [
      "Pesquisa anônima com texto livre",
      "Análise de risco psicossocial por grupo",
      "Painel com indicadores essenciais",
      "Relatório básico para NR-1",
    ],
    destaque: false,
  },
  {
    nome: "Padrão",
    preco: "R$ 2.500",
    desc: "Plano intermediário, com análise aprofundada e relatórios mais completos.",
    itens: [
      "Tudo do plano Sinal",
      "Análise de texto livre com explicabilidade (SHAP)",
      "Comparativo entre grupos e áreas",
      "Relatórios periódicos para PGR",
      "Recomendações de plano de ação",
    ],
    destaque: true,
  },
  {
    nome: "Panorama",
    preco: "R$ 4.500",
    desc: "Plano completo para empresas maiores, com cobertura total e suporte prioritário.",
    itens: [
      "Tudo do plano Padrão",
      "Cobertura de múltiplas unidades e GHEs",
      "Relatórios avançados para PGR/NR-1",
      "Acompanhamento contínuo dos indicadores",
      "Trilha de auditoria completa",
      "Suporte prioritário",
    ],
    destaque: false,
  },
];

export default function Landing() {
  return (
    <div className="lp-root">
      <Header />
      <main>
        <Hero />
        <Problema />
        <Solucao />
        <ComoFunciona />
        <Planos />
        <Conformidade />
        <Sobre />
        <Contato />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="lp-hero">
      <div className="lp-hero__glow" aria-hidden="true" />
      <div className="lp-wrap lp-hero__grid">
        <Reveal>
          <p className="lp-pill">Conformidade NR-1 · Portaria MTE 1.419/2024</p>
          <h1>
            <span className="lp-metric">546 mil</span> afastamentos por saúde mental no Brasil em
            2025. Sua empresa já sabe onde está o risco?
          </h1>
          <p className="lp-lead">
            A Psyra AI detecta risco psicossocial lendo o que as pessoas escrevem em português — não
            apenas notas de 1 a 5. Você enxerga o que uma escala sozinha não mostra, com conformidade
            NR-1 e resultados sempre por grupo.
          </p>
          <div className="lp-hero__ctas">
            <a className="lp-btn lp-btn--primary lp-btn--lg" href="#contato">
              Agendar diagnóstico gratuito
            </a>
            <a className="lp-btn lp-btn--ghost lp-btn--lg" href="#como-funciona">
              Ver como funciona
            </a>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="lp-demo-card">
            <p className="lp-demo-card__label">Mesma nota, sinais opostos</p>
            <div className="lp-demo-card__stack">
              <div className="lp-demo-item">
                <div className="lp-demo-item__row">
                  <span>Grupo A · escala</span>
                  <span className="lp-metric">3/5</span>
                </div>
                <p>“A rotina é puxada, mas a equipe se apoia e a liderança ouve.”</p>
                <span className="lp-chip lp-chip--ok">Sinal de suporte social</span>
              </div>
              <div className="lp-demo-item">
                <div className="lp-demo-item__row">
                  <span>Grupo B · escala</span>
                  <span className="lp-metric">3/5</span>
                </div>
                <p>“Sigo entregando, mas já não durmo direito pensando nas metas.”</p>
                <span className="lp-chip lp-chip--bad">Sinal de exaustão</span>
              </div>
            </div>
            <p className="lp-demo-card__note">
              Exemplos ilustrativos. Resultados reais são sempre agregados por grupo (n≥5).
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Problema() {
  return (
    <section id="problema" className="lp-section lp-section--deep">
      <div className="lp-wrap">
        <Reveal>
          <h2>O problema</h2>
          <p className="lp-section__intro">
            O adoecimento mental no trabalho virou um risco operacional, financeiro e agora também
            regulatório.
          </p>
        </Reveal>
        <div className="lp-grid lp-grid--3">
          {problemas.map((p, i) => (
            <Reveal key={p.valor} delay={i * 120}>
              <div className="lp-card">
                <p className={`lp-metric ${p.cor}`}>{p.valor}</p>
                <p>{p.legenda}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="lp-banner">
            <p>Mapear risco psicossocial deixou de ser boa prática: é obrigação legal.</p>
            <a className="lp-btn lp-btn--primary" href="#contato">
              Agendar diagnóstico gratuito
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Solucao() {
  return (
    <section id="solucao" className="lp-section lp-section--light">
      <div className="lp-wrap">
        <Reveal>
          <h2>Escala de 1 a 5 não conta a história toda</h2>
          <p className="lp-section__intro">
            As soluções do mercado se apoiam apenas na escala Likert. A Psyra é a única que lê e
            interpreta texto livre em português.
          </p>
        </Reveal>
        <div className="lp-grid lp-grid--3">
          {[
            {
              t: "IA que entende português",
              d: "Modelo MentalBERT-PT aplicado ao texto livre dos colaboradores, e não apenas a números.",
            },
            {
              t: "Explicabilidade",
              d: "SHAP mostra o que sustentou cada indicação de risco, em linha com o Art. 20 da LGPD.",
            },
            {
              t: "Conformidade NR-1 automática",
              d: "Os achados já saem organizados para o mapeamento de riscos e para o PGR.",
            },
          ].map((c, i) => (
            <Reveal key={c.t} delay={i * 120}>
              <div className="lp-card">
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="lp-panel-dark">
            <p className="lp-eyebrow">O Revelador</p>
            <h3>A mesma nota numérica pode esconder sinais opostos no texto.</h3>
            <p>
              É exatamente essa diferença que a Psyra captura — e é por isso que dois grupos com
              médias idênticas podem exigir ações completamente diferentes.
            </p>
            <a className="lp-btn lp-btn--primary" href="#contato">
              Agendar diagnóstico gratuito
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ComoFunciona() {
  return (
    <section id="como-funciona" className="lp-section lp-section--night">
      <div className="lp-wrap">
        <Reveal>
          <h2>Como funciona</h2>
          <p className="lp-section__intro">
            Quatro passos, do convite da pesquisa ao plano de ação pronto para o PGR.
          </p>
        </Reveal>
        <div className="lp-grid lp-grid--4">
          {passos.map((p, i) => (
            <Reveal key={p.n} delay={i * 110}>
              <div className="lp-card lp-step">
                <span className="lp-metric">{p.n}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="lp-banner lp-banner--ok">
            <span className="lp-badge">n ≥ 5</span>
            <p>
              Nenhum resultado individual é exposto. Tudo é agregado por grupo com k-anonimato.
            </p>
            <a className="lp-btn lp-btn--ghost" href="#contato">
              Agendar diagnóstico gratuito
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Planos() {
  return (
    <section id="planos" className="lp-section lp-section--deep">
      <div className="lp-wrap">
        <Reveal>
          <h2>Planos e preços</h2>
          <p className="lp-section__intro">
            Escolha o nível de cobertura conforme o tamanho e a maturidade da sua operação.
          </p>
        </Reveal>
        <div className="lp-grid lp-grid--3">
          {planos.map((p, i) => (
            <Reveal key={p.nome} delay={i * 120}>
              <div className={`lp-card lp-plan ${p.destaque ? "lp-plan--hot" : ""}`}>
                <div className="lp-plan__top">
                  <h3>{p.nome}</h3>
                  {p.destaque ? <span className="lp-plan__badge">Mais popular</span> : null}
                </div>
                <p className="lp-plan__price">
                  <span className="lp-metric">{p.preco}</span>
                  <span>/mês</span>
                </p>
                <p>{p.desc}</p>
                <ul>
                  {p.itens.map((item) => (
                    <li key={item}>
                      <span>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <a
                  className={`lp-btn ${p.destaque ? "lp-btn--primary" : "lp-btn--ghost"}`}
                  href="#contato"
                >
                  Falar com a Psyra
                </a>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <p className="lp-note-center">
            Todos os planos começam com um <strong>diagnóstico inicial gratuito</strong> antes da
            contratação.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Conformidade() {
  return (
    <section id="conformidade" className="lp-section lp-section--light">
      <div className="lp-wrap">
        <Reveal>
          <h2>Conformidade e privacidade</h2>
          <p className="lp-section__intro">
            Confiança é pré-requisito para as pessoas responderem com honestidade. Por isso a
            privacidade é estrutural na Psyra, não um adendo.
          </p>
        </Reveal>
        <div className="lp-grid lp-grid--4">
          {[
            { t: "LGPD por padrão", d: "Tratamento de dados alinhado à LGPD em todo o ciclo." },
            {
              t: "Anonimização",
              d: "Identificadores removidos automaticamente das respostas com Presidio.",
            },
            { t: "Auditoria com hash", d: "Trilha verificável do que foi processado e quando." },
            {
              t: "Sempre por grupo (GHE)",
              d: "Resultados existem apenas de forma agregada, nunca individual.",
            },
          ].map((c, i) => (
            <Reveal key={c.t} delay={i * 110}>
              <div className="lp-card">
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sobre() {
  return (
    <section id="sobre" className="lp-section lp-section--night">
      <div className="lp-wrap lp-sobre-grid">
        <Reveal>
          <h2>Empresas piloto</h2>
          <p className="lp-section__intro">
            Espaço reservado para logos e depoimentos de organizações parceiras.
          </p>
          <div className="lp-logos">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="lp-logo-slot">
                Seu logo aqui
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="lp-about-card">
            <div className="lp-about-card__title">
              <Logo />
              <h2>Quem está por trás</h2>
            </div>
            <p>
              A Psyra AI é conduzida por Vinícius, Pedro e Leandro, que unem engenharia de linguagem
              natural, produto e implantação corporativa para levar leitura de risco psicossocial a
              operações reais.
            </p>
            <p>
              Nosso compromisso: nenhuma promessa de avaliação individual, nenhum resultado sem
              explicação.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Contato() {
  const [enviado, setEnviado] = useState(false);

  return (
    <section id="contato" className="lp-section lp-section--deep">
      <div className="lp-wrap lp-contato-grid">
        <Reveal>
          <h2>Comece pelo diagnóstico gratuito</h2>
          <p className="lp-section__intro" style={{ marginTop: "1rem" }}>
            Em uma conversa rápida mostramos como a Psyra lê texto livre em português, como os
            resultados são agregados por grupo e o que sua empresa precisa entregar na NR-1.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <form
            className="lp-form"
            onSubmit={(e) => {
              e.preventDefault();
              setEnviado(true);
            }}
          >
            {enviado ? (
              <div className="lp-form-ok">
                <p>Solicitação recebida</p>
                <p>Entraremos em contato para agendar seu diagnóstico gratuito.</p>
              </div>
            ) : (
              <>
                {[
                  { id: "nome", label: "Nome", type: "text" },
                  { id: "empresa", label: "Empresa", type: "text" },
                  { id: "email", label: "E-mail corporativo", type: "email" },
                  { id: "telefone", label: "Telefone", type: "tel" },
                ].map((f) => (
                  <div className="campo" key={f.id}>
                    <label htmlFor={`lp-${f.id}`}>{f.label}</label>
                    <input id={`lp-${f.id}`} name={f.id} type={f.type} required />
                  </div>
                ))}
                <button className="lp-btn lp-btn--primary lp-btn--block" type="submit">
                  Agendar diagnóstico gratuito
                </button>
              </>
            )}
          </form>
        </Reveal>
      </div>
    </section>
  );
}

export function Privacidade() {
  return (
    <div className="lp-root">
      <Header />
      <main className="lp-wrap" style={{ maxWidth: "48rem", paddingTop: "5rem", paddingBottom: "5rem" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 4vw, 2.5rem)" }}>Política de Privacidade</h1>
        <p className="lp-section__intro" style={{ marginTop: "1rem" }}>
          Privacidade é condição para que as pessoas respondam com honestidade. Esta página resume
          como a Psyra AI trata dados.
        </p>
        <div style={{ marginTop: "2.5rem", display: "grid", gap: "1.5rem" }}>
          {[
            {
              t: "Dados tratados",
              d: "Respostas de pesquisas organizacionais, em escala e em texto livre, coletadas de forma anônima e tratadas para fins de mapeamento de riscos psicossociais.",
            },
            {
              t: "Anonimização",
              d: "Identificadores presentes no texto são removidos automaticamente com Presidio antes da análise.",
            },
            {
              t: "Agregação por grupo",
              d: "Os resultados existem apenas de forma agregada por grupo homogêneo de exposição (GHE), com k-anonimato n≥5. Não há resultado individual, nem para a empresa contratante.",
            },
            {
              t: "Explicabilidade",
              d: "As indicações de risco são acompanhadas de explicação (SHAP), em linha com o Art. 20 da LGPD.",
            },
            {
              t: "Auditoria",
              d: "Registros com hash permitem verificar o que foi processado e quando, sem expor conteúdo pessoal.",
            },
            {
              t: "Contato",
              d: "Dúvidas sobre tratamento de dados podem ser enviadas para contato@psyra.ai.",
            },
          ].map((b) => (
            <section key={b.t} className="lp-card">
              <h2 style={{ margin: 0, fontSize: "1.25rem" }}>{b.t}</h2>
              <p>{b.d}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
