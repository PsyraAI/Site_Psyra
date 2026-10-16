// Qualidade da coleta: participação, evasão, pressa, atenção e ritmo por parte.
// Sprint: S10 | Risco: R2 — tudo agregado; contagens de sinalizadas só em grupos com n ≥ 5.

import { Activity, AlertTriangle, BookOpen, Clock3, Gauge, LogIn, ShieldAlert, Timer, Users } from "lucide-react";

function pct(v, locale) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(v);
}

function Kpi({ icone: Icone, rotulo, valor, nota, alerta }) {
  return (
    <article className={`kpi${alerta ? " kpi--alerta" : ""}`}>
      <div className="kpi__topo">
        <p className="kpi__rotulo">{rotulo}</p>
        <span className="kpi__icones">
          <Icone size={16} className="kpi__icone" aria-hidden="true" />
        </span>
      </div>
      <p className="kpi__valor numero">{valor}</p>
      <p className="kpi__nota">{nota}</p>
    </article>
  );
}

export default function QualidadeColeta({ dados, carregando, erro, tq, locale }) {
  if (erro) {
    return (
      <div className="superficie">
        <p className="erro" role="alert">
          {erro}
        </p>
      </div>
    );
  }
  if (carregando || !dados) {
    return (
      <div className="superficie">
        <p className="aviso">{tq.carregando}</p>
      </div>
    );
  }
  const r = dados.resumo;
  if (!r.respostas) {
    return (
      <div className="superficie">
        <h2 className="secao-titulo">{tq.secao}</h2>
        <p className="aviso">{tq.semDados}</p>
      </div>
    );
  }
  const maxRitmo = Math.max(dados.seg_por_item_min * 2, ...dados.ritmo_por_parte.map((p) => p.seg_por_item));
  const baixaParticipacao = r.participacao !== null && r.participacao < 0.5;

  return (
    <div className="qualidade">
      <div className="superficie">
        <h2 className="secao-titulo">
          <Gauge size={18} aria-hidden="true" /> {tq.secao}
        </h2>
        <p className="aviso secao-lead">{tq.lead}</p>
        <div className="grade grade--4">
          <Kpi
            icone={Users}
            rotulo={tq.participacao}
            valor={pct(r.participacao, locale)}
            nota={r.efetivo ? tq.participacaoNota(r.respostas, r.efetivo) : "—"}
            alerta={baixaParticipacao}
          />
          <Kpi
            icone={LogIn}
            rotulo={tq.conclusao}
            valor={pct(r.conclusao, locale)}
            nota={r.abriram ? tq.conclusaoNota(r.abriram) : tq.semInicio}
          />
          <Kpi
            icone={ShieldAlert}
            rotulo={tq.sinalizadas}
            valor={r.sinalizadas === null ? "—" : String(r.sinalizadas)}
            nota={tq.sinalizadasNota(r.fora_do_calculo)}
          />
          <Kpi icone={Timer} rotulo={tq.tempo} valor={r.tempo_mediano_min ? tq.min(r.tempo_mediano_min) : "—"} nota={tq.tempoNota} />
        </div>
        <p className="qualidade__referencia">
          <BookOpen size={14} aria-hidden="true" /> {tq.referencia}
        </p>
        <p className="qualidade__politica">
          <ShieldAlert size={14} aria-hidden="true" /> {r.excluir_sinalizadas ? tq.politicaOn : tq.politicaOff}
        </p>
      </div>

      <div className="superficie">
        <h2 className="secao-titulo">
          <Users size={18} aria-hidden="true" /> {tq.porGrupo}
        </h2>
        <div className="tabela-rolagem">
          <table className="tabela qualidade__tabela">
            <thead>
              <tr>
                <th scope="col">{tq.col.grupo}</th>
                <th scope="col" className="num">{tq.col.pessoas}</th>
                <th scope="col" className="num">{tq.col.comecaram}</th>
                <th scope="col" className="num">{tq.col.responderam}</th>
                <th scope="col">{tq.col.participacao}</th>
                <th scope="col" className="num">{tq.col.terminaram}</th>
                <th scope="col">{tq.col.sinal}</th>
              </tr>
            </thead>
            <tbody>
              {dados.grupos.map((g) => (
                <tr key={g.codigo}>
                  <th scope="row">
                    {g.nome}
                    <span className="config__email">{g.setor}</span>
                  </th>
                  <td className="num mono">{g.efetivo || "—"}</td>
                  <td className="num mono">{g.comecaram ?? "—"}</td>
                  <td className="num mono">{g.respostas}</td>
                  <td>
                    <div className="qualidade__part">
                      <div className="barra" aria-hidden="true">
                        <div
                          className={`barra__preenchimento${g.participacao !== null && g.participacao < 0.5 ? " barra__preenchimento--baixa" : ""}`}
                          style={{ width: `${Math.min(100, (g.participacao ?? 0) * 100)}%` }}
                        />
                      </div>
                      <span className="mono">{pct(g.participacao, locale)}</span>
                    </div>
                  </td>
                  <td className="num mono">{pct(g.conclusao, locale)}</td>
                  <td>
                    {g.mascarado ? (
                      <span className="qualidade__oculto">
                        {tq.oculto} · {tq.faltam(g.faltam_para_5)}
                      </span>
                    ) : g.sinalizadas ? (
                      <span className="qualidade__motivos">
                        <b className="mono">{g.sinalizadas}</b>
                        {Object.entries(g.motivos)
                          .filter(([, n]) => n)
                          .map(([m, n]) => (
                            <span key={m} className={`qualidade__motivo qualidade__motivo--${m}`}>
                              {tq.motivos[m]} {n > 1 ? `×${n}` : ""}
                            </span>
                          ))}
                      </span>
                    ) : (
                      <span className="mono">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="qualidade__legenda">
          {Object.entries(tq.motivosLongo).map(([m, texto]) => (
            <li key={m}>
              <span className={`qualidade__motivo qualidade__motivo--${m}`}>{tq.motivos[m]}</span> {texto}
            </li>
          ))}
        </ul>
      </div>

      <div className="superficie">
        <h2 className="secao-titulo">
          <Activity size={18} aria-hidden="true" /> {tq.ritmoTitulo}
        </h2>
        <p className="aviso secao-lead">{tq.ritmoLead}</p>
        {dados.ritmo_por_parte.length ? (
          <div className="ritmo" role="img" aria-label={tq.ritmoTitulo}>
            <div className="ritmo__area" aria-hidden="true">
              <div className="ritmo__linha" style={{ bottom: `${(dados.seg_por_item_min / maxRitmo) * 100}%` }}>
                <span>{tq.linha}</span>
              </div>
            </div>
            {dados.ritmo_por_parte.map((p) => {
              const altura = `${(p.seg_por_item / maxRitmo) * 100}%`;
              return (
                <div className="ritmo__coluna" key={p.parte}>
                  <span className="ritmo__valor mono" style={{ bottom: `calc(${altura} + 4px)` }}>
                    {Number(p.seg_por_item).toFixed(1).replace(".", locale.startsWith("pt") ? "," : ".")}
                  </span>
                  <div className="ritmo__barra" style={{ height: altura }} />
                  <span className="ritmo__rotulo">{p.parte}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="aviso">{tq.semRitmo}</p>
        )}
        <p className="ritmo__eixo">
          <Clock3 size={13} aria-hidden="true" /> {tq.segItem} · {tq.parte("1–10")}
        </p>
      </div>

      <div className="superficie">
        <h2 className="secao-titulo">
          <AlertTriangle size={18} aria-hidden="true" /> {tq.comoTitulo}
        </h2>
        <div className="qualidade__como">
          {tq.como.map(([titulo, texto]) => (
            <div key={titulo} className="qualidade__como-item">
              <b>{titulo}</b>
              <p>{texto}</p>
            </div>
          ))}
        </div>
        <div className="qualidade__simulado">
          <p className="qualidade__simulado-titulo">{tq.simuladoTitulo}</p>
          <div className="qualidade__simulado-grade">
            {tq.simulado.map(([v, texto]) => (
              <div key={v}>
                <b className="mono">{v}</b>
                <span>{texto}</span>
              </div>
            ))}
          </div>
          <p className="campo__nota">{tq.simuladoNota}</p>
        </div>
        <details className="qualidade__fontes">
          <summary>{tq.fontes}</summary>
          <ul>
            {(tq.fontesLista ?? dados.referencias).map((ref) => (
              <li key={ref}>{ref}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
