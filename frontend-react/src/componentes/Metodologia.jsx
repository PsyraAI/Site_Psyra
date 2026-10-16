// "Como a Psyra calcula": do questionário ao plano de ação, e o que roda hoje × depois do piloto.
// Sprint: S10 | Risco: R1 — o painel usa motor de regra; o modelo treinado aparece com as métricas
// da base simulada, rotuladas como tal, e não é apresentado como o que roda hoje.

import { ArrowRight, BookOpenCheck, Cpu, FlaskConical } from "lucide-react";

export default function Metodologia({ tm, motor }) {
  return (
    <div className="metodo">
      <div className="superficie">
        <h2 className="secao-titulo">
          <BookOpenCheck size={18} aria-hidden="true" /> {tm.secao}
        </h2>
        <p className="aviso secao-lead">{tm.lead}</p>
        <ol className="metodo__passos">
          {tm.passos.map(([titulo, texto], i) => (
            <li key={titulo} className="metodo__passo">
              <span className="metodo__num mono">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <b>{titulo}</b>
                <p>{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="superficie">
        <h2 className="secao-titulo">
          <Cpu size={18} aria-hidden="true" /> {tm.hojeTitulo}
        </h2>
        <p className="aviso secao-lead">{tm.hojeLead}</p>
        <div className="tabela-rolagem">
          <table className="tabela metodo__tabela">
            <thead>
              <tr>
                <th scope="col">{tm.col.parte}</th>
                <th scope="col">{tm.col.hoje}</th>
                <th scope="col" aria-hidden="true" />
                <th scope="col">{tm.col.depois}</th>
              </tr>
            </thead>
            <tbody>
              {tm.linhas.map(([parte, hoje, depois]) => (
                <tr key={parte}>
                  <th scope="row">{parte}</th>
                  <td>{hoje}</td>
                  <td aria-hidden="true" className="metodo__seta">
                    <ArrowRight size={16} />
                  </td>
                  <td>
                    <b>{depois}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="campo__nota mono">{tm.motor(motor)}</p>
      </div>

      <div className="superficie metodo__modelo">
        <h2 className="secao-titulo">
          <FlaskConical size={18} aria-hidden="true" /> {tm.modeloTitulo}
        </h2>
        <p className="aviso secao-lead">{tm.modeloTexto}</p>
        <div className="grade grade--4">
          {tm.metricas.map(([valor, nome, texto]) => (
            <article key={nome} className="kpi">
              <p className="kpi__rotulo">{nome}</p>
              <p className="kpi__valor numero">{valor}</p>
              <p className="kpi__nota">{texto}</p>
            </article>
          ))}
        </div>
        <p className="campo__nota">{tm.metricasNota}</p>
      </div>
    </div>
  );
}
