// Psyra AI — telas do painel. Sprint: S10 | Risco: R2.
// Guardrail de interface: grupo mascarado nunca renderiza número, barra ou nível.
// Textos em pt-BR, inglês e chinês (prop `t`); nomes de grupos e setores vêm da empresa.

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Users,
  Sparkles,
  ShieldCheck,
  ShieldOff,
  ClipboardList,
  CheckCircle2,
  Circle,
  Inbox,
  MessageSquare,
  MessageSquareText,
  TrendingUp,
  Banknote,
  Lock,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

import { corDoNivel, formatarIndice } from "../lib/adaptadores";
import { traduzirAcao, traduzirDimensao } from "../lib/textosApp";
import { useTema } from "../lib/tema";
import Explicacao from "./Explicacao";

/* ---------------------------------------------------------------- Skeleton */
export function PainelSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="grade grade--4">
        {[0, 1, 2, 3].map((i) => (
          <div className="sk sk--kpi" key={i} />
        ))}
      </div>
      <div className="sk sk--grafico" style={{ marginTop: 24 }} />
    </div>
  );
}

/* --------------------------------------------------------------------- KPI */
function Kpi({ rotulo, valor, nota, icone: Icone, explicacao, rotuloExplicacao, destaque }) {
  return (
    <article className={`kpi${destaque ? " kpi--destaque" : ""}`}>
      <div className="kpi__topo">
        <p className="kpi__rotulo">{rotulo}</p>
        <span className="kpi__icones">
          {explicacao ? <Explicacao rotulo={rotuloExplicacao}>{explicacao}</Explicacao> : null}
          {Icone && <Icone size={16} className="kpi__icone" aria-hidden="true" />}
        </span>
      </div>
      <p className="kpi__valor numero">{valor}</p>
      <p className="kpi__nota">{nota}</p>
    </article>
  );
}

/* ------------------------------------------------------------- Estado vazio */
function Vazio({ icone: Icone = Inbox, children }) {
  return (
    <div className="vazio">
      <Icone size={30} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function corGrafico(tema) {
  return tema === "claro"
    ? { grade: "rgba(28,31,58,0.08)", eixo: "#5d6180", fundo: "#ffffff", borda: "rgba(28,31,58,0.14)", texto: "#1c1f3a" }
    : { grade: "rgba(240,236,246,0.08)", eixo: "#b4b7cc", fundo: "#12142A", borda: "rgba(232,217,239,0.16)", texto: "#F0ECF6" };
}

/* ----------------------------------------------------------- Visão geral */
export function VisaoGeral({ resumo, grupos, t, aoAbrirGrupo }) {
  const { tema } = useTema();
  const cores = corGrafico(tema);
  const dados = grupos
    .filter((g) => !g.mascarado && g.indiceLikert != null)
    .map((g) => ({ codigo: g.codigo, nome: g.nome, indice: g.indiceLikert, nivel: g.nivelRisco }))
    .sort((a, b) => b.indice - a.indice);
  const ocultos = grupos.filter((g) => g.mascarado);
  const dist = resumo.distribuicao ?? { alto: 0, moderado: 0, baixo: 0 };
  const totalDist = (dist.alto ?? 0) + (dist.moderado ?? 0) + (dist.baixo ?? 0);
  const fmt = (v) => formatarIndice(v, t.locale);

  return (
    <>
      <div className="grade grade--4">
        <Kpi rotulo={t.kpi.respostas} valor={resumo.totalRespostas} nota={t.kpi.respostasNota} icone={MessageSquare} />
        <Kpi
          rotulo={t.kpi.indice}
          valor={fmt(resumo.indiceGeral)}
          nota={t.kpi.indiceNota}
          icone={TrendingUp}
          explicacao={t.explica.indiceGeral}
          rotuloExplicacao={t.oQueE}
          destaque
        />
        <Kpi rotulo={t.kpi.avaliados} valor={resumo.ghesAvaliados} nota={t.kpi.avaliadosNota(resumo.ghesVisiveis)} icone={Users} />
        <Kpi
          rotulo={t.kpi.protegidos}
          valor={resumo.ghesMascarados}
          nota={t.kpi.protegidosNota}
          icone={ShieldOff}
          explicacao={t.explica.protegidos}
          rotuloExplicacao={t.oQueE}
        />
      </div>

      {totalDist > 0 ? (
        <div className="distribuicao" aria-label={t.distribuicao}>
          <p className="distribuicao__rotulo">{t.distribuicao}</p>
          <div className="distribuicao__barra">
            {["alto", "moderado", "baixo"].map((n) =>
              dist[n] ? (
                <span key={n} className={`distribuicao__seg distribuicao__seg--${n}`} style={{ flex: dist[n] }}>
                  {dist[n]} · {t.nivel[n]}
                </span>
              ) : null
            )}
          </div>
        </div>
      ) : null}

      <div className="superficie grafico-bloco">
        <h2 className="secao-titulo">
          <TrendingUp size={18} aria-hidden="true" /> {t.indicePorGrupo}
        </h2>
        <p className="aviso secao-lead">{t.indicePorGrupoLead}</p>

        {dados.length === 0 ? (
          <Vazio icone={ShieldOff}>{t.nenhumLiberado}</Vazio>
        ) : (
          <>
            <ol className="risco-ranking">
              {dados.map((item, indice) => (
                <li key={item.codigo}>
                  <button type="button" className="risco-ranking__item risco-ranking__item--botao" onClick={() => aoAbrirGrupo?.(item.codigo)}>
                    <span className="risco-ranking__pos">{indice + 1}</span>
                    <div className="risco-ranking__corpo">
                      <div className="risco-ranking__topo">
                        <span className="risco-ranking__nome">{item.nome}</span>
                        <span className={`etiqueta etiqueta--${item.nivel}`}>{t.nivel[item.nivel] || item.nivel}</span>
                      </div>
                      <div className="barra" aria-hidden="true">
                        <div
                          className="barra__preenchimento"
                          style={{ width: `${Math.max(0, Math.min(100, item.indice))}%`, background: corDoNivel(item.nivel) }}
                        />
                      </div>
                    </div>
                    <span className="risco-ranking__valor numero">{fmt(item.indice)}</span>
                    <ChevronRight size={16} className="risco-ranking__seta" aria-hidden="true" />
                  </button>
                </li>
              ))}
              {ocultos.map((grupo) => (
                <li className="risco-ranking__item risco-ranking__item--oculto" key={grupo.codigo}>
                  <span className="risco-ranking__pos">–</span>
                  <div className="risco-ranking__corpo">
                    <span className="risco-ranking__nome">{grupo.nome}</span>
                    <span className="risco-ranking__oculto">{t.ocultoMenos5}</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="grafico-moldura" style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={dados} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={cores.grade} vertical={false} />
                  <XAxis dataKey="nome" tick={{ fill: cores.eixo, fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fill: cores.eixo, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(188,132,195,0.08)" }}
                    contentStyle={{ background: cores.fundo, border: `1px solid ${cores.borda}`, borderRadius: 10, color: cores.texto, fontSize: 13 }}
                    formatter={(valor) => [fmt(valor), t.indice]}
                  />
                  <Bar dataKey="indice" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                    {dados.map((item) => (
                      <Cell key={item.codigo} fill={corDoNivel(item.nivel)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grafico-legenda">
              <span>
                <i style={{ background: "var(--verde)" }} /> {t.nivel.baixo}
              </span>
              <span>
                <i style={{ background: "var(--ambar)" }} /> {t.nivel.moderado}
              </span>
              <span>
                <i style={{ background: "var(--perigo)" }} /> {t.nivel.alto}
              </span>
            </div>
            <p className="aviso" style={{ marginTop: 12 }}>
              {t.rodapeVisao}
            </p>
          </>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------- Grupos */
const PESO_NIVEL = { alto: 3, moderado: 2, baixo: 1 };

export function Grupos({ grupos, t, idioma, destaque, planoPorGrupo, aoVerPlano }) {
  const [filtro, setFiltro] = useState("todos");
  const [ordem, setOrdem] = useState("risco");
  const refs = useRef({});
  const fmt = (v) => formatarIndice(v, t.locale);

  useEffect(() => {
    if (!destaque) return;
    setFiltro("todos");
    const alvo = refs.current[destaque];
    if (alvo) window.setTimeout(() => alvo.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }, [destaque]);

  const contagem = useMemo(
    () => ({
      todos: grupos.length,
      alto: grupos.filter((g) => g.nivelRisco === "alto").length,
      moderado: grupos.filter((g) => g.nivelRisco === "moderado").length,
      baixo: grupos.filter((g) => g.nivelRisco === "baixo").length,
      ocultos: grupos.filter((g) => g.mascarado).length,
    }),
    [grupos]
  );

  const lista = useMemo(() => {
    const filtrados = grupos.filter((g) => {
      if (filtro === "todos") return true;
      if (filtro === "ocultos") return g.mascarado;
      return g.nivelRisco === filtro;
    });
    return [...filtrados].sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, t.locale);
      if (a.mascarado !== b.mascarado) return a.mascarado ? 1 : -1;
      return (PESO_NIVEL[b.nivelRisco] ?? 0) - (PESO_NIVEL[a.nivelRisco] ?? 0) || (b.indiceLikert ?? 0) - (a.indiceLikert ?? 0);
    });
  }, [grupos, filtro, ordem, t.locale]);

  const filtros = [
    ["todos", t.filtroTodos],
    ["alto", t.nivel.alto],
    ["moderado", t.nivel.moderado],
    ["baixo", t.nivel.baixo],
    ["ocultos", t.filtroOcultos],
  ];

  return (
    <div className="superficie">
      <h2 className="secao-titulo">
        <Users size={18} aria-hidden="true" /> {t.gruposTitulo}
      </h2>
      <p className="aviso secao-lead">{t.gruposLead}</p>

      <div className="filtros">
        <div className="filtros__chips" role="group" aria-label={t.filtroTodos}>
          {filtros.map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              className={`chip-filtro chip-filtro--${id}${filtro === id ? " chip-filtro--ativo" : ""}`}
              aria-pressed={filtro === id}
              onClick={() => setFiltro(id)}
              disabled={id !== "todos" && contagem[id] === 0}
            >
              {rotulo} <span className="chip-filtro__n">{contagem[id]}</span>
            </button>
          ))}
        </div>
        <label className="filtros__ordem">
          <span>{t.ordenar}</span>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
            <option value="risco">{t.ordemRisco}</option>
            <option value="nome">{t.ordemNome}</option>
          </select>
        </label>
      </div>

      {lista.length === 0 ? (
        <Vazio icone={Users}>{t.nenhumFiltro}</Vazio>
      ) : (
        <div className="grupos-grade">
          {lista.map((grupo) => (
            <article
              className={`grupo grupo--cartao${grupo.mascarado ? " grupo--oculto" : ""}${destaque === grupo.codigo ? " grupo--destaque" : ""}`}
              key={grupo.codigo}
              ref={(el) => {
                refs.current[grupo.codigo] = el;
              }}
            >
              <div className="grupo__cabecalho">
                <div>
                  <p className="grupo__nome">{grupo.nome}</p>
                  <p className="grupo__setor">
                    {grupo.setor} · {t.respostas(grupo.nRespostas)}
                  </p>
                </div>
                <span className={`etiqueta etiqueta--${grupo.mascarado ? "mascarado" : grupo.nivelRisco}`}>
                  {grupo.mascarado ? t.suprimido : t.nivel[grupo.nivelRisco]}
                </span>
              </div>

              {grupo.mascarado ? (
                <p className="aviso">{t.suprimidoTexto}</p>
              ) : (
                <>
                  <div className="barra">
                    <div className="barra__preenchimento" style={{ width: `${grupo.indiceLikert}%`, background: corDoNivel(grupo.nivelRisco) }} />
                  </div>
                  <div className="metricas-linha">
                    <span>
                      {t.escala}: <span className="mono">{fmt(grupo.indiceLikert)}</span>
                    </span>
                    <span>
                      {t.texto}: <span className="mono">{fmt(grupo.indiceTexto)}</span>
                    </span>
                    <span className="metricas-linha__div">
                      {t.divergencia}: <span className="mono" style={{ color: "var(--roxo)" }}>{fmt(grupo.divergencia)}</span>
                      <Explicacao rotulo={t.oQueE}>{t.explica.divergencia}</Explicacao>
                    </span>
                  </div>
                  <p className="grupo__fatores-rotulo">{t.fatoresPrincipais}</p>
                  <div className="fatores">
                    {grupo.fatores.map((fator) => (
                      <span className="fator" key={fator.bloco}>
                        {traduzirDimensao(fator.dimensao, idioma)} · <span className="mono">{fmt(fator.indice)}</span>
                      </span>
                    ))}
                  </div>
                  {planoPorGrupo?.has(grupo.nome) ? (
                    <button type="button" className="link-acao" onClick={() => aoVerPlano?.()}>
                      {t.verPlano} <ArrowUpRight size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- O Revelador */
function ParRevelador({ rotulo, valor, cor, locale }) {
  return (
    <div className="revelador__par">
      <span style={{ color: "var(--ardosia)" }}>{rotulo}</span>
      <div className="barra">
        <div className="barra__preenchimento" style={{ width: `${valor}%`, background: cor }} />
      </div>
      <span className="mono">{formatarIndice(valor, locale)}</span>
    </div>
  );
}

export function Revelador({ itens, t }) {
  return (
    <div className="superficie">
      <h2 className="secao-titulo">
        <Sparkles size={18} aria-hidden="true" /> {t.secoes.revelador}
        <Explicacao rotulo={t.oQueE}>{t.explica.revelador}</Explicacao>
      </h2>
      <p className="aviso secao-lead">{t.reveladorLead}</p>

      {itens.length === 0 ? (
        <Vazio icone={MessageSquareText}>{t.reveladorVazio}</Vazio>
      ) : (
        itens.map((item) => (
          <div className={`revelador${Math.abs(item.divergencia) >= 12 ? " revelador--destaque" : ""}`} key={item.grupo}>
            <div className="grupo__cabecalho">
              <p className="grupo__nome">{item.grupo}</p>
              <span className="revelador__delta">
                {item.divergencia > 0 ? "+" : ""}
                {formatarIndice(item.divergencia, t.locale)}
              </span>
            </div>
            <ParRevelador rotulo={t.escala} valor={item.indiceLikert} cor="var(--ardosia)" locale={t.locale} />
            <ParRevelador rotulo={t.textoLivre} valor={item.indiceTexto} cor="var(--roxo)" locale={t.locale} />
            <p className="revelador__leitura">{item.divergencia > 0 ? t.leituraMais : t.leituraMenos}</p>
          </div>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------- Conformidade */
export function Conformidade({ conformidade, t }) {
  const feitos = conformidade.itens.filter((i) => i.atendido).length;
  return (
    <div className="superficie">
      <h2 className="secao-titulo">
        <ShieldCheck size={18} aria-hidden="true" /> {t.conformidadeTitulo}
      </h2>
      <div className="conformidade-progresso" aria-hidden="true">
        <span style={{ width: `${(feitos / conformidade.itens.length) * 100}%` }} />
      </div>
      <p className="aviso secao-lead">
        {feitos}/{conformidade.itens.length} · {t.atendido}
      </p>
      <ul className="lista-check">
        {conformidade.itens.map((item, i) => (
          <li className="lista-check__item" key={item.rotulo}>
            <span className={`lista-check__icone${item.atendido ? " lista-check__icone--ok" : " lista-check__icone--pendente"}`} aria-hidden="true">
              {item.atendido ? <CheckCircle2 size={16} color="var(--verde)" /> : <Circle size={16} color="var(--ambar)" />}
            </span>
            <span>{t.conformidadeItens[i] ?? item.rotulo}</span>
            <span className="lista-check__status">{item.atendido ? t.atendido : t.pendente}</span>
          </li>
        ))}
      </ul>
      <p className="aviso" style={{ marginTop: 14 }}>
        {t.conformidadeRodape(conformidade.nMinimo)}
      </p>
    </div>
  );
}

/* --------------------------------------------------------- Plano de ação */
export function PlanoAcao({ acoes, t, idioma }) {
  return (
    <div className="superficie">
      <h2 className="secao-titulo">
        <ClipboardList size={18} aria-hidden="true" /> {t.planoTitulo}
      </h2>
      <p className="aviso secao-lead">{t.planoLead}</p>

      {acoes.length === 0 ? (
        <Vazio icone={CheckCircle2}>{t.planoVazio}</Vazio>
      ) : (
        <div className="plano-lista">
          {acoes.map((acao) => (
            <div className={`plano-item plano-item--${acao.prioridade === "alta" ? "alta" : "media"}`} key={`${acao.grupo}-${acao.dimensao}`}>
              <div className="grupo__cabecalho">
                <div>
                  <p className="grupo__nome">{acao.grupo}</p>
                  <p className="grupo__setor">{traduzirDimensao(acao.dimensao, idioma)}</p>
                </div>
                <span className={`etiqueta etiqueta--${acao.prioridade === "alta" ? "alto" : "moderado"}`}>
                  {t.prioridade[acao.prioridade] ?? acao.prioridade}
                </span>
              </div>
              <p className="plano-item__acao">{traduzirAcao(acao.acao, idioma)}</p>
              <p className="plano-item__status">
                <Lock size={13} aria-hidden="true" /> {t.status}: {t.statusAcao}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------- Capital em risco (pago) */
export function CapitalRisco({ bloqueado, dados, carregando, erro, t }) {
  const c = t.capital;
  const brl = (valor) =>
    new Intl.NumberFormat(t.locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(valor) || 0);

  if (bloqueado) {
    return (
      <div className="superficie capital-teaser">
        <h2 className="secao-titulo">
          <Lock size={18} aria-hidden="true" /> {c.titulo}
        </h2>
        <div className="vazio">
          <Lock size={30} aria-hidden="true" />
          <p>{c.bloqueado}</p>
          <p>{c.bloqueado2}</p>
        </div>
      </div>
    );
  }

  if (carregando) return <PainelSkeleton />;
  if (erro) {
    return (
      <div className="superficie">
        <p className="erro" role="alert">
          {erro}
        </p>
      </div>
    );
  }
  if (!dados) return null;

  const maximo = Math.max(...(dados.setores ?? []).map((item) => Number(item.perda_mensal) || 0), 1);
  return (
    <div>
      <div className="grade grade--3" style={{ marginBottom: 20 }}>
        <Kpi rotulo={c.perdaMensal} valor={brl(dados.perda_mensal_total)} nota={c.perdaMensalNota} icone={Banknote} destaque />
        <Kpi rotulo={c.perdaAnual} valor={brl(dados.perda_anual_total)} nota={c.perdaAnualNota(dados.total_afetados)} icone={TrendingUp} />
        <Kpi rotulo={c.setores} valor={String(dados.setores?.length ?? 0)} nota={c.setoresNota(dados.ghes_omitidos_mascarados)} icone={Users} />
      </div>

      <div className="superficie">
        <h2 className="secao-titulo">
          <Banknote size={18} aria-hidden="true" /> {c.porSetor}
        </h2>
        <p className="aviso secao-lead">{c.aviso ?? dados.disclaimer}</p>
        {(dados.setores ?? []).length === 0 ? (
          <Vazio icone={Inbox}>{c.vazio}</Vazio>
        ) : (
          (dados.setores ?? []).map((setor) => (
            <div className="grupo grupo--cartao" key={setor.setor}>
              <div className="grupo__cabecalho">
                <div>
                  <p className="grupo__nome">{setor.setor}</p>
                  <p className="grupo__setor">{c.grupos(setor.ghes, setor.afetados)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="numero" style={{ margin: 0, fontSize: 18 }}>
                    {brl(setor.perda_mensal)}
                    {c.mes}
                  </p>
                  <p className="aviso" style={{ margin: 0 }}>
                    {brl(setor.perda_anual)}
                    {c.ano}
                  </p>
                </div>
              </div>
              <div className="barra" aria-hidden="true">
                <div
                  className="barra__preenchimento"
                  style={{ width: `${Math.max(4, (Number(setor.perda_mensal) / maximo) * 100)}%`, background: "var(--roxo)" }}
                />
              </div>
            </div>
          ))
        )}
        <p className="aviso" style={{ marginTop: 12 }}>
          {c.metodo ?? dados.metodo ?? c.referencia(dados.porte, dados.atuacao)} · <span className="mono">{dados.versao_estimativa}</span>
        </p>
      </div>
    </div>
  );
}
