// Configurações do painel: conta, segurança, aparência, empresa, equipe e privacidade.
// Sprint: S10 | Risco: R2 — nenhuma tela aqui mostra resposta de colaborador.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Check,
  Copy,
  KeyRound,
  Languages,
  LogOut,
  MonitorSmartphone,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";

import CampoSenha from "./CampoSenha";
import Dialogo from "./Dialogo";
import { useAuth } from "../contexto/Auth";
import { api } from "../lib/api";
import { useTema } from "../lib/tema";
import { IDIOMAS } from "../lib/idiomas";
import { formatarData } from "../lib/textosApp";

const ABAS = [
  { id: "conta", icone: UserRound },
  { id: "seguranca", icone: KeyRound },
  { id: "aparencia", icone: Palette },
  { id: "empresa", icone: Building2 },
  { id: "equipe", icone: Users, gestao: true },
  { id: "privacidade", icone: ShieldCheck },
];

function Aviso({ tipo = "ok", children }) {
  if (!children) return null;
  return (
    <p className={tipo === "erro" ? "erro" : "config__ok"} role={tipo === "erro" ? "alert" : "status"}>
      {tipo === "ok" ? <Check size={14} aria-hidden="true" /> : null} {children}
    </p>
  );
}

/* ------------------------------------------------------------------ Conta */
function AbaConta({ tc, idioma }) {
  const { usuario, atualizarSessao } = useAuth();
  const [nome, setNome] = useState(usuario.nome);
  const [estado, setEstado] = useState({ ok: "", erro: "", salvando: false });
  const salvar = async (evento) => {
    evento.preventDefault();
    setEstado({ ok: "", erro: "", salvando: true });
    try {
      const dados = await api.atualizarConta({ nome });
      atualizarSessao({ nome: dados.nome });
      setEstado({ ok: tc.config.salvo, erro: "", salvando: false });
    } catch (falha) {
      setEstado({ ok: "", erro: falha.message, salvando: false });
    }
  };
  return (
    <form className="config__cartao" onSubmit={salvar}>
      <div className="config__grade">
        <div className="campo">
          <label htmlFor="cfg-nome">{tc.config.conta.nome}</label>
          <input id="cfg-nome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="cfg-email">{tc.config.conta.email}</label>
          <input id="cfg-email" value={usuario.email ?? ""} readOnly aria-describedby="cfg-email-nota" />
          <p className="campo__nota" id="cfg-email-nota">
            {tc.config.conta.emailNota}
          </p>
        </div>
        <div className="config__dado">
          <span>{tc.config.conta.papel}</span>
          <b>{tc.menu.papeis[usuario.papel] ?? usuario.papel}</b>
        </div>
        {usuario.ultimo_acesso_em ? (
          <div className="config__dado">
            <span>{tc.config.conta.ultimo}</span>
            <b>{formatarData(usuario.ultimo_acesso_em, idioma)}</b>
          </div>
        ) : null}
      </div>
      <div className="config__acoes">
        <button className="botao botao--pequeno" type="submit" disabled={estado.salvando || nome.trim().length < 2 || nome === usuario.nome}>
          {estado.salvando ? tc.config.salvando : tc.config.salvar}
        </button>
        <Aviso>{estado.ok}</Aviso>
        <Aviso tipo="erro">{estado.erro}</Aviso>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------- Segurança */
function AbaSeguranca({ tc }) {
  const { atualizarSessao, sair } = useAuth();
  const s = tc.config.seguranca;
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [estado, setEstado] = useState({ ok: "", erro: "", salvando: false });
  const [confirmarSaida, setConfirmarSaida] = useState(false);

  const trocar = async (evento) => {
    evento.preventDefault();
    if (nova !== confirma) {
      setEstado({ ok: "", erro: s.naoConfere, salvando: false });
      return;
    }
    setEstado({ ok: "", erro: "", salvando: true });
    try {
      const dados = await api.trocarSenha(atual, nova);
      atualizarSessao({ ...dados, trocar_senha: false });
      setAtual("");
      setNova("");
      setConfirma("");
      setEstado({ ok: s.trocada, erro: "", salvando: false });
    } catch (falha) {
      setEstado({ ok: "", erro: falha.message, salvando: false });
    }
  };

  const sairDeTodos = async () => {
    try {
      await api.sairDeTodos();
    } finally {
      sair();
    }
  };

  return (
    <>
      <form className="config__cartao" onSubmit={trocar}>
        <h3 className="config__subtitulo">{s.senhaTitulo}</h3>
        <div className="config__grade config__grade--senha">
          <CampoSenha id="cfg-atual" rotulo={s.atual} valor={atual} aoMudar={setAtual} textos={tc.senha} />
          <CampoSenha id="cfg-nova" rotulo={s.nova} valor={nova} aoMudar={setNova} textos={tc.senha} autoComplete="new-password" mostrarForca />
          <CampoSenha id="cfg-confirma" rotulo={s.confirmar} valor={confirma} aoMudar={setConfirma} textos={tc.senha} autoComplete="new-password" />
        </div>
        <div className="config__acoes">
          <button className="botao botao--pequeno" type="submit" disabled={estado.salvando || !atual || !nova}>
            <KeyRound size={15} aria-hidden="true" /> {estado.salvando ? tc.config.salvando : s.trocar}
          </button>
          <Aviso>{estado.ok}</Aviso>
          <Aviso tipo="erro">{estado.erro}</Aviso>
        </div>
      </form>
      <div className="config__cartao">
        <h3 className="config__subtitulo">{s.sessoesTitulo}</h3>
        <p className="aviso">{s.sessoesTexto}</p>
        <button className="botao botao--fantasma botao--perigo-suave botao--pequeno" type="button" onClick={() => setConfirmarSaida(true)}>
          <MonitorSmartphone size={15} aria-hidden="true" /> {s.sairTodos}
        </button>
      </div>
      <Dialogo
        aberto={confirmarSaida}
        titulo={s.confirmarTitulo}
        aoFechar={() => setConfirmarSaida(false)}
        rotuloFechar={s.cancelar}
        acoes={
          <>
            <button className="botao botao--fantasma" type="button" onClick={() => setConfirmarSaida(false)}>
              {s.cancelar}
            </button>
            <button className="botao botao--perigo-cheio" type="button" onClick={sairDeTodos}>
              <LogOut size={15} aria-hidden="true" /> {s.confirmar2}
            </button>
          </>
        }
      >
        <p className="aviso" style={{ margin: 0 }}>
          {s.confirmarTexto}
        </p>
      </Dialogo>
    </>
  );
}

/* -------------------------------------------------------------- Aparência */
function AbaAparencia({ tc, idioma, aoTrocarIdioma }) {
  const { preferencia, definirPreferencia } = useTema();
  const a = tc.config.aparencia;
  const icones = { escuro: Moon, claro: Sun, sistema: MonitorSmartphone };
  return (
    <div className="config__cartao">
      <fieldset className="config__opcoes">
        <legend>{a.tema}</legend>
        <div className="config__opcoes-lista" role="radiogroup" aria-label={a.tema}>
          {["escuro", "claro", "sistema"].map((opcao) => {
            const Icone = icones[opcao];
            return (
              <label key={opcao} className={`config__opcao${preferencia === opcao ? " config__opcao--ativa" : ""}`}>
                <input type="radio" name="cfg-tema" value={opcao} checked={preferencia === opcao} onChange={() => definirPreferencia(opcao)} />
                <span className={`config__amostra config__amostra--${opcao}`} aria-hidden="true">
                  <Icone size={16} />
                </span>
                <span>{a.temas[opcao]}</span>
              </label>
            );
          })}
        </div>
        <p className="campo__nota">{a.temaNota}</p>
      </fieldset>
      <fieldset className="config__opcoes">
        <legend>{a.idioma}</legend>
        <div className="config__opcoes-lista" role="radiogroup" aria-label={a.idioma}>
          {Object.entries(IDIOMAS).map(([id, info]) => (
            <label key={id} className={`config__opcao${idioma === id ? " config__opcao--ativa" : ""}`}>
              <input type="radio" name="cfg-idioma" value={id} checked={idioma === id} onChange={() => aoTrocarIdioma(id)} />
              <span className="config__amostra" aria-hidden="true">
                <Languages size={16} />
              </span>
              <span>{info.nome}</span>
            </label>
          ))}
        </div>
        <p className="campo__nota">{a.idiomaNota}</p>
      </fieldset>
    </div>
  );
}

/* ---------------------------------------------------------------- Empresa */
function AbaEmpresa({ tc, empresaId, aoMudarPolitica }) {
  const e = tc.config.empresa;
  const [cfg, setCfg] = useState(null);
  const [rascunho, setRascunho] = useState(null);
  const [estado, setEstado] = useState({ ok: "", erro: "", salvando: false });

  useEffect(() => {
    api
      .configuracoes(empresaId)
      .then((dados) => {
        setCfg(dados);
        setRascunho(dados);
      })
      .catch((falha) => setEstado({ ok: "", erro: falha.message, salvando: false }));
  }, [empresaId]);

  const salvar = async (evento) => {
    evento.preventDefault();
    setEstado({ ok: "", erro: "", salvando: true });
    try {
      const dados = await api.salvarConfiguracoes(empresaId, {
        porte: rascunho.porte,
        atuacao: rascunho.atuacao,
        excluir_sinalizadas: rascunho.excluir_sinalizadas,
      });
      setCfg(dados);
      setRascunho(dados);
      aoMudarPolitica?.();
      setEstado({ ok: tc.config.salvo, erro: "", salvando: false });
    } catch (falha) {
      setEstado({ ok: "", erro: falha.message, salvando: false });
    }
  };

  if (!rascunho) return <div className="config__cartao">{estado.erro ? <Aviso tipo="erro">{estado.erro}</Aviso> : <span className="spinner" aria-hidden="true" />}</div>;
  const editar = rascunho.pode_editar;
  const mudou = cfg && (cfg.porte !== rascunho.porte || cfg.atuacao !== rascunho.atuacao || cfg.excluir_sinalizadas !== rascunho.excluir_sinalizadas);
  return (
    <form className="config__cartao" onSubmit={salvar}>
      <div className="config__grade">
        <div className="config__dado">
          <span>{e.razao}</span>
          <b>{rascunho.razao_social}</b>
        </div>
        <div className="config__dado">
          <span>{e.plano}</span>
          <b>{e.planos[rascunho.plano] ?? rascunho.plano}</b>
        </div>
        <div className="campo">
          <label htmlFor="cfg-porte">{e.porte}</label>
          <select id="cfg-porte" value={rascunho.porte} disabled={!editar} onChange={(ev) => setRascunho({ ...rascunho, porte: ev.target.value })}>
            {Object.entries(e.portes).map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="cfg-atuacao">{e.atuacao}</label>
          <select id="cfg-atuacao" value={rascunho.atuacao} disabled={!editar} onChange={(ev) => setRascunho({ ...rascunho, atuacao: ev.target.value })}>
            {Object.entries(e.atuacoes).map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
          <p className="campo__nota">{e.capitalNota}</p>
        </div>
      </div>

      <div className="config__bloco">
        <h3 className="config__subtitulo">{e.qualidadeTitulo}</h3>
        <p className="aviso">{e.qualidadeTexto}</p>
        <label className="config__chave">
          <input
            type="checkbox"
            role="switch"
            checked={rascunho.excluir_sinalizadas}
            disabled={!editar}
            onChange={(ev) => setRascunho({ ...rascunho, excluir_sinalizadas: ev.target.checked })}
          />
          <span className="config__chave-trilho" aria-hidden="true">
            <i />
          </span>
          <span>{e.excluir}</span>
        </label>
        <p className="campo__nota">{e.excluirNota}</p>
      </div>

      <div className="config__bloco config__bloco--k">
        <span className="config__k">n ≥ {rascunho.n_minimo}</span>
        <div>
          <h3 className="config__subtitulo">{e.kTitulo}</h3>
          <p className="aviso" style={{ margin: 0 }}>
            {e.kTexto(rascunho.n_minimo)}
          </p>
        </div>
      </div>

      {editar ? (
        <div className="config__acoes">
          <button className="botao botao--pequeno" type="submit" disabled={estado.salvando || !mudou}>
            {estado.salvando ? tc.config.salvando : tc.config.salvar}
          </button>
          <Aviso>{estado.ok}</Aviso>
          <Aviso tipo="erro">{estado.erro}</Aviso>
        </div>
      ) : (
        <p className="aviso">{tc.config.soLeitura}</p>
      )}
    </form>
  );
}

/* ----------------------------------------------------------------- Equipe */
function AbaEquipe({ tc, empresaId, idioma }) {
  const q = tc.config.equipe;
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ nome: "", email: "", papel: "gestor" });
  const [criando, setCriando] = useState(false);
  const [senha, setSenha] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(() => {
    api.equipe(empresaId).then(setLista).catch((falha) => setErro(falha.message));
  }, [empresaId]);
  useEffect(() => carregar(), [carregar]);

  const convidar = async (evento) => {
    evento.preventDefault();
    setErro("");
    setCriando(true);
    try {
      const dados = await api.convidar(empresaId, form);
      setSenha(dados);
      setForm({ nome: "", email: "", papel: "gestor" });
      carregar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCriando(false);
    }
  };

  const acesso = async (pessoa) => {
    setErro("");
    try {
      await api.acessoUsuario(empresaId, pessoa.id, !pessoa.ativo);
      carregar();
    } catch (falha) {
      setErro(falha.message);
    }
  };

  const novaSenha = async (pessoa) => {
    setErro("");
    try {
      setSenha(await api.senhaTemporaria(empresaId, pessoa.id));
      carregar();
    } catch (falha) {
      setErro(falha.message);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(senha.senha_temporaria);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <>
      <form className="config__cartao" onSubmit={convidar}>
        <h3 className="config__subtitulo">
          <UserPlus size={17} aria-hidden="true" /> {q.convidar}
        </h3>
        <p className="aviso">{q.lead}</p>
        <div className="config__grade config__grade--convite">
          <div className="campo">
            <label htmlFor="eq-nome">{q.nome}</label>
            <input id="eq-nome" value={form.nome} maxLength={120} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="eq-email">{q.email}</label>
            <input id="eq-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="eq-papel">{q.papel}</label>
            <select id="eq-papel" value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })}>
              {Object.entries(q.papeis).map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="campo__nota">{q.papelNota}</p>
        <div className="config__acoes">
          <button className="botao botao--pequeno" type="submit" disabled={criando || form.nome.trim().length < 2 || !form.email.includes("@")}>
            <UserPlus size={15} aria-hidden="true" /> {criando ? q.criando : q.criar}
          </button>
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      </form>

      <div className="config__cartao">
        <h3 className="config__subtitulo">{q.titulo}</h3>
        <div className="tabela-rolagem">
          <table className="tabela config__tabela">
            <thead>
              <tr>
                <th scope="col">{q.colNome}</th>
                <th scope="col">{q.colPapel}</th>
                <th scope="col">{q.colStatus}</th>
                <th scope="col">{q.colAcoes}</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((pessoa) => (
                <tr key={pessoa.id} className={pessoa.ativo ? "" : "config__linha--inativa"}>
                  <td>
                    <b>{pessoa.nome}</b> {pessoa.voce ? <span className="config__voce">{q.voce}</span> : null}
                    <span className="config__email">{pessoa.email}</span>
                  </td>
                  <td>{q.papeis[pessoa.papel] ?? pessoa.papel}</td>
                  <td>
                    <span className={`config__status config__status--${!pessoa.ativo ? "off" : pessoa.trocar_senha ? "espera" : "on"}`}>
                      {!pessoa.ativo ? q.inativo : pessoa.trocar_senha ? q.aguardando : q.ativo}
                    </span>
                    <span className="config__email">
                      {q.ultimo}: {pessoa.ultimo_acesso_em ? formatarData(pessoa.ultimo_acesso_em, idioma) : q.nunca}
                    </span>
                  </td>
                  <td>
                    {pessoa.voce ? null : (
                      <div className="config__botoes">
                        {pessoa.ativo ? (
                          <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => novaSenha(pessoa)}>
                            <KeyRound size={14} aria-hidden="true" /> {q.novaSenha}
                          </button>
                        ) : null}
                        <button type="button" className={`botao botao--fantasma botao--pequeno${pessoa.ativo ? " botao--perigo-suave" : ""}`} onClick={() => acesso(pessoa)}>
                          {pessoa.ativo ? q.desativar : q.ativar}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialogo
        aberto={Boolean(senha)}
        titulo={q.senhaTitulo}
        aoFechar={() => setSenha(null)}
        rotuloFechar={q.fechar}
        acoes={
          <button className="botao" type="button" onClick={() => setSenha(null)}>
            {q.fechar}
          </button>
        }
      >
        {senha ? (
          <>
            <p className="aviso" style={{ marginTop: 0 }}>
              <b>{senha.usuario.nome}</b> · {senha.usuario.email}
            </p>
            <div className="config__senha-temp">
              <code className="mono">{senha.senha_temporaria}</code>
              <button type="button" className="botao botao--pequeno" onClick={copiar}>
                {copiado ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copiado ? q.copiado : q.copiar}
              </button>
            </div>
            <p className="aviso" style={{ marginBottom: 0 }}>
              {q.senhaTexto}
            </p>
          </>
        ) : null}
      </Dialogo>
    </>
  );
}

/* ------------------------------------------------------------ Privacidade */
function AbaPrivacidade({ tc }) {
  const p = tc.config.privacidade;
  return (
    <div className="config__cartao">
      <h3 className="config__subtitulo">{p.titulo}</h3>
      <ul className="config__privacidade">
        {p.itens.map(([titulo, texto]) => (
          <li key={titulo}>
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <b>{titulo}</b>
              <span>{texto}</span>
            </div>
          </li>
        ))}
      </ul>
      <Link className="botao botao--fantasma botao--pequeno" to="/privacidade" target="_blank" rel="noreferrer">
        {p.politica}
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------- Tela */
export default function Configuracoes({ tc, idioma, aoTrocarIdioma, aoMudarPolitica }) {
  const { usuario } = useAuth();
  const gestao = ["gestor", "admin"].includes(usuario?.papel);
  const abas = ABAS.filter((a) => !a.gestao || gestao);
  const [aba, setAba] = useState("conta");

  const conteudo = {
    conta: <AbaConta tc={tc} idioma={idioma} />,
    seguranca: <AbaSeguranca tc={tc} />,
    aparencia: <AbaAparencia tc={tc} idioma={idioma} aoTrocarIdioma={aoTrocarIdioma} />,
    empresa: <AbaEmpresa tc={tc} empresaId={usuario.empresa_id} aoMudarPolitica={aoMudarPolitica} />,
    equipe: <AbaEquipe tc={tc} empresaId={usuario.empresa_id} idioma={idioma} />,
    privacidade: <AbaPrivacidade tc={tc} />,
  };

  return (
    <div className="config">
      <div className="superficie config__cabecalho">
        <h2 className="secao-titulo">{tc.config.titulo}</h2>
        <p className="aviso secao-lead">{tc.config.lead}</p>
        <div className="config__abas" role="tablist" aria-label={tc.config.titulo}>
          {abas.map(({ id, icone: Icone }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`aba-${id}`}
              aria-selected={aba === id}
              aria-controls={`painel-${id}`}
              className={`config__aba${aba === id ? " config__aba--ativa" : ""}`}
              onClick={() => setAba(id)}
            >
              <Icone size={16} aria-hidden="true" /> {tc.config.abas[id]}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} className="config__painel" key={aba}>
        {conteudo[aba]}
      </div>
    </div>
  );
}
