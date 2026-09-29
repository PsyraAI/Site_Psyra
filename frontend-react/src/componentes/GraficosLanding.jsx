// Gráficos da landing em HTML/CSS (leves, acessíveis e traduzíveis). Sprint: S10 | Risco: R2
// Todos os números abaixo são ILUSTRATIVOS, exceto o custo por colaborador (preço ÷ limite
// da faixa). Nenhum gráfico mostra pessoa individual; o grupo com n < 5 aparece oculto.

import { formatarNumero, formatarReais } from "../lib/idiomas";

const MENOS = "−";
const assinado = (v, id) => (v > 0 ? `+${formatarNumero(v, id)}` : v < 0 ? `${MENOS}${formatarNumero(-v, id)}` : "0");

export const DADOS_ILUSTRATIVOS = {
  hero: { escala: 60, textoA: 25, textoB: 80 },
  revelador: [
    { id: "atendimento", escala: 58, texto: 74 },
    { id: "operacoes", escala: 55, texto: 53 },
    { id: "financeiro", escala: 42, texto: 40 },
    { id: "ti", escala: 61, texto: 45 },
  ],
  riscos: [
    { id: "atendimento", valor: 68, nivel: "alto" },
    { id: "operacoes", valor: 52, nivel: "moderado" },
    { id: "comercial", valor: 47, nivel: "moderado" },
    { id: "ti", valor: 36, nivel: "baixo" },
    { id: "financeiro", valor: 31, nivel: "baixo" },
  ],
  oculto: "juridico",
  fatores: [
    { id: "sobrecarga", valor: 14 },
    { id: "metas", valor: 9 },
    { id: "reconhecimento", valor: 6 },
    { id: "lideranca", valor: -5 },
  ],
};

export const LIMIAR_REVELADOR = 12;

function Barra({ valor, maximo = 100, classe }) {
  const largura = `${Math.max(0, Math.min(100, (valor / maximo) * 100))}%`;
  return (
    <span className="gl-trilho" aria-hidden="true">
      <span className={`gl-barra ${classe}`} style={{ width: largura }} />
    </span>
  );
}

export function BarrasHero({ t, idioma, grupo }) {
  const { escala } = DADOS_ILUSTRATIVOS.hero;
  const texto = grupo === "A" ? DADOS_ILUSTRATIVOS.hero.textoA : DADOS_ILUSTRATIVOS.hero.textoB;
  return (
    <div className="gl-hero">
      <div className="gl-linha">
        <span className="gl-rotulo">{t.hero.card.escala}</span>
        <Barra valor={escala} classe="gl-barra--escala" />
        <span className="gl-valor lp-metric">{formatarNumero(escala, idioma)}</span>
      </div>
      <div className="gl-linha">
        <span className="gl-rotulo">{t.hero.card.texto}</span>
        <Barra valor={texto} classe={grupo === "A" ? "gl-barra--ok" : "gl-barra--risco"} />
        <span className="gl-valor lp-metric">{formatarNumero(texto, idioma)}</span>
      </div>
    </div>
  );
}

export function GraficoRevelador({ t, idioma }) {
  const r = t.solucao.revelador;
  return (
    <figure className="gl-figura gl-figura--escura">
      <figcaption>
        <span className="gl-titulo">{r.grafico}</span>
        <span className="gl-sub">
          {r.sub} · {t.ilustrativo}
        </span>
      </figcaption>
      <div className="gl-legenda" aria-hidden="true">
        <span>
          <i className="gl-amostra gl-barra--escala" /> {r.escala}
        </span>
        <span>
          <i className="gl-amostra gl-barra--texto" /> {r.texto2}
        </span>
      </div>
      <div className="gl-pares">
        {DADOS_ILUSTRATIVOS.revelador.map((g) => {
          const diferenca = g.texto - g.escala;
          const destaque = Math.abs(diferenca) >= LIMIAR_REVELADOR;
          const nome = t.painel.grupos[g.id];
          return (
            <div key={g.id} className={`gl-par ${destaque ? "gl-par--destaque" : ""}`}>
              <span className="gl-par__nome">{nome}</span>
              <div className="gl-par__barras">
                <div className="gl-linha gl-linha--compacta">
                  <span className="sr-only">{r.escala}</span>
                  <Barra valor={g.escala} classe="gl-barra--escala" />
                  <span className="gl-valor lp-metric">{formatarNumero(g.escala, idioma)}</span>
                </div>
                <div className="gl-linha gl-linha--compacta">
                  <span className="sr-only">{r.texto2}</span>
                  <Barra valor={g.texto} classe={`gl-barra--texto ${destaque ? "" : "gl-barra--suave"}`} />
                  <span className="gl-valor lp-metric">{formatarNumero(g.texto, idioma)}</span>
                </div>
              </div>
              <span className={`gl-dif lp-metric ${destaque ? "" : "gl-dif--neutra"}`}>
                {assinado(diferenca, idioma)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="gl-nota gl-nota--destaque">{r.legenda}</p>
    </figure>
  );
}

export function GraficoRiscos({ t, idioma }) {
  const p = t.painel;
  return (
    <figure className="gl-figura">
      <figcaption>
        <span className="gl-titulo">{p.riscos.titulo}</span>
        <span className="gl-sub">
          {p.riscos.sub} · {t.ilustrativo}
        </span>
      </figcaption>
      <div className="gl-lista">
        {DADOS_ILUSTRATIVOS.riscos.map((g) => (
          <div key={g.id} className="gl-linha gl-linha--grupo">
            <span className="gl-rotulo">{p.grupos[g.id]}</span>
            <Barra valor={g.valor} classe={`gl-barra--${g.nivel}`} />
            <span className="gl-valor lp-metric">{formatarNumero(g.valor, idioma)}</span>
            <span className={`gl-nivel gl-nivel--${g.nivel}`}>{p.riscos.niveis[g.nivel]}</span>
          </div>
        ))}
        <div className="gl-linha gl-linha--grupo gl-linha--oculta">
          <span className="gl-rotulo">{p.grupos[DADOS_ILUSTRATIVOS.oculto]}</span>
          <span className="gl-oculto">{p.riscos.oculto}</span>
        </div>
      </div>
      <div className="gl-legenda" aria-hidden="true">
        {["baixo", "moderado", "alto"].map((n) => (
          <span key={n}>
            <i className={`gl-amostra gl-barra--${n}`} /> {p.riscos.niveis[n]}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function GraficoFatores({ t, idioma }) {
  const p = t.painel;
  const maximo = 16;
  return (
    <figure className="gl-figura">
      <figcaption>
        <span className="gl-titulo">{p.fatores.titulo}</span>
        <span className="gl-sub">
          {p.fatores.sub} · {t.ilustrativo}
        </span>
      </figcaption>
      <div className="gl-lista">
        {DADOS_ILUSTRATIVOS.fatores.map((f) => {
          const positivo = f.valor > 0;
          const largura = `${(Math.abs(f.valor) / maximo) * 50}%`;
          return (
            <div key={f.id} className="gl-fator">
              <span className="gl-rotulo">{p.fatoresNomes[f.id]}</span>
              <span className="gl-divergente" aria-hidden="true">
                <span className="gl-eixo" />
                <span
                  className={`gl-barra ${positivo ? "gl-barra--alto" : "gl-barra--baixo"} gl-barra--${positivo ? "direita" : "esquerda"}`}
                  style={{ width: largura }}
                />
              </span>
              <span className={`gl-valor lp-metric ${positivo ? "gl-valor--risco" : "gl-valor--ok"}`}>
                {assinado(f.valor, idioma)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="gl-legenda" aria-hidden="true">
        <span>
          <i className="gl-amostra gl-barra--alto" /> {p.fatores.aumenta}
        </span>
        <span>
          <i className="gl-amostra gl-barra--baixo" /> {p.fatores.protege}
        </span>
      </div>
    </figure>
  );
}

export function GraficoCusto({ t, idioma, planos }) {
  const valores = planos.map((pl) => ({
    id: pl.id,
    nome: pl.nome,
    destaque: pl.destaque,
    porPessoa: pl.valorMensal / pl.limiteColaboradores,
  }));
  const maximo = Math.max(...valores.map((v) => v.porPessoa));
  return (
    <figure className="gl-figura gl-figura--cartao">
      <figcaption>
        <span className="gl-titulo">{t.planos.custoTitulo}</span>
        <span className="gl-sub">{t.planos.custoSub}</span>
      </figcaption>
      <div className="gl-lista">
        {valores.map((v) => (
          <div key={v.id} className="gl-linha gl-linha--grupo">
            <span className="gl-rotulo">{v.nome}</span>
            <Barra valor={v.porPessoa} maximo={maximo} classe={v.destaque ? "gl-barra--texto" : "gl-barra--escala"} />
            <span className="gl-valor gl-valor--largo lp-metric">{formatarReais(v.porPessoa, idioma, 2)}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
