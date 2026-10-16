// Psyra AI — questionário anônimo do colaborador, dentro do site. Sprint: S10 | Risco: R2.
// Rota pública: sem login, sem nome, sem identificador do respondente. Substitui o Google Forms:
// a resposta vai direto para a API da Psyra, que anonimiza o texto antes de gravar (fail-closed).
// Nada é guardado no navegador: se a aba fechar antes do envio, as respostas se perdem.
// Em pt-BR: o instrumento foi escrito e será validado em português.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  EyeOff,
  Lock,
  Pencil,
  Send,
  ShieldCheck,
  Users,
  Coffee,
  Hourglass,
} from "lucide-react";

import { api, ErroApi } from "../lib/api";
import MarcaLogo from "../componentes/MarcaLogo";
import AlternarTema from "../componentes/AlternarTema";

const LIMITE_TEXTO = 4000;

function itensDoBloco(bloco) {
  return bloco.itens.map((item, indice) => ({
    id: `${bloco.codigo}${indice + 1}`,
    texto: typeof item === "string" ? item : item.texto,
  }));
}

function Topo({ progresso }) {
  return (
    <header className="rq-topo">
      <div className="rq-topo__marca">
        <MarcaLogo className="marca__logo" size={36} />
        <span className="marca__nome">Psyra AI</span>
      </div>
      <div className="rq-topo__dir">
        <span className="rq-topo__selo">
          <Lock size={13} aria-hidden="true" /> Resposta anônima
        </span>
        <AlternarTema />
      </div>
      {progresso != null ? (
        <div
          className="rq-progresso"
          role="progressbar"
          aria-label="Progresso do questionário"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progresso)}
        >
          <span style={{ width: `${progresso}%` }} />
        </div>
      ) : null}
    </header>
  );
}

function Mensagem({ titulo, texto }) {
  return (
    <>
      <Topo />
      <main className="rq-pagina">
        <section className="rq-cartao rq-cartao--centro">
          <h1 className="rq-titulo">{titulo}</h1>
          <p className="rq-lead">{texto}</p>
        </section>
      </main>
    </>
  );
}

function Escala({ id, valor, rotulos, aoEscolher }) {
  return (
    <>
    <div className="rq-escala" role="radiogroup" aria-labelledby={`${id}-texto`}>
      {rotulos.map((rotulo, posicao) => {
        const nota = posicao + 1;
        const marcado = valor === nota;
        return (
          <button
            key={rotulo}
            type="button"
            role="radio"
            aria-checked={marcado}
            className={`rq-opcao${marcado ? " rq-opcao--marcada" : ""}`}
            onClick={() => aoEscolher(nota)}
          >
            <span className="rq-opcao__nota">{nota}</span>
            <span className="rq-opcao__rotulo">{rotulo}</span>
          </button>
        );
      })}
    </div>
    {/* no celular os rótulos das opções somem; a legenda mostra a escolha ou as pontas da escala */}
    <p className="rq-escala__legenda" aria-hidden="true">
      {valor ? (
        <b>
          {valor} · {rotulos[valor - 1]}
        </b>
      ) : (
        <>
          <span>1 · {rotulos[0]}</span>
          <span>
            {rotulos.length} · {rotulos[rotulos.length - 1]}
          </span>
        </>
      )}
    </p>
    </>
  );
}

export default function Responder() {
  const { token } = useParams();

  const [dados, setDados] = useState(null);
  const [falha, setFalha] = useState(null);
  const [etapa, setEtapa] = useState("inicio"); // inicio | grupo | bloco | texto | revisao | enviado
  const [indiceBloco, setIndiceBloco] = useState(0);
  const [aceite, setAceite] = useState(false);
  const [ghe, setGhe] = useState("");
  const [respostas, setRespostas] = useState({});
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [protocolo, setProtocolo] = useState(null);
  const [pressa, setPressa] = useState(null);
  const refs = useRef({});
  const tempos = useRef([]);
  const inicioParte = useRef(null);
  const contou = useRef({ inicio: false, grupo: false });

  useEffect(() => {
    if (!token) {
      setFalha("sem-token");
      return;
    }
    api
      .formularioPublico(token)
      .then(setDados)
      .catch((e) => {
        if (e instanceof ErroApi && e.status === 410) setFalha("encerrada");
        else if (e instanceof ErroApi && e.status === 404) setFalha("invalido");
        else setFalha("rede");
      });
  }, [token]);

  const blocos = useMemo(() => (dados ? dados.instrumento.blocos : []), [dados]);
  const totalItens = useMemo(() => blocos.reduce((s, b) => s + b.itens.length, 0), [blocos]);
  const respondidas = Object.keys(respostas).length;
  const progresso = totalItens ? (respondidas / totalItens) * 100 : 0;

  // ao trocar de etapa, volta ao topo (a página é longa no celular)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [etapa, indiceBloco]);

  useEffect(() => {
    if (etapa !== "bloco" || !blocos.length) return undefined;
    if (tempos.current.length !== blocos.length) tempos.current = blocos.map(() => 0);
    const i = indiceBloco;
    inicioParte.current = { i, t: performance.now() };
    return () => {
      tempos.current[i] += (performance.now() - inicioParte.current.t) / 1000;
      inicioParte.current = null;
    };
  }, [etapa, indiceBloco, blocos]);

  const segundosNaParte = (i) =>
    (tempos.current[i] ?? 0) + (inicioParte.current?.i === i ? (performance.now() - inicioParte.current.t) / 1000 : 0);

  const responder = useCallback(
    (bloco, itemId, nota) => {
      setRespostas((atual) => ({ ...atual, [itemId]: nota }));
      setErro("");
      // leva o foco para o próximo item ainda sem resposta do mesmo bloco
      const ids = itensDoBloco(bloco).map((i) => i.id);
      const proximo = ids.slice(ids.indexOf(itemId) + 1).find((id) => !(id in respostas) && id !== itemId);
      if (proximo && refs.current[proximo]) {
        window.setTimeout(() => {
          refs.current[proximo]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 140);
      }
    },
    [respostas]
  );

  async function enviar() {
    setErro("");
    setEnviando(true);
    try {
      const retorno = await api.enviarResposta({
        token_coleta: token,
        ghe_codigo: ghe,
        likert: respostas,
        texto_livre: texto.trim() || null,
        consentimento: true,
        tempos_partes: tempos.current.length === blocos.length ? tempos.current.map((x) => Math.min(3600, Math.round(x))) : null,
      });
      setProtocolo(retorno.protocolo);
      setEtapa("enviado");
    } catch (e) {
      setErro(
        e instanceof ErroApi && e.status === 422
          ? "Não conseguimos proteger o texto escrito e, por segurança, a resposta não foi gravada. Tire nomes ou números do texto e tente de novo."
          : e.message
      );
    } finally {
      setEnviando(false);
    }
  }

  if (falha === "sem-token" || falha === "invalido") {
    return <Mensagem titulo="Link inválido" texto="Este link de questionário não existe. Confira o endereço que a sua empresa enviou." />;
  }
  if (falha === "encerrada") {
    return <Mensagem titulo="Este ciclo foi encerrado" texto="O questionário não recebe mais respostas. Obrigado pelo interesse em participar." />;
  }
  if (falha === "rede") {
    return <Mensagem titulo="Sem conexão com o servidor" texto="Não foi possível carregar o questionário. Verifique a internet e recarregue a página." />;
  }
  if (!dados) {
    return (
      <>
        <Topo />
        <main className="rq-pagina" aria-busy="true">
          <div className="rq-cartao">
            <div className="sk sk--linha" style={{ width: "40%" }} />
            <div className="sk sk--linha" style={{ width: "80%", marginTop: 16, height: 28 }} />
            <div className="sk sk--linha" style={{ width: "65%", marginTop: 16 }} />
          </div>
        </main>
      </>
    );
  }

  const { instrumento, coleta, ghes } = dados;
  const rotulos = instrumento.escala.rotulos;
  const grupoEscolhido = ghes.find((g) => g.codigo === ghe);

  /* ------------------------------------------------------------ enviado */
  if (etapa === "enviado") {
    return (
      <>
        <Topo />
        <main className="rq-pagina">
          <section className="rq-cartao rq-cartao--centro rq-sucesso">
            <div className="rq-sucesso__icone">
              <CheckCircle2 size={44} aria-hidden="true" />
            </div>
            <h1 className="rq-titulo">Resposta registrada</h1>
            <p className="rq-lead">
              Obrigado por participar. Sua resposta é anônima e será analisada só junto com as do seu grupo, nunca separadamente.
            </p>
            <p className="rq-protocolo">
              Protocolo <span className="mono">{protocolo}</span>
            </p>
            <p className="rq-nota">Você já pode fechar esta página.</p>
          </section>
        </main>
      </>
    );
  }

  /* ------------------------------------------------------------- início */
  if (etapa === "inicio") {
    return (
      <>
        <Topo />
        <main className="rq-pagina">
          <section className="rq-cartao rq-inicio">
            <p className="rq-eyebrow">Questionário anônimo · {coleta.empresa}</p>
            <h1 className="rq-titulo rq-titulo--grande">{coleta.titulo}</h1>
            <p className="rq-lead">
              Queremos entender como está o trabalho no seu dia a dia. Responda com sinceridade: não existe resposta certa ou errada.
            </p>
            <ul className="rq-garantias">
              <li>
                <Lock size={18} aria-hidden="true" />
                <span>
                  <b>Anônimo de verdade.</b> Sem login e sem nome. Ninguém da empresa vê a sua resposta.
                </span>
              </li>
              <li>
                <Users size={18} aria-hidden="true" />
                <span>
                  <b>Só por grupo.</b> O resultado aparece apenas para grupos com 5 ou mais respostas.
                </span>
              </li>
              <li>
                <EyeOff size={18} aria-hidden="true" />
                <span>
                  <b>Texto protegido.</b> Antes de gravar, uma anonimização automática apaga nomes, CPF, e-mails e telefones. Mesmo assim, evite escrever nomes.
                </span>
              </li>
            </ul>
            <p className="rq-meta">
              <Clock size={15} aria-hidden="true" /> {totalItens} perguntas em {blocos.length} partes · cerca de 8 minutos · você pode voltar e mudar respostas
            </p>
            <div className="rq-consentimento">
              <p>{instrumento.consentimento}</p>
              <label className="rq-check">
                <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
                <span>Li e concordo em participar.</span>
              </label>
              <Link className="rq-link" to="/privacidade" target="_blank" rel="noreferrer">
                Como a Psyra trata os dados
              </Link>
            </div>
            <div className="rq-acoes">
              <button
                className="botao rq-botao"
                type="button"
                disabled={!aceite}
                onClick={() => {
                  if (!contou.current.inicio) {
                    contou.current.inicio = true;
                    api.registrarInicio(token, "inicio");
                  }
                  setEtapa("grupo");
                }}
              >
                Começar <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* -------------------------------------------------------------- grupo */
  if (etapa === "grupo") {
    return (
      <>
        <Topo progresso={0} />
        <main className="rq-pagina">
          <section className="rq-cartao">
            <p className="rq-eyebrow">Antes das perguntas</p>
            <h1 className="rq-titulo">Em qual grupo você trabalha?</h1>
            <p className="rq-lead">O grupo serve só para juntar as respostas. Escolha o que descreve melhor o seu trabalho.</p>
            <div className="rq-grupos" role="radiogroup" aria-label="Grupo de trabalho">
              {ghes.map((g) => (
                <button
                  key={g.codigo}
                  type="button"
                  role="radio"
                  aria-checked={ghe === g.codigo}
                  className={`rq-grupo${ghe === g.codigo ? " rq-grupo--marcado" : ""}`}
                  onClick={() => setGhe(g.codigo)}
                >
                  <span className="rq-grupo__marca" aria-hidden="true">
                    {ghe === g.codigo ? <Check size={14} /> : null}
                  </span>
                  <span>
                    <b>{g.nome}</b>
                    {g.setor ? <small>{g.setor}</small> : null}
                  </span>
                </button>
              ))}
            </div>
            <div className="rq-acoes rq-acoes--entre">
              <button className="botao botao--fantasma" type="button" onClick={() => setEtapa("inicio")}>
                <ArrowLeft size={16} aria-hidden="true" /> Voltar
              </button>
              <button
                className="botao rq-botao"
                type="button"
                disabled={!ghe}
                onClick={() => {
                  if (!contou.current.grupo) {
                    contou.current.grupo = true;
                    api.registrarInicio(token, "grupo", ghe);
                  }
                  setIndiceBloco(0);
                  setEtapa("bloco");
                }}
              >
                Continuar <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* -------------------------------------------------------------- bloco */
  if (etapa === "bloco") {
    const bloco = blocos[indiceBloco];
    const itens = itensDoBloco(bloco);
    const faltam = itens.filter((i) => !(i.id in respostas)).length;
    const ultimo = indiceBloco === blocos.length - 1;
    return (
      <>
        <Topo progresso={progresso} />
        <main className="rq-pagina">
          <div className="rq-passos" aria-label={`Parte ${indiceBloco + 1} de ${blocos.length}`}>
            {blocos.map((b, i) => {
              const feito = itensDoBloco(b).every((it) => it.id in respostas);
              return (
                <span
                  key={b.codigo}
                  className={`rq-passo${i === indiceBloco ? " rq-passo--atual" : ""}${feito ? " rq-passo--feito" : ""}`}
                  aria-hidden="true"
                />
              );
            })}
          </div>
          <section className="rq-cartao">
            <p className="rq-eyebrow">
              Parte {indiceBloco + 1} de {blocos.length}
            </p>
            {indiceBloco === Math.floor(blocos.length / 2) ? (
              <p className="rq-pausa" role="status">
                <Coffee size={16} aria-hidden="true" /> Metade feita. Se precisar, faça uma pausa: suas respostas ficam guardadas enquanto esta página estiver aberta.
              </p>
            ) : null}
            <h1 className="rq-titulo">{bloco.dimensao}</h1>
            <p className="rq-lead">Pense nas últimas semanas de trabalho. Toque na opção que mais combina com você.</p>

            <ol className="rq-itens">
              {itens.map((item, i) => (
                <li
                  key={item.id}
                  className={`rq-item${item.id in respostas ? " rq-item--feito" : ""}`}
                  ref={(el) => {
                    refs.current[item.id] = el;
                  }}
                  tabIndex={-1}
                  onKeyDown={(evento) => {
                    const n = Number(evento.key);
                    if (n >= 1 && n <= rotulos.length) responder(bloco, item.id, n);
                  }}
                >
                  <p className="rq-item__texto" id={`${item.id}-texto`}>
                    <span className="rq-item__num">{i + 1}</span>
                    {item.texto}
                  </p>
                  <Escala id={item.id} valor={respostas[item.id]} rotulos={rotulos} aoEscolher={(n) => responder(bloco, item.id, n)} />
                </li>
              ))}
            </ol>

            <p className="erro" role="alert">
              {erro}
            </p>
            {pressa === indiceBloco ? (
              <p className="rq-pressa" role="status">
                <Hourglass size={16} aria-hidden="true" /> Você respondeu esta parte bem rápido. Se quiser, leia as frases de novo; se estiver tudo certo, toque em Continuar.
              </p>
            ) : null}
            <div className="rq-acoes rq-acoes--entre">
              <button
                className="botao botao--fantasma"
                type="button"
                onClick={() => (indiceBloco === 0 ? setEtapa("grupo") : setIndiceBloco(indiceBloco - 1))}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Voltar
              </button>
              <div className="rq-acoes__dir">
                {faltam > 0 ? <span className="rq-faltam">{faltam === 1 ? "Falta 1 pergunta nesta parte" : `Faltam ${faltam} perguntas nesta parte`}</span> : null}
                <button
                  className="botao rq-botao"
                  type="button"
                  onClick={() => {
                    if (faltam > 0) {
                      setErro(faltam === 1 ? "Responda a pergunta que falta nesta parte para continuar." : `Responda as ${faltam} perguntas que faltam nesta parte para continuar.`);
                      const pendente = itens.find((it) => !(it.id in respostas));
                      refs.current[pendente.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
                      return;
                    }
                    setErro("");
                    if (pressa !== indiceBloco && segundosNaParte(indiceBloco) < 2 * itens.length) {
                      setPressa(indiceBloco);
                      return;
                    }
                    setPressa(null);
                    if (ultimo) setEtapa("texto");
                    else setIndiceBloco(indiceBloco + 1);
                  }}
                >
                  Continuar <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
          <p className="rq-rodape">
            {respondidas} de {totalItens} respondidas · atalho: teclas 1 a 5 na pergunta selecionada
          </p>
        </main>
      </>
    );
  }

  /* -------------------------------------------------------------- texto */
  if (etapa === "texto") {
    return (
      <>
        <Topo progresso={100} />
        <main className="rq-pagina">
          <section className="rq-cartao">
            <p className="rq-eyebrow">Última parte · opcional</p>
            <h1 className="rq-titulo">Com as suas palavras</h1>
            <p className="rq-lead">{instrumento.bloco_texto_livre.pergunta}</p>
            <label className="sr-only" htmlFor="rq-texto">
              Seu texto (opcional)
            </label>
            <textarea
              id="rq-texto"
              className="rq-texto"
              rows={7}
              maxLength={LIMITE_TEXTO}
              placeholder="Escreva aqui, se quiser"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <div className="rq-texto__rodape">
              <span>
                <ShieldCheck size={14} aria-hidden="true" /> {instrumento.bloco_texto_livre.aviso}
              </span>
              <span className="mono">
                {texto.length}/{LIMITE_TEXTO}
              </span>
            </div>
            <div className="rq-acoes rq-acoes--entre">
              <button
                className="botao botao--fantasma"
                type="button"
                onClick={() => {
                  setIndiceBloco(blocos.length - 1);
                  setEtapa("bloco");
                }}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Voltar
              </button>
              <button className="botao rq-botao" type="button" onClick={() => setEtapa("revisao")}>
                Revisar e enviar <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  /* ------------------------------------------------------------ revisão */
  return (
    <>
      <Topo progresso={100} />
      <main className="rq-pagina">
        <section className="rq-cartao">
          <p className="rq-eyebrow">Tudo certo?</p>
          <h1 className="rq-titulo">Revise antes de enviar</h1>
          <p className="rq-lead">Depois de enviada, a resposta não pode ser alterada, porque não guardamos nada que ligue a resposta a você.</p>
          <ul className="rq-revisao">
            <li>
              <span>Grupo</span>
              <b>{grupoEscolhido?.nome}</b>
              <button type="button" className="rq-editar" onClick={() => setEtapa("grupo")}>
                <Pencil size={14} aria-hidden="true" /> Mudar
              </button>
            </li>
            {blocos.map((b, i) => {
              const its = itensDoBloco(b);
              const feitas = its.filter((it) => it.id in respostas).length;
              return (
                <li key={b.codigo}>
                  <span>Parte {i + 1}</span>
                  <b>
                    {b.dimensao}{" "}
                    <small className={feitas === its.length ? "ok" : "erro"}>
                      {feitas}/{its.length}
                    </small>
                  </b>
                  <button
                    type="button"
                    className="rq-editar"
                    onClick={() => {
                      setIndiceBloco(i);
                      setEtapa("bloco");
                    }}
                  >
                    <Pencil size={14} aria-hidden="true" /> Rever
                  </button>
                </li>
              );
            })}
            <li>
              <span>Texto</span>
              <b>{texto.trim() ? `${texto.trim().slice(0, 90)}${texto.trim().length > 90 ? "…" : ""}` : "Sem texto (opcional)"}</b>
              <button type="button" className="rq-editar" onClick={() => setEtapa("texto")}>
                <Pencil size={14} aria-hidden="true" /> Editar
              </button>
            </li>
          </ul>
          <p className="erro" role="alert">
            {erro}
          </p>
          <div className="rq-acoes rq-acoes--entre">
            <button className="botao botao--fantasma" type="button" onClick={() => setEtapa("texto")}>
              <ArrowLeft size={16} aria-hidden="true" /> Voltar
            </button>
            <button className="botao rq-botao" type="button" onClick={enviar} disabled={enviando || respondidas < totalItens}>
              {enviando ? "Enviando…" : "Enviar respostas"} <Send size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
