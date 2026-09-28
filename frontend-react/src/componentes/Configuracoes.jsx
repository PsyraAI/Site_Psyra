// Configurações da conta do gestor: perfil, aparência, segurança e privacidade (LGPD).

import { useEffect, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  Monitor,
  Moon,
  Palette,
  Shield,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";

import { api } from "../lib/api";
import { rotuloPlano } from "../lib/planos";
import { useTema } from "../lib/tema";
import { tempoRelativo } from "./AtividadesRecentes";

const PAPEIS = { admin: "Admin da empresa", gestor: "Gestor", crp: "Psicóloga(o) CRP" };
const EMAIL_PSYRA = "psyra.ai.io@gmail.com";

const dataHora = (iso) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

function forca(senha) {
  if (!senha) return 0;
  if (senha.length < 12) return 1;
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  return tipos >= 3 && senha.length >= 14 ? 3 : 2;
}
const TEXTO_FORCA = ["", "Curta: mínimo de 12 caracteres", "Aceitável", "Forte"];

const ABAS = [
  { id: "perfil", rotulo: "Meu perfil", sub: "Dados da conta", icone: UserRound },
  { id: "aparencia", rotulo: "Aparência", sub: "Tema claro ou escuro", icone: Palette },
  { id: "seguranca", rotulo: "Segurança", sub: "Senha e acessos", icone: Lock },
  { id: "privacidade", rotulo: "Dados e privacidade", sub: "LGPD e trilha de auditoria", icone: Shield },
];

function Perfil({ usuario, perfil }) {
  const linhas = [
    ["Nome", perfil?.nome || usuario.nome],
    ["E-mail", perfil?.email || "—"],
    ["Papel", PAPEIS[usuario.papel] || usuario.papel],
    ["Empresa", usuario.empresa_nome],
    ["Plano", rotuloPlano(usuario.plano)],
  ];
  return (
    <section className="superficie">
      <h2 className="secao-titulo">Informações da conta</h2>
      <p className="aviso secao-lead">
        Para mudar nome, e-mail ou papel, peça à equipe Psyra ({EMAIL_PSYRA}): as contas de acesso
        são criadas e ajustadas pela operação.
      </p>
      <dl className="conta-dados">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Aparencia() {
  const { preferencia, definirPreferencia } = useTema();
  const opcoes = [
    ["escuro", "Escuro", "Padrão da marca, confortável em ambientes com pouca luz", Moon],
    ["claro", "Claro", "Mais contraste em telas e ambientes claros", Sun],
    ["sistema", "Seguir o sistema", "Acompanha o tema do seu computador ou celular", Monitor],
  ];
  return (
    <section className="superficie">
      <h2 className="secao-titulo">Tema da interface</h2>
      <p className="aviso secao-lead">
        A escolha fica salva só neste navegador. A página pública e o questionário do colaborador
        seguem no tema da marca.
      </p>
      <div className="tema-opcoes" role="radiogroup" aria-label="Tema">
        {opcoes.map(([valor, rotulo, texto, Icone]) => (
          <label key={valor} className={`tema-opcao ${preferencia === valor ? "tema-opcao--ativa" : ""}`}>
            <input
              type="radio"
              name="tema"
              value={valor}
              checked={preferencia === valor}
              onChange={() => definirPreferencia(valor)}
            />
            <span className={`tema-opcao__amostra tema-opcao__amostra--${valor}`} aria-hidden="true">
              <Icone size={18} />
            </span>
            <strong>{rotulo}</strong>
            <small>{texto}</small>
            {preferencia === valor ? <Check className="tema-opcao__check" size={16} aria-hidden="true" /> : null}
          </label>
        ))}
      </div>
    </section>
  );
}

function Seguranca({ perfil }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState({ tipo: "", texto: "" });
  const [enviando, setEnviando] = useState(false);
  const nivel = forca(nova);
  const acessos = perfil?.acessos_recentes || [];
  const anterior = acessos[1];

  async function trocar(evento) {
    evento.preventDefault();
    if (nova.length < 12) return setEstado({ tipo: "erro", texto: "A nova senha precisa ter ao menos 12 caracteres." });
    if (nova !== confirmacao) return setEstado({ tipo: "erro", texto: "A confirmação não bate com a nova senha." });
    setEnviando(true);
    setEstado({ tipo: "", texto: "" });
    try {
      await api.alterarSenha(atual, nova);
      setAtual("");
      setNova("");
      setConfirmacao("");
      setEstado({ tipo: "ok", texto: "Senha alterada. Use a nova senha no próximo acesso." });
    } catch (falha) {
      setEstado({ tipo: "erro", texto: falha.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <section className="superficie conta-segura">
        <span className="conta-segura__icone" aria-hidden="true">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h2 className="secao-titulo">Sua conta está protegida</h2>
          <p className="aviso">
            {anterior
              ? `Acesso anterior: ${dataHora(anterior)} (${tempoRelativo(anterior)}). Não reconhece? Troque a senha e avise a equipe Psyra.`
              : "Este é o primeiro acesso registrado desta conta."}
          </p>
          {acessos.length > 1 ? (
            <ul className="conta-acessos">
              {acessos.map((iso, i) => (
                <li key={iso}>
                  {dataHora(iso)}
                  {i === 0 ? <span className="chip chip--ok">sessão atual</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="superficie">
        <h2 className="secao-titulo">Trocar senha</h2>
        <p className="aviso secao-lead">Se sua senha foi criada pela equipe Psyra, troque-a agora.</p>
        <form className="conta-senha" onSubmit={trocar}>
          <div className="campo">
            <label htmlFor="senha-atual">Senha atual</label>
            <input
              id="senha-atual"
              type={ver ? "text" : "password"}
              autoComplete="current-password"
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="senha-nova">Nova senha</label>
            <input
              id="senha-nova"
              type={ver ? "text" : "password"}
              autoComplete="new-password"
              minLength={12}
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              required
            />
            {nivel ? (
              <div className={`forca forca--${nivel}`}>
                <span className="forca__barra" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <small>{TEXTO_FORCA[nivel]}</small>
              </div>
            ) : null}
          </div>
          <div className="campo">
            <label htmlFor="senha-confirma">Confirmar nova senha</label>
            <input
              id="senha-confirma"
              type={ver ? "text" : "password"}
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              required
            />
          </div>
          <div className="conta-senha__acoes">
            <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => setVer((v) => !v)}>
              {ver ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
              {ver ? "Ocultar" : "Mostrar"} senhas
            </button>
            <button type="submit" className="botao botao--pequeno" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar nova senha"}
            </button>
          </div>
          {estado.texto ? (
            <p className={estado.tipo === "ok" ? "ok" : "erro"} role={estado.tipo === "erro" ? "alert" : "status"}>
              {estado.texto}
            </p>
          ) : null}
        </form>
      </section>
    </>
  );
}

function Privacidade({ usuario }) {
  const [integridade, setIntegridade] = useState(null);
  useEffect(() => {
    api
      .auditoria(usuario.empresa_id)
      .then((dados) => setIntegridade(dados.integridade))
      .catch(() => setIntegridade(null));
  }, [usuario.empresa_id]);

  return (
    <>
      <section className="superficie">
        <h2 className="secao-titulo">O que a Psyra guarda sobre você</h2>
        <ul className="conta-lista">
          <li>Nome, e-mail corporativo e papel na empresa, para dar acesso ao painel.</li>
          <li>Registro de acessos e de ações administrativas, numa trilha de auditoria encadeada por hash.</li>
          <li>Nenhuma resposta individual de colaborador: os resultados só existem por grupo, com no mínimo 5 respostas.</li>
        </ul>
      </section>
      <section className="superficie">
        <h2 className="secao-titulo">Trilha de auditoria</h2>
        <p className="aviso">
          {integridade === null
            ? "Verificando a cadeia de registros…"
            : integridade.integra
              ? `Íntegra: ${integridade.total} registros conferidos, nenhum alterado.`
              : `Atenção: a cadeia apresenta quebra no registro ${integridade.quebra_em}. Avise a equipe Psyra.`}
        </p>
      </section>
      <section className="superficie">
        <h2 className="secao-titulo">Seus direitos (LGPD, Art. 18)</h2>
        <p className="aviso">
          Você pode pedir confirmação, acesso, correção ou eliminação dos seus dados de conta pelo
          e-mail <a href={`mailto:${EMAIL_PSYRA}?subject=${encodeURIComponent("Direitos LGPD — conta Psyra")}`}>{EMAIL_PSYRA}</a>.
          O encerramento da conta é feito pela equipe Psyra a pedido da empresa contratante. Leia a{" "}
          <a href="/privacidade">Política de Privacidade</a>.
        </p>
      </section>
    </>
  );
}

export default function Configuracoes({ usuario }) {
  const [aba, setAba] = useState("perfil");
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    api.perfil().then(setPerfil).catch(() => setPerfil(null));
  }, []);

  const anterior = perfil?.acessos_recentes?.[1];

  return (
    <div className="configuracoes">
      <div className="pagina-cabecalho">
        <div className="pagina-cabecalho__linha">
          <div>
            <p className="pagina-cabecalho__eyebrow">Conta</p>
            <h1>Configurações da conta</h1>
            <p className="pagina-cabecalho__aviso">
              Perfil, aparência, segurança e privacidade da sua conta.
            </p>
          </div>
          {anterior ? (
            <p className="configuracoes__acesso">
              <ShieldCheck size={15} aria-hidden="true" /> Acesso anterior: {dataHora(anterior)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="configuracoes__grade">
        <nav className="superficie configuracoes__menu" aria-label="Configurações">
          {ABAS.map(({ id, rotulo, sub, icone: Icone }) => (
            <button
              key={id}
              type="button"
              className={`configuracoes__item ${aba === id ? "configuracoes__item--ativo" : ""}`}
              aria-current={aba === id ? "page" : undefined}
              onClick={() => setAba(id)}
            >
              <Icone size={18} aria-hidden="true" />
              <span>
                <strong>{rotulo}</strong>
                <small>{sub}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="configuracoes__conteudo">
          {aba === "perfil" ? <Perfil usuario={usuario} perfil={perfil} /> : null}
          {aba === "aparencia" ? <Aparencia /> : null}
          {aba === "seguranca" ? <Seguranca perfil={perfil} /> : null}
          {aba === "privacidade" ? <Privacidade usuario={usuario} /> : null}
        </div>
      </div>
    </div>
  );
}
