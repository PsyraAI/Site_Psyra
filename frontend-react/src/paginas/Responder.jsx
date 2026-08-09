// Psyra AI — questionário anônimo. Sprint: S6 | Risco: R2.
// Rota pública: sem login, sem nome, sem qualquer identificador do respondente.

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../lib/api";

export default function Responder() {
  const { token = "demo-nr1-2026" } = useParams();

  const [dados, setDados] = useState(null);
  const [ghe, setGhe] = useState("");
  const [respostas, setRespostas] = useState({});
  const [texto, setTexto] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [protocolo, setProtocolo] = useState(null);

  useEffect(() => {
    api
      .formularioPublico(token)
      .then((corpo) => {
        setDados(corpo);
        if (corpo.ghes.length) setGhe(corpo.ghes[0].codigo);
      })
      .catch((falha) => setErro(falha.message));
  }, [token]);

  const totalItens = useMemo(
    () =>
      dados
        ? dados.instrumento.blocos.reduce((soma, bloco) => soma + bloco.itens.length, 0)
        : 0,
    [dados]
  );
  const respondidas = Object.keys(respostas).length;

  async function enviar() {
    setErro("");
    if (!aceite) {
      setErro("Marque a caixa de participação para enviar.");
      return;
    }
    if (respondidas < totalItens) {
      setErro(`Faltam ${totalItens - respondidas} item(ns) sem resposta.`);
      return;
    }
    setEnviando(true);
    try {
      const retorno = await api.enviarResposta({
        token_coleta: token,
        ghe_codigo: ghe,
        likert: respostas,
        texto_livre: texto.trim() || null,
        consentimento: true,
      });
      setProtocolo(retorno.protocolo);
      window.scrollTo({ top: 0 });
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  if (protocolo) {
    return (
      <main className="container responder-shell">
        <div className="superficie">
          <h1 className="secao-titulo">Resposta registrada</h1>
          <p className="aviso secao-lead">
            Obrigado por participar. Sua resposta é anônima e será analisada apenas
            junto com as do seu grupo, nunca separadamente.
          </p>
          <p className="mono" style={{ fontSize: 14, color: "var(--roxo)", margin: 0 }}>
            Protocolo {protocolo}
          </p>
        </div>
      </main>
    );
  }

  if (!dados) {
    return (
      <main className="container responder-shell">
        <div className="superficie">{erro || "Carregando o questionário…"}</div>
      </main>
    );
  }

  const { instrumento, coleta, ghes } = dados;

  return (
    <>
      <header className="topo">
        <div className="marca">
          <span className="marca__psi" aria-hidden="true">
            Ψ
          </span>
          <span className="marca__nome">Psyra AI</span>
        </div>
        <span className="topo__meta">Resposta anônima</span>
      </header>

      <main className="container responder-shell">
        <p className="painel-cabecalho__eyebrow">Questionário anônimo</p>
        <h1 className="secao-titulo" style={{ fontSize: "var(--fs-titulo)" }}>
          {coleta.titulo}
        </h1>
        <p className="aviso" style={{ marginTop: 8 }}>
          {coleta.empresa} · escala de 1 a 5
        </p>

        <div className="superficie" style={{ margin: "22px 0" }}>
          <h2 className="secao-titulo" style={{ fontSize: "1.05rem" }}>
            Antes de começar
          </h2>
          <p className="aviso">{instrumento.consentimento}</p>
          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              marginTop: 12,
              fontSize: 14,
            }}
          >
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
              style={{ width: "auto", marginTop: 3 }}
            />
            <span>Li as informações acima e concordo em participar.</span>
          </label>
        </div>

        <div className="campo">
          <label htmlFor="ghe">Seu grupo de trabalho</label>
          <select id="ghe" value={ghe} onChange={(e) => setGhe(e.target.value)}>
            {ghes.map((grupo) => (
              <option value={grupo.codigo} key={grupo.codigo}>
                {grupo.nome}
              </option>
            ))}
          </select>
        </div>

        {instrumento.blocos.map((bloco) => (
          <section className="bloco" key={bloco.codigo}>
            <div className="bloco__titulo">
              <span className="bloco__letra">Bloco {bloco.codigo}</span>
              <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{bloco.dimensao}</h2>
            </div>
            {bloco.itens.map((item, indice) => {
              const id = `${bloco.codigo}${indice + 1}`;
              const textoItem = typeof item === "string" ? item : item.texto;
              return (
                <div className="item" key={id}>
                  <p className="item__texto">
                    <span className="mono" style={{ color: "var(--roxo)" }}>
                      {id}
                    </span>{" "}
                    {textoItem}
                  </p>
                  <div className="escala">
                    {instrumento.escala.rotulos.map((rotulo, posicao) => (
                      <label key={rotulo}>
                        <input
                          type="radio"
                          name={id}
                          value={posicao + 1}
                          checked={respostas[id] === posicao + 1}
                          onChange={() =>
                            setRespostas((atual) => ({ ...atual, [id]: posicao + 1 }))
                          }
                        />
                        <span>
                          {posicao + 1} · {rotulo}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        ))}

        <div className="superficie" style={{ marginTop: 20 }}>
          <h2 className="secao-titulo" style={{ fontSize: "1.05rem" }}>
            Bloco K — suas palavras
          </h2>
          <p className="aviso">{instrumento.bloco_texto_livre.pergunta}</p>
          <textarea
            placeholder="Opcional"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <p className="aviso">{instrumento.bloco_texto_livre.aviso}</p>
        </div>

        <div className="progresso">
          <p className="erro" role="alert">
            {erro}
          </p>
          <button
            className="botao"
            type="button"
            style={{ width: "100%" }}
            onClick={enviar}
            disabled={enviando}
          >
            {enviando ? "Enviando…" : "Enviar respostas"}
          </button>
          <p className="aviso" style={{ textAlign: "center", marginTop: 8 }}>
            {respondidas} de {totalItens} itens respondidos
          </p>
        </div>
      </main>
    </>
  );
}
