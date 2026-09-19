// Psyra AI — telas do painel. Sprint: S6 | Risco: R2.
// Guardrail de interface: grupo mascarado nunca renderiza número, barra ou nível.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Info,
  Users,
  Sparkles,
  ShieldCheck,
  ClipboardList,
  MessageSquare,
  ShieldOff,
  CheckCircle2,
  Circle,
  Inbox,
  MessageSquareText,
  TrendingUp,
  Banknote,
  Lock,
} from "lucide-react";

import { corDoNivel, formatarIndice } from "../lib/adaptadores";

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

/* -------------------------------------------------------------------- Selo */
export function Selo({ selo }) {
  if (!selo.provisorio) return null;
  return (
    <div className="selo" role="note">
      <Info size={17} aria-hidden="true" />
      <span>
        <strong>Dados provisórios.</strong> {selo.aviso}
        <br />
        <span className="mono" style={{ fontSize: 12 }}>
          motor: {selo.motor} · origem: {selo.origemDados}
        </span>
      </span>
    </div>
  );
}

/* --------------------------------------------------------------------- KPI */
function Kpi({ rotulo, valor, nota, icone: Icone }) {
  return (
    <article className="kpi">
      <div className="kpi__topo">
        <p className="kpi__rotulo">{rotulo}</p>
        {Icone && <Icone size={16} className="kpi__icone" aria-hidden="true" />}
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

/* ----------------------------------------------------------- Visão geral */
export function VisaoGeral({ resumo, grupos }) {
  const dados = grupos
    .filter((g) => !g.mascarado)
    .map((g) => ({ nome: g.codigo, indice: g.indiceLikert, nivel: g.nivelRisco }));

  return (
    <>
      <div className="grade grade--4">
        <Kpi rotulo="Respostas recebidas" valor={resumo.totalRespostas} nota="anônimas, agregadas por grupo" icone={MessageSquare} />
        <Kpi rotulo="Índice geral" valor={formatarIndice(resumo.indiceGeral)} nota="0 a 100 · maior = mais exposição" icone={TrendingUp} />
        <Kpi rotulo="Grupos avaliados" valor={resumo.ghesAvaliados} nota={`${resumo.ghesVisiveis} com resultado liberado`} icone={Users} />
        <Kpi rotulo="Grupos protegidos" valor={resumo.ghesMascarados} nota="n < 5 · resultado suprimido" icone={ShieldOff} />
      </div>

      <div className="superficie grafico-bloco">
        <h2 className="secao-titulo">
          <TrendingUp size={18} aria-hidden="true" /> Índice de risco por grupo
        </h2>
        <p className="aviso secao-lead">Comparativo dos grupos com resultado liberado (n ≥ 5).</p>

        {dados.length === 0 ? (
          <Vazio icone={ShieldOff}>
            Nenhum grupo atingiu o mínimo de 5 respostas neste ciclo. Nada é exibido para impedir a reidentificação.
          </Vazio>
        ) : (
          <>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={dados} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(240,236,246,0.08)" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fill: "#7F83A0", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#7F83A0", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(188,132,195,0.08)" }}
                    contentStyle={{ background: "#12142A", border: "1px solid rgba(232,217,239,0.16)", borderRadius: 10, color: "#F0ECF6", fontSize: 13 }}
                    formatter={(valor) => [formatarIndice(valor), "Índice"]}
                  />
                  <Bar dataKey="indice" radius={[6, 6, 0, 0]}>
                    {dados.map((item) => (
                      <Cell key={item.nome} fill={corDoNivel(item.nivel)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grafico-legenda">
              <span><i style={{ background: "var(--verde)" }} /> Baixo</span>
              <span><i style={{ background: "var(--ambar)" }} /> Moderado</span>
              <span><i style={{ background: "var(--perigo)" }} /> Alto</span>
            </div>
            <p className="aviso" style={{ marginTop: 12 }}>
              Só entram grupos com pelo menos 5 respostas. Grupos menores ficam de fora para impedir a reidentificação de quem respondeu.
            </p>
          </>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------- Grupos */
export function Grupos({ grupos }) {
  return (
    <div className="superficie">
      <h2 className="secao-titulo">
        <Users size={18} aria-hidden="true" /> Riscos por grupo homogêneo de exposição
      </h2>
      <p className="aviso secao-lead">
        As dimensões listadas são os fatores que mais pesaram no índice do grupo. Na versão com modelo treinado, esta lista passa a vir do SHAP.
      </p>

      {grupos.map((grupo) => (
        <div className="grupo" key={grupo.codigo}>
          <div className="grupo__cabecalho">
            <div>
              <p className="grupo__nome">{grupo.nome}</p>
              <p className="grupo__setor">
                {grupo.setor} · {grupo.nRespostas} resposta{grupo.nRespostas === 1 ? "" : "s"}
              </p>
            </div>
            <span className={`etiqueta etiqueta--${grupo.mascarado ? "mascarado" : grupo.nivelRisco}`}>
              {grupo.mascarado ? "Resultado suprimido" : grupo.nivelRisco}
            </span>
          </div>

          {grupo.mascarado ? (
            <p className="aviso">
              Este grupo tem menos de 5 respostas. Nenhum índice é exibido enquanto o mínimo não for atingido.
            </p>
          ) : (
            <>
              <div className="barra">
                <div className="barra__preenchimento" style={{ width: `${grupo.indiceLikert}%`, background: corDoNivel(grupo.nivelRisco) }} />
              </div>
              <div className="metricas-linha">
                <span>Escala: <span className="mono">{formatarIndice(grupo.indiceLikert)}</span></span>
                <span>Texto: <span className="mono">{formatarIndice(grupo.indiceTexto)}</span></span>
                <span>Divergência: <span className="mono" style={{ color: "var(--roxo)" }}>{formatarIndice(grupo.divergencia)}</span></span>
              </div>
              <div className="fatores">
                {grupo.fatores.map((fator) => (
                  <span className="fator" key={fator.bloco}>
                    {fator.dimensao} · <span className="mono">{formatarIndice(fator.indice)}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------- O Revelador */
function ParRevelador({ rotulo, valor, cor }) {
  return (
    <div className="revelador__par">
      <span style={{ color: "var(--ardosia)" }}>{rotulo}</span>
      <div className="barra">
        <div className="barra__preenchimento" style={{ width: `${valor}%`, background: cor }} />
      </div>
      <span className="mono">{formatarIndice(valor)}</span>
    </div>
  );
}

export function Revelador({ itens }) {
  return (
    <div className="superficie">
      <h2 className="secao-titulo">
        <Sparkles size={18} aria-hidden="true" /> O Revelador
      </h2>
      <p className="aviso secao-lead">
        Diferença entre o que o grupo marcou na escala e o que escreveu com as próprias palavras. É aqui que o questionário tradicional costuma ficar cego.
      </p>

      {itens.length === 0 ? (
        <Vazio icone={MessageSquareText}>
          Nenhuma divergência relevante neste ciclo. O que as pessoas marcaram e o que escreveram está contando a mesma história.
        </Vazio>
      ) : (
        itens.map((item) => (
          <div className="revelador" key={item.grupo}>
            <div className="grupo__cabecalho">
              <p className="grupo__nome">{item.grupo}</p>
              <span className="revelador__delta">
                {item.divergencia > 0 ? "+" : ""}
                {formatarIndice(item.divergencia)}
              </span>
            </div>
            <ParRevelador rotulo="Escala" valor={item.indiceLikert} cor="var(--ardosia)" />
            <ParRevelador rotulo="Texto livre" valor={item.indiceTexto} cor="var(--roxo)" />
            <p className="revelador__leitura">{item.leitura}</p>
          </div>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------- Conformidade */
export function Conformidade({ conformidade }) {
  return (
    <div className="superficie">
      <h2 className="secao-titulo">
        <ShieldCheck size={18} aria-hidden="true" /> Conformidade NR-1 e LGPD
      </h2>
      <ul className="lista-check">
        {conformidade.itens.map((item) => (
          <li className="lista-check__item" key={item.rotulo}>
            <span
              className="lista-check__icone"
              style={{ background: item.atendido ? "rgba(91,191,138,0.14)" : "rgba(217,162,78,0.14)" }}
              aria-hidden="true"
            >
              {item.atendido ? (
                <CheckCircle2 size={16} color="var(--verde)" />
              ) : (
                <Circle size={16} color="var(--ambar)" />
              )}
            </span>
            <span>{item.rotulo}</span>
            <span className="lista-check__status">{item.atendido ? "atendido" : "pendente"}</span>
          </li>
        ))}
      </ul>
      <p className="aviso" style={{ marginTop: 14 }}>
        Mínimo de {conformidade.nMinimo} respostas por grupo para liberar resultado. {conformidade.observacao}
      </p>
    </div>
  );
}

/* --------------------------------------------------------- Plano de ação */
export function PlanoAcao({ acoes }) {
  return (
    <div className="superficie">
      <h2 className="secao-titulo">
        <ClipboardList size={18} aria-hidden="true" /> Plano de ação (insumo para o PGR)
      </h2>
      <p className="aviso secao-lead">
        Sugestões geradas a partir da dimensão dominante de cada grupo. O documento do PGR só é emitido após revisão e assinatura da psicóloga responsável.
      </p>

      {acoes.length === 0 ? (
        <Vazio icone={CheckCircle2}>Nenhum grupo em risco moderado ou alto neste ciclo.</Vazio>
      ) : (
        acoes.map((acao) => (
          <div className="grupo" key={`${acao.grupo}-${acao.dimensao}`}>
            <div className="grupo__cabecalho">
              <div>
                <p className="grupo__nome">{acao.grupo}</p>
                <p className="grupo__setor">{acao.dimensao}</p>
              </div>
              <span className={`etiqueta etiqueta--${acao.prioridade === "alta" ? "alto" : "moderado"}`}>
                prioridade {acao.prioridade}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>{acao.acao}</p>
            <p className="aviso">Status: {acao.status}</p>
          </div>
        ))
      )}
    </div>
  );
}

function formatarBrl(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);
}

/* --------------------------------------------- Capital em risco (pago) */
export function CapitalRisco({ bloqueado, dados, carregando, erro }) {
  if (bloqueado) {
    return (
      <div className="superficie capital-teaser">
        <h2 className="secao-titulo">
          <Lock size={18} aria-hidden="true" /> Capital em risco
        </h2>
        <div className="vazio">
          <Lock size={30} aria-hidden="true" />
          <p>
            Estimativa de capital em risco por setor disponível no plano{" "}
            <strong>Padrão</strong> ou <strong>Panorama</strong>.
          </p>
          <p>
            Mostre ao empresário, por setor, a ordem de grandeza do que a exposição
            psicossocial pode custar — com base em efetivo, porte e atuação.
          </p>
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

  return (
    <div>
      <div className="grade grade--3" style={{ marginBottom: 20 }}>
        <Kpi
          rotulo="Perda mensal estimada"
          valor={formatarBrl(dados.perda_mensal_total)}
          nota="Soma dos setores visíveis"
          icone={Banknote}
        />
        <Kpi
          rotulo="Perda anual estimada"
          valor={formatarBrl(dados.perda_anual_total)}
          nota={`${dados.total_afetados} pessoas consideradas`}
          icone={TrendingUp}
        />
        <Kpi
          rotulo="Setores com sinal"
          valor={String(dados.setores?.length ?? 0)}
          nota={`${dados.ghes_omitidos_mascarados} grupo(s) ocultos (k-anonimato)`}
          icone={Users}
        />
      </div>

      <div className="superficie">
        <h2 className="secao-titulo">
          <Banknote size={18} aria-hidden="true" /> Por setor
        </h2>
        <p className="aviso secao-lead">{dados.disclaimer}</p>
        {(dados.setores ?? []).length === 0 ? (
          <Vazio icone={Inbox}>
            Nenhum grupo com n suficiente para estimar capital neste ciclo.
          </Vazio>
        ) : (
          (dados.setores ?? []).map((setor) => (
            <div className="grupo" key={setor.setor}>
              <div className="grupo__cabecalho">
                <div>
                  <p className="grupo__nome">{setor.setor}</p>
                  <p className="grupo__setor">
                    {setor.ghes} grupo(s) · {setor.afetados} afetado(s) est.
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="numero" style={{ margin: 0, fontSize: 18 }}>
                    {formatarBrl(setor.perda_mensal)}/mês
                  </p>
                  <p className="aviso" style={{ margin: 0 }}>
                    {formatarBrl(setor.perda_anual)}/ano
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <p className="aviso" style={{ marginTop: 12 }}>
          Referência: porte {dados.porte} · atuação {dados.atuacao} ·{" "}
          <span className="mono">{dados.versao_estimativa}</span>
        </p>
      </div>
    </div>
  );
}
