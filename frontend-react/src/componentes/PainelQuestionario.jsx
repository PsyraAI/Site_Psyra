// Psyra AI — seção "Questionário" do painel: link anônimo do ciclo, QR code, progresso por grupo.
// Substitui a integração com o Google Forms: a coleta acontece dentro do site. Sprint: S10 | Risco: R2

import { useCallback, useState } from "react";
import { Check, Copy, ExternalLink, Info, Lock, Megaphone, Share2, ShieldCheck, StopCircle, Users } from "lucide-react";

import QrCodigo from "./QrCodigo";
import Dialogo from "./Dialogo";

const N_MINIMO = 5;

export default function PainelQuestionario({ t, coleta, ghes, grupos, aoEncerrar, encerrando }) {
  const q = t.q;
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  const url = coleta ? `${window.location.origin}/responder/${coleta.token_publico}` : "";
  const aberta = coleta?.status === "aberta";

  const copiar = useCallback(async () => {
    setErro("");
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      setErro(t.erroCopiar);
    }
  }, [url, t.erroCopiar]);

  const compartilhar = useCallback(async () => {
    try {
      await navigator.share({ title: coleta.titulo, url });
    } catch {
      /* o usuário cancelou ou o navegador não suporta */
    }
  }, [coleta, url]);

  const porCodigo = new Map((grupos ?? []).map((g) => [g.codigo, g.nRespostas]));
  const linhas = (ghes ?? []).map((g) => ({ ...g, n: porCodigo.get(g.codigo) ?? 0 }));
  const total = linhas.reduce((s, g) => s + g.n, 0);

  if (!coleta) return null;

  return (
    <div className="questionario">
      <section className="superficie questionario__link">
        <div className="questionario__texto">
          <h2 className="secao-titulo">
            <Lock size={18} aria-hidden="true" /> {q.titulo}
          </h2>
          <p className="aviso secao-lead">{q.lead}</p>

          <p className="questionario__rotulo">{q.link}</p>
          <div className="link-coleta__linha">
            <code className="link-coleta__url" title={url}>
              {url}
            </code>
          </div>
          <div className="link-coleta__acoes">
            <button className="botao botao--pequeno" type="button" onClick={copiar} disabled={!aberta}>
              {copiado ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              {copiado ? q.copiado : q.copiar}
            </button>
            <a className="botao botao--fantasma botao--pequeno" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={15} aria-hidden="true" /> {q.abrir}
            </a>
            {typeof navigator !== "undefined" && navigator.share ? (
              <button className="botao botao--fantasma botao--pequeno" type="button" onClick={compartilhar} disabled={!aberta}>
                <Share2 size={15} aria-hidden="true" /> {q.compartilhar}
              </button>
            ) : null}
            {aberta ? (
              <button className="botao botao--fantasma botao--pequeno botao--perigo-suave" type="button" onClick={() => setConfirmar(true)}>
                <StopCircle size={15} aria-hidden="true" /> {q.encerrar}
              </button>
            ) : null}
          </div>
          {erro ? (
            <p className="erro" role="alert">
              {erro}
            </p>
          ) : null}
          {!aberta ? (
            <p className="questionario__encerrada">
              <Info size={15} aria-hidden="true" /> {q.encerrada}
            </p>
          ) : null}
          <p className="questionario__instrumento">{q.instrumento}</p>
        </div>
        <figure className={`questionario__qr${aberta ? "" : " questionario__qr--off"}`}>
          <QrCodigo valor={url} rotulo={q.qr} />
          <figcaption>{q.qrDica}</figcaption>
        </figure>
      </section>

      <section className="superficie">
        <h2 className="secao-titulo">
          <Users size={18} aria-hidden="true" /> {q.progressoTitulo}
        </h2>
        <p className="aviso secao-lead">
          {q.progressoLead} <b className="questionario__total">{q.totalRecebidas(total)}</b>
        </p>
        <ul className="progresso-grupos">
          {linhas.map((g) => {
            const liberado = g.n >= N_MINIMO;
            return (
              <li key={g.codigo} className={liberado ? "progresso-grupos__item--ok" : ""}>
                <div className="progresso-grupos__topo">
                  <span className="progresso-grupos__nome">{g.nome}</span>
                  <span className="progresso-grupos__n">
                    {liberado ? (
                      <>
                        <Check size={14} aria-hidden="true" /> {t.respostas(g.n)} · {q.liberado}
                      </>
                    ) : (
                      <>
                        {g.n}/{N_MINIMO} · {q.faltam(N_MINIMO - g.n)}
                      </>
                    )}
                  </span>
                </div>
                <div className="barra" aria-hidden="true">
                  <div
                    className="barra__preenchimento"
                    style={{
                      width: `${Math.min(100, (g.n / N_MINIMO) * 100)}%`,
                      background: liberado ? "var(--verde)" : "var(--roxo)",
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grade grade--2">
        <section className="superficie">
          <h2 className="secao-titulo">
            <Megaphone size={18} aria-hidden="true" /> {q.comoTitulo}
          </h2>
          <ol className="lista-numerada">
            {q.como.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
        <section className="superficie">
          <h2 className="secao-titulo">
            <ShieldCheck size={18} aria-hidden="true" /> {q.segurancaTitulo}
          </h2>
          <ul className="lista-seguranca">
            {q.seguranca.map((item) => (
              <li key={item}>
                <Check size={15} aria-hidden="true" /> {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Dialogo
        aberto={confirmar}
        titulo={q.confirmarTitulo}
        aoFechar={() => setConfirmar(false)}
        rotuloFechar={t.fechar}
        acoes={
          <>
            <button className="botao botao--fantasma" type="button" onClick={() => setConfirmar(false)}>
              {t.cancelar}
            </button>
            <button
              className="botao botao--perigo-cheio"
              type="button"
              disabled={encerrando}
              onClick={async () => {
                await aoEncerrar();
                setConfirmar(false);
              }}
            >
              <StopCircle size={15} aria-hidden="true" /> {q.confirmar}
            </button>
          </>
        }
      >
        <p className="aviso">{q.confirmarTexto}</p>
      </Dialogo>
    </div>
  );
}
