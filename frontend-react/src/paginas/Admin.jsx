// Psyra AI — painel de operação (superadmin).
// Organização: Visão geral · Empresas (lista + detalhe com plano e usuários) · Nova conta (assistente).
// A criação de contas acontece aqui: a equipe Psyra cria a empresa, escolhe o plano
// e gera o primeiro acesso. Não há cadastro público (LGPD e controle de acesso).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Copy,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Power,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from "lucide-react";

import AlternarTema from "../componentes/AlternarTema";
import MarcaLogo from "../componentes/MarcaLogo";
import { apiAdmin, sessaoAdmin } from "../lib/api";
import { PLANOS, obterPlano, rotuloPlano } from "../lib/planos";
import "../estilos/operacao.css";

// ---------------------------------------------------------------------------
// Rótulos e utilitários
// ---------------------------------------------------------------------------
const PORTES = [
  ["micro", "Micro"],
  ["pequena", "Pequena"],
  ["media", "Média"],
  ["grande", "Grande"],
];
const ATUACOES = [
  ["saude", "Saúde"],
  ["industria", "Indústria"],
  ["servicos", "Serviços"],
  ["comercio", "Comércio"],
  ["tecnologia", "Tecnologia"],
  ["outro", "Outro"],
];
const PAPEIS = [
  ["admin", "Admin da empresa", "Gerencia coletas e vê todo o painel"],
  ["gestor", "Gestor", "Acompanha os resultados por grupo"],
  ["crp", "Psicóloga(o) CRP", "Valida o plano de ação antes do PGR"],
];
const VALOR_MENSAL = { starter: 1200, professional: 2500, enterprise: 4500 };

const rotulo = (lista, valor) => (lista.find(([v]) => v === valor) || [valor, valor])[1];
const soDigitos = (texto) => String(texto || "").replace(/\D/g, "");
const brl = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function formatarCnpj(texto) {
  const d = soDigitos(texto).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function cnpjValido(texto) {
  const d = soDigitos(texto);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split("").reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(d.slice(0, 12));
  const d2 = digito(d.slice(0, 12) + d1);
  return d.endsWith(`${d1}${d2}`);
}

function gerarSenha(tamanho = 16) {
  const conjunto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%*?";
  const aleatorios = new Uint32Array(tamanho);
  window.crypto.getRandomValues(aleatorios);
  return Array.from(aleatorios, (n) => conjunto[n % conjunto.length]).join("");
}

function forcaSenha(senha) {
  if (!senha) return { nivel: 0, texto: "" };
  if (senha.length < 12) return { nivel: 1, texto: "Curta: mínimo de 12 caracteres" };
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  if (tipos >= 3 && senha.length >= 14) return { nivel: 3, texto: "Forte" };
  return { nivel: 2, texto: "Aceitável — misture letras, números e símbolos" };
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Componentes de apoio
// ---------------------------------------------------------------------------
function Chip({ children, tom = "neutro" }) {
  return <span className={`chip chip--${tom}`}>{children}</span>;
}

function CampoSenha({ id, valor, onChange, rotuloCampo = "Senha inicial" }) {
  const [copiado, setCopiado] = useState(false);
  const forca = forcaSenha(valor);
  return (
    <div className="campo">
      <label htmlFor={id}>{rotuloCampo}</label>
      <div className="senha-gerada">
        <input
          id={id}
          type="text"
          autoComplete="new-password"
          spellCheck={false}
          minLength={12}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="mínimo de 12 caracteres"
          required
        />
        <button
          type="button"
          className="botao botao--fantasma botao--pequeno"
          onClick={() => {
            onChange(gerarSenha());
            setCopiado(false);
          }}
        >
          <RefreshCw size={14} aria-hidden="true" /> Gerar
        </button>
        <button
          type="button"
          className="botao botao--fantasma botao--pequeno"
          disabled={!valor}
          onClick={async () => setCopiado(await copiar(valor))}
        >
          {copiado ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copiado ? "Copiada" : "Copiar"}
        </button>
      </div>
      {forca.nivel ? (
        <div className={`forca forca--${forca.nivel}`}>
          <span className="forca__barra" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <small>{forca.texto}</small>
        </div>
      ) : null}
    </div>
  );
}

function SeletorPlanos({ valor, onChange, nomeGrupo, compacto = false }) {
  return (
    <div
      className={`op-planos ${compacto ? "op-planos--compacto" : ""}`}
      role="radiogroup"
      aria-label="Plano comercial"
    >
      {PLANOS.map((plano) => {
        const selecionado = valor === plano.id;
        return (
          <label
            key={plano.id}
            className={`op-plano ${selecionado ? "op-plano--ativo" : ""}`}
          >
            <input
              type="radio"
              name={nomeGrupo}
              value={plano.id}
              checked={selecionado}
              onChange={() => onChange(plano.id)}
            />
            <div className="op-plano__cabeca">
              <strong>{plano.nome}</strong>
              {plano.destaque ? <span className="op-plano__selo">Recomendado</span> : null}
              <span className="op-plano__marcador" aria-hidden="true">
                {selecionado ? <Check size={14} /> : null}
              </span>
            </div>
            <p className="op-plano__preco">
              {plano.preco}
              <small>{plano.periodo}</small>
            </p>
            <p className="op-plano__faixa">{plano.faixa}</p>
            {!compacto ? (
              <ul className="op-plano__itens">
                {plano.itens.map((item) => (
                  <li key={item}>
                    <Check size={13} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}

function CredenciaisCriadas({ credenciais, onFechar }) {
  const [copiado, setCopiado] = useState(false);
  if (!credenciais) return null;
  const texto = `Acesso Psyra AI\nE-mail: ${credenciais.email}\nSenha inicial: ${credenciais.senha}\nEntrar em: ${window.location.origin}/entrar`;
  return (
    <div className="credencial-box" role="status">
      <div className="credencial-box__topo">
        <KeyRound size={18} aria-hidden="true" />
        <strong>Acesso criado para {credenciais.nome}</strong>
      </div>
      <dl>
        <dt>E-mail</dt>
        <dd>{credenciais.email}</dd>
        <dt>Senha inicial</dt>
        <dd className="mono">{credenciais.senha}</dd>
      </dl>
      <p className="aviso">
        A senha aparece só agora. Envie por um canal seguro e peça a troca no primeiro acesso.
      </p>
      <div className="credencial-box__acoes">
        <button
          type="button"
          className="botao botao--pequeno"
          onClick={async () => setCopiado(await copiar(texto))}
        >
          {copiado ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copiado ? "Copiado" : "Copiar dados de acesso"}
        </button>
        {onFechar ? (
          <button type="button" className="botao botao--fantasma botao--pequeno" onClick={onFechar}>
            Fechar
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visão geral
// ---------------------------------------------------------------------------
function VisaoGeral({ empresas, irPara, abrirEmpresa }) {
  const ativas = empresas.filter((e) => e.ativo);
  const usuariosTotal = empresas.reduce((acc, e) => acc + (e.total_usuarios || 0), 0);
  const porPlano = PLANOS.map((plano) => ({
    ...plano,
    total: ativas.filter((e) => e.plano === plano.id).length,
  }));
  const maior = Math.max(1, ...porPlano.map((p) => p.total));
  const mensalContratado = ativas.reduce((acc, e) => acc + (VALOR_MENSAL[e.plano] || 0), 0);
  const recentes = empresas.slice(0, 5);

  return (
    <>
      <div className="op-kpis">
        <div className="op-kpi">
          <span>Empresas ativas</span>
          <strong>{ativas.length}</strong>
          <small>{empresas.length - ativas.length} inativa(s)</small>
        </div>
        <div className="op-kpi">
          <span>Contas de acesso</span>
          <strong>{usuariosTotal}</strong>
          <small>usuários em todas as empresas</small>
        </div>
        <div className="op-kpi">
          <span>Valor mensal dos planos</span>
          <strong>{brl(mensalContratado)}</strong>
          <small>soma dos planos das empresas ativas — não é faturamento</small>
        </div>
      </div>

      <div className="op-grade-2">
        <section className="superficie">
          <h2 className="secao-titulo">Empresas por plano</h2>
          <div className="op-barras">
            {porPlano.map((p) => (
              <div className="op-barra" key={p.id}>
                <span className="op-barra__nome">{p.nome}</span>
                <span className="op-barra__trilho">
                  <i style={{ width: `${(p.total / maior) * 100}%` }} />
                </span>
                <span className="op-barra__valor">{p.total}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="superficie">
          <div className="op-titulo-linha">
            <h2 className="secao-titulo">Cadastradas recentemente</h2>
            <button
              type="button"
              className="botao botao--pequeno"
              onClick={() => irPara("nova")}
            >
              <UserPlus size={15} aria-hidden="true" /> Nova conta
            </button>
          </div>
          {recentes.length ? (
            <ul className="op-lista-simples">
              {recentes.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => abrirEmpresa(e.id)}>
                    <span>
                      <strong>{e.razao_social}</strong>
                      <small>
                        {rotuloPlano(e.plano)} · {e.total_usuarios} usuário(s)
                      </small>
                    </span>
                    <Chip tom={e.ativo ? "ok" : "off"}>{e.ativo ? "Ativa" : "Inativa"}</Chip>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="aviso">Nenhuma empresa cadastrada ainda.</p>
          )}
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Empresas: lista + detalhe
// ---------------------------------------------------------------------------
function DetalheEmpresa({ empresa, onAtualizada, avisar }) {
  const [aba, setAba] = useState("plano");
  const [meta, setMeta] = useState({
    plano: empresa.plano,
    porte: empresa.porte || "media",
    atuacao: empresa.atuacao || "servicos",
  });
  const [usuarios, setUsuarios] = useState([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);
  const [novo, setNovo] = useState({ nome: "", email: "", senha: gerarSenha(), papel: "admin" });
  const [credenciais, setCredenciais] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setMeta({
      plano: empresa.plano,
      porte: empresa.porte || "media",
      atuacao: empresa.atuacao || "servicos",
    });
    setCredenciais(null);
    setResetId(null);
  }, [empresa.id, empresa.plano, empresa.porte, empresa.atuacao]);

  const recarregarUsuarios = useCallback(async () => {
    setCarregandoUsuarios(true);
    try {
      setUsuarios(await apiAdmin.usuarios(empresa.id));
    } catch (falha) {
      avisar(falha.message, "erro");
    } finally {
      setCarregandoUsuarios(false);
    }
  }, [empresa.id, avisar]);

  useEffect(() => {
    recarregarUsuarios();
  }, [recarregarUsuarios]);

  const alterado =
    meta.plano !== empresa.plano ||
    meta.porte !== (empresa.porte || "media") ||
    meta.atuacao !== (empresa.atuacao || "servicos");

  async function salvarMeta(evento) {
    evento.preventDefault();
    setSalvando(true);
    try {
      await apiAdmin.atualizarEmpresa(empresa.id, meta);
      await onAtualizada();
      avisar(`Plano e perfil de ${empresa.razao_social} atualizados.`, "ok");
    } catch (falha) {
      avisar(falha.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarEmpresa() {
    const acao = empresa.ativo ? "desativar" : "ativar";
    if (!window.confirm(`Confirmar: ${acao} ${empresa.razao_social}?`)) return;
    try {
      await apiAdmin.statusEmpresa(empresa.id, !empresa.ativo);
      await onAtualizada();
      avisar(`Empresa ${empresa.ativo ? "desativada" : "ativada"}.`, "ok");
    } catch (falha) {
      avisar(falha.message, "erro");
    }
  }

  async function criarUsuario(evento) {
    evento.preventDefault();
    if (novo.senha.length < 12) {
      avisar("A senha inicial precisa ter ao menos 12 caracteres.", "erro");
      return;
    }
    setSalvando(true);
    try {
      await apiAdmin.criarUsuario(empresa.id, { ...novo, email: novo.email.trim() });
      setCredenciais({ nome: novo.nome, email: novo.email.trim().toLowerCase(), senha: novo.senha });
      setNovo({ nome: "", email: "", senha: gerarSenha(), papel: "admin" });
      await recarregarUsuarios();
      await onAtualizada();
    } catch (falha) {
      avisar(falha.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarUsuario(usuario) {
    try {
      await apiAdmin.statusUsuario(usuario.id, !usuario.ativo);
      await recarregarUsuarios();
    } catch (falha) {
      avisar(falha.message, "erro");
    }
  }

  async function salvarNovaSenha(usuario) {
    if (novaSenha.length < 12) {
      avisar("A nova senha precisa ter ao menos 12 caracteres.", "erro");
      return;
    }
    try {
      await apiAdmin.redefinirSenha(usuario.id, novaSenha);
      setCredenciais({ nome: usuario.nome, email: usuario.email, senha: novaSenha });
      setResetId(null);
      setNovaSenha("");
    } catch (falha) {
      avisar(falha.message, "erro");
    }
  }

  return (
    <section className="superficie op-detalhe">
      <header className="op-detalhe__cabeca">
        <div>
          <p className="op-eyebrow">Empresa</p>
          <h2>{empresa.razao_social}</h2>
          <p className="op-detalhe__meta">
            CNPJ {formatarCnpj(empresa.cnpj)} · {rotulo(PORTES, empresa.porte || "media")} ·{" "}
            {rotulo(ATUACOES, empresa.atuacao || "servicos")}
          </p>
          <div className="op-detalhe__chips">
            <Chip tom="roxo">{rotuloPlano(empresa.plano)}</Chip>
            <Chip tom={empresa.ativo ? "ok" : "off"}>{empresa.ativo ? "Ativa" : "Inativa"}</Chip>
            <Chip>{empresa.total_usuarios} usuário(s)</Chip>
          </div>
        </div>
        <button
          type="button"
          className={`botao botao--fantasma botao--pequeno ${empresa.ativo ? "botao--perigo" : ""}`}
          onClick={alternarEmpresa}
        >
          <Power size={14} aria-hidden="true" /> {empresa.ativo ? "Desativar" : "Ativar"}
        </button>
      </header>

      <div className="op-abas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={aba === "plano"}
          className={aba === "plano" ? "op-aba op-aba--ativa" : "op-aba"}
          onClick={() => setAba("plano")}
        >
          Plano e perfil
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === "usuarios"}
          className={aba === "usuarios" ? "op-aba op-aba--ativa" : "op-aba"}
          onClick={() => setAba("usuarios")}
        >
          Contas de acesso ({usuarios.length})
        </button>
      </div>

      {aba === "plano" ? (
        <form onSubmit={salvarMeta}>
          <SeletorPlanos
            nomeGrupo={`plano-${empresa.id}`}
            valor={meta.plano}
            onChange={(plano) => setMeta({ ...meta, plano })}
            compacto
          />
          <div className="op-campos-2">
            <div className="campo">
              <label htmlFor="det-porte">Porte</label>
              <select
                id="det-porte"
                value={meta.porte}
                onChange={(e) => setMeta({ ...meta, porte: e.target.value })}
              >
                {PORTES.map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="det-atuacao">Atuação</label>
              <select
                id="det-atuacao"
                value={meta.atuacao}
                onChange={(e) => setMeta({ ...meta, atuacao: e.target.value })}
              >
                {ATUACOES.map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="op-rodape-form">
            <p className="aviso">
              Funcionalidades liberadas: {obterPlano(meta.plano).itens.length} itens do plano{" "}
              {obterPlano(meta.plano).nome}.
            </p>
            <button className="botao botao--pequeno" type="submit" disabled={!alterado || salvando}>
              {salvando ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      ) : (
        <div className="op-usuarios">
          <CredenciaisCriadas credenciais={credenciais} onFechar={() => setCredenciais(null)} />

          {carregandoUsuarios ? (
            <p className="aviso">Carregando contas…</p>
          ) : usuarios.length ? (
            <ul className="op-usuarios__lista">
              {usuarios.map((u) => (
                <li key={u.id} className={u.ativo ? "" : "op-usuario--off"}>
                  <div className="op-usuario">
                    <span className="op-avatar" aria-hidden="true">
                      {(u.nome || "?").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="op-usuario__texto">
                      <strong>{u.nome}</strong>
                      <small>{u.email}</small>
                    </span>
                    <Chip tom={u.papel === "crp" ? "roxo" : "neutro"}>{rotulo(PAPEIS, u.papel)}</Chip>
                    {!u.ativo ? <Chip tom="off">Inativo</Chip> : null}
                    <div className="op-usuario__acoes">
                      <button
                        type="button"
                        className="botao botao--fantasma botao--pequeno"
                        onClick={() => {
                          setResetId(resetId === u.id ? null : u.id);
                          setNovaSenha(gerarSenha());
                        }}
                      >
                        <KeyRound size={14} aria-hidden="true" /> Senha
                      </button>
                      <button
                        type="button"
                        className="botao botao--fantasma botao--pequeno"
                        onClick={() => alternarUsuario(u)}
                      >
                        {u.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </div>
                  {resetId === u.id ? (
                    <div className="op-reset">
                      <CampoSenha
                        id={`reset-${u.id}`}
                        rotuloCampo={`Nova senha para ${u.email}`}
                        valor={novaSenha}
                        onChange={setNovaSenha}
                      />
                      <div className="op-reset__acoes">
                        <button type="button" className="botao botao--pequeno" onClick={() => salvarNovaSenha(u)}>
                          Redefinir senha
                        </button>
                        <button
                          type="button"
                          className="botao botao--fantasma botao--pequeno"
                          onClick={() => setResetId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="aviso">Esta empresa ainda não tem contas de acesso.</p>
          )}

          <form className="op-novo-usuario" onSubmit={criarUsuario}>
            <h3>
              <UserPlus size={16} aria-hidden="true" /> Adicionar conta de acesso
            </h3>
            {!empresa.ativo ? (
              <p className="aviso">Ative a empresa para criar novas contas.</p>
            ) : (
              <>
                <div className="op-campos-2">
                  <div className="campo">
                    <label htmlFor="nu-nome">Nome</label>
                    <input
                      id="nu-nome"
                      value={novo.nome}
                      onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="campo">
                    <label htmlFor="nu-email">E-mail corporativo</label>
                    <input
                      id="nu-email"
                      type="email"
                      value={novo.email}
                      onChange={(e) => setNovo({ ...novo, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="campo">
                  <label htmlFor="nu-papel">Papel</label>
                  <select
                    id="nu-papel"
                    value={novo.papel}
                    onChange={(e) => setNovo({ ...novo, papel: e.target.value })}
                  >
                    {PAPEIS.map(([v, r, d]) => (
                      <option key={v} value={v}>
                        {r} — {d}
                      </option>
                    ))}
                  </select>
                </div>
                <CampoSenha
                  id="nu-senha"
                  valor={novo.senha}
                  onChange={(senha) => setNovo({ ...novo, senha })}
                />
                <button className="botao botao--pequeno" type="submit" disabled={salvando}>
                  {salvando ? "Criando…" : "Criar conta de acesso"}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </section>
  );
}

function Empresas({ empresas, selecionadaId, setSelecionadaId, recarregar, avisar, irPara }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todas");

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = soDigitos(busca);
    return empresas.filter((e) => {
      if (filtro === "ativas" && !e.ativo) return false;
      if (filtro === "inativas" && e.ativo) return false;
      if (!termo) return true;
      return (
        e.razao_social.toLowerCase().includes(termo) ||
        (digitos && String(e.cnpj).includes(digitos))
      );
    });
  }, [empresas, busca, filtro]);

  const selecionada = empresas.find((e) => e.id === selecionadaId) || null;

  return (
    <div className="op-empresas">
      <section className="superficie op-lista">
        <div className="op-lista__busca">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nome ou CNPJ"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar empresa"
          />
        </div>
        <div className="op-filtros" role="group" aria-label="Filtrar empresas">
          {[
            ["todas", "Todas"],
            ["ativas", "Ativas"],
            ["inativas", "Inativas"],
          ].map(([v, r]) => (
            <button
              key={v}
              type="button"
              className={filtro === v ? "op-filtro op-filtro--ativo" : "op-filtro"}
              onClick={() => setFiltro(v)}
            >
              {r}
            </button>
          ))}
        </div>

        {filtradas.length ? (
          <ul className="op-lista__itens">
            {filtradas.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`op-item ${e.id === selecionadaId ? "op-item--ativo" : ""}`}
                  onClick={() => setSelecionadaId(e.id)}
                >
                  <span className={`op-status ${e.ativo ? "op-status--on" : ""}`} aria-hidden="true" />
                  <span className="op-item__texto">
                    <strong>{e.razao_social}</strong>
                    <small>
                      {rotuloPlano(e.plano)} · {e.total_usuarios} usuário(s) ·{" "}
                      {rotulo(ATUACOES, e.atuacao || "servicos")}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="aviso op-lista__vazia">Nenhuma empresa encontrada.</p>
        )}

        <button type="button" className="botao botao--fantasma botao--pequeno op-lista__nova" onClick={() => irPara("nova")}>
          <UserPlus size={15} aria-hidden="true" /> Nova conta de empresa
        </button>
      </section>

      {selecionada ? (
        <DetalheEmpresa
          key={selecionada.id}
          empresa={selecionada}
          onAtualizada={recarregar}
          avisar={avisar}
        />
      ) : (
        <section className="superficie op-detalhe op-detalhe--vazio">
          <Building2 size={28} aria-hidden="true" />
          <p>Selecione uma empresa para ver o plano e as contas de acesso.</p>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nova conta — assistente em 4 etapas
// ---------------------------------------------------------------------------
const ETAPAS = ["Empresa", "Plano", "Primeiro acesso", "Revisão"];
const contaInicial = () => ({
  razao_social: "",
  cnpj: "",
  porte: "media",
  atuacao: "servicos",
  plano: "professional",
  nome: "",
  email: "",
  papel: "admin",
  senha: gerarSenha(),
});

function NovaConta({ aoConcluir, avisar }) {
  const [etapa, setEtapa] = useState(0);
  const [dados, setDados] = useState(contaInicial);
  const [erroEtapa, setErroEtapa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [empresaCriada, setEmpresaCriada] = useState(null);

  const atualizar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  function validar(indice) {
    if (indice === 0) {
      if (dados.razao_social.trim().length < 3) return "Informe a razão social.";
      if (!cnpjValido(dados.cnpj)) return "CNPJ inválido: confira os 14 dígitos.";
    }
    if (indice === 2) {
      if (dados.nome.trim().length < 2) return "Informe o nome de quem vai acessar.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) return "E-mail inválido.";
      if (dados.senha.length < 12) return "A senha inicial precisa ter ao menos 12 caracteres.";
    }
    return "";
  }

  function avancar() {
    const problema = validar(etapa);
    setErroEtapa(problema);
    if (!problema) setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1));
  }

  async function criar() {
    for (const i of [0, 2]) {
      const problema = validar(i);
      if (problema) {
        setErroEtapa(problema);
        setEtapa(i);
        return;
      }
    }
    setEnviando(true);
    setErroEtapa("");
    let empresa = empresaCriada;
    try {
      if (!empresa) {
        empresa = await apiAdmin.criarEmpresa({
          razao_social: dados.razao_social.trim(),
          cnpj: soDigitos(dados.cnpj),
          plano: dados.plano,
          porte: dados.porte,
          atuacao: dados.atuacao,
        });
        setEmpresaCriada(empresa);
      }
      await apiAdmin.criarUsuario(empresa.id, {
        nome: dados.nome.trim(),
        email: dados.email.trim(),
        senha: dados.senha,
        papel: dados.papel,
      });
      setResultado({
        empresa,
        credenciais: { nome: dados.nome.trim(), email: dados.email.trim().toLowerCase(), senha: dados.senha },
      });
      setEmpresaCriada(null);
      await aoConcluir(null);
    } catch (falha) {
      if (empresa) {
        // A empresa já existe: só o primeiro acesso falhou. Volta à etapa 3 para corrigir.
        await aoConcluir(null);
        setErroEtapa(
          `A empresa ${empresa.razao_social} já foi criada, mas o primeiro acesso não: ${falha.message}. Ajuste os dados e tente de novo.`,
        );
        setEtapa(2);
      } else {
        setErroEtapa(falha.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <section className="superficie op-sucesso">
        <span className="op-sucesso__icone" aria-hidden="true">
          <Check size={26} />
        </span>
        <h2>Conta criada</h2>
        <p className="aviso">
          {resultado.empresa.razao_social} já está ativa no plano {rotuloPlano(resultado.empresa.plano)}.
        </p>
        <CredenciaisCriadas credenciais={resultado.credenciais} />
        <div className="op-sucesso__acoes">
          <button
            type="button"
            className="botao botao--pequeno"
            onClick={() => aoConcluir(resultado.empresa.id, true)}
          >
            Abrir empresa <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="botao botao--fantasma botao--pequeno"
            onClick={() => {
              setResultado(null);
              setDados(contaInicial());
              setEmpresaCriada(null);
              setEtapa(0);
            }}
          >
            Criar outra conta
          </button>
        </div>
      </section>
    );
  }

  const plano = obterPlano(dados.plano);

  return (
    <section className="superficie op-assistente">
      <ol className="op-etapas">
        {ETAPAS.map((nome, i) => (
          <li
            key={nome}
            className={i === etapa ? "op-etapa op-etapa--atual" : i < etapa ? "op-etapa op-etapa--feita" : "op-etapa"}
          >
            <span>{i < etapa ? <Check size={13} aria-hidden="true" /> : i + 1}</span>
            {nome}
          </li>
        ))}
      </ol>

      {empresaCriada && etapa < 2 ? (
        <div className="op-passo">
          <h2>Empresa já criada</h2>
          <p className="aviso">
            {empresaCriada.razao_social} já está cadastrada no plano {rotuloPlano(empresaCriada.plano)}.
            Para mudar dados ou plano, use a aba Empresas depois de concluir o primeiro acesso.
          </p>
        </div>
      ) : null}

      {etapa === 0 && !empresaCriada ? (
        <div className="op-passo">
          <h2>Dados da empresa</h2>
          <p className="aviso">A empresa contratante. Os colaboradores nunca têm conta: respondem de forma anônima.</p>
          <div className="campo">
            <label htmlFor="nc-razao">Razão social</label>
            <input id="nc-razao" value={dados.razao_social} onChange={atualizar("razao_social")} autoFocus />
          </div>
          <div className="campo">
            <label htmlFor="nc-cnpj">CNPJ</label>
            <input
              id="nc-cnpj"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              value={formatarCnpj(dados.cnpj)}
              onChange={(e) => setDados({ ...dados, cnpj: soDigitos(e.target.value) })}
            />
          </div>
          <div className="op-campos-2">
            <div className="campo">
              <label htmlFor="nc-porte">Porte</label>
              <select id="nc-porte" value={dados.porte} onChange={atualizar("porte")}>
                {PORTES.map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="nc-atuacao">Atuação</label>
              <select id="nc-atuacao" value={dados.atuacao} onChange={atualizar("atuacao")}>
                {ATUACOES.map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {etapa === 1 && !empresaCriada ? (
        <div className="op-passo">
          <h2>Plano contratado</h2>
          <p className="aviso">Define as funcionalidades liberadas. Pode ser alterado depois.</p>
          <SeletorPlanos
            nomeGrupo="plano-nova-conta"
            valor={dados.plano}
            onChange={(p) => setDados({ ...dados, plano: p })}
          />
        </div>
      ) : null}

      {etapa === 2 ? (
        <div className="op-passo">
          <h2>Primeiro acesso</h2>
          <p className="aviso">Quem da empresa vai entrar no painel. Outras contas podem ser criadas depois.</p>
          <div className="op-campos-2">
            <div className="campo">
              <label htmlFor="nc-nome">Nome</label>
              <input id="nc-nome" value={dados.nome} onChange={atualizar("nome")} />
            </div>
            <div className="campo">
              <label htmlFor="nc-email">E-mail corporativo</label>
              <input id="nc-email" type="email" value={dados.email} onChange={atualizar("email")} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="nc-papel">Papel</label>
            <select id="nc-papel" value={dados.papel} onChange={atualizar("papel")}>
              {PAPEIS.map(([v, r, d]) => (
                <option key={v} value={v}>
                  {r} — {d}
                </option>
              ))}
            </select>
          </div>
          <CampoSenha id="nc-senha" valor={dados.senha} onChange={(senha) => setDados({ ...dados, senha })} />
        </div>
      ) : null}

      {etapa === 3 ? (
        <div className="op-passo">
          <h2>Revisão</h2>
          <dl className="op-revisao">
            <dt>Empresa</dt>
            <dd>
              {dados.razao_social}
              <small>
                CNPJ {formatarCnpj(dados.cnpj)} · {rotulo(PORTES, dados.porte)} ·{" "}
                {rotulo(ATUACOES, dados.atuacao)}
              </small>
            </dd>
            <dt>Plano</dt>
            <dd>
              {plano.nome} — {plano.preco}
              {plano.periodo}
              <small>{plano.faixa}</small>
            </dd>
            <dt>Primeiro acesso</dt>
            <dd>
              {dados.nome} · {dados.email}
              <small>{rotulo(PAPEIS, dados.papel)} · senha inicial gerada ({dados.senha.length} caracteres)</small>
            </dd>
          </dl>
          <p className="aviso">
            <Lock size={12} aria-hidden="true" /> A criação fica registrada na trilha de auditoria.
          </p>
        </div>
      ) : null}

      <p className="erro" role="alert">
        {erroEtapa}
      </p>

      <div className="op-assistente__acoes">
        <button
          type="button"
          className="botao botao--fantasma botao--pequeno"
          onClick={() => {
            setErroEtapa("");
            setEtapa((e) => Math.max(e - 1, 0));
          }}
          disabled={etapa === 0 || enviando}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Voltar
        </button>
        {etapa < ETAPAS.length - 1 ? (
          <button type="button" className="botao botao--pequeno" onClick={avancar}>
            Continuar <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="botao botao--pequeno" onClick={criar} disabled={enviando}>
            {enviando ? "Criando conta…" : empresaCriada ? "Criar primeiro acesso" : "Criar conta"}
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
const SECOES = [
  { id: "visao", rotulo: "Visão geral", icone: LayoutDashboard, sub: "Resumo da operação" },
  { id: "empresas", rotulo: "Empresas", icone: Building2, sub: "Planos e contas de acesso" },
  { id: "nova", rotulo: "Nova conta", icone: UserPlus, sub: "Criar empresa e primeiro acesso" },
];

export default function Admin() {
  const [checando, setChecando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [secao, setSecao] = useState("visao");
  const [empresas, setEmpresas] = useState([]);
  const [selecionadaId, setSelecionadaId] = useState(null);
  const [aviso, setAviso] = useState(null);

  const avisar = useCallback((texto, tipo = "ok") => {
    setAviso({ texto, tipo, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(null), aviso.tipo === "erro" ? 9000 : 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  const carregarEmpresas = useCallback(async () => {
    const dados = await apiAdmin.empresas();
    setEmpresas(dados);
    setSelecionadaId((atual) =>
      atual && dados.some((e) => e.id === atual) ? atual : dados[0]?.id || null,
    );
    return dados;
  }, []);

  useEffect(() => {
    const sessao = sessaoAdmin.ler();
    if (!sessao?.access_token) {
      setChecando(false);
      return;
    }
    apiAdmin
      .perfil()
      .then(async (perfil) => {
        setAdmin(perfil);
        setAutenticado(true);
        await carregarEmpresas();
      })
      .catch(() => {
        sessaoAdmin.limpar();
        setAutenticado(false);
      })
      .finally(() => setChecando(false));
  }, [carregarEmpresas]);

  const recarregar = useCallback(async () => {
    try {
      await carregarEmpresas();
    } catch (falha) {
      avisar(falha.message, "erro");
    }
  }, [carregarEmpresas, avisar]);

  function abrirEmpresa(id) {
    setSelecionadaId(id);
    setSecao("empresas");
  }

  async function aoConcluirConta(empresaId, abrir = false) {
    await recarregar();
    if (empresaId && abrir) abrirEmpresa(empresaId);
  }

  function sair() {
    sessaoAdmin.limpar();
    setAutenticado(false);
  }

  if (checando) {
    return (
      <main className="entrada">
        <p className="aviso">
          <span className="spinner spinner--claro" aria-hidden="true" /> Verificando sessão…
        </p>
      </main>
    );
  }

  if (!autenticado) {
    return <Navigate to="/entrar?perfil=superadmin" replace />;
  }

  const secaoAtual = SECOES.find((s) => s.id === secao);

  return (
    <div className="app op-app">
      <aside className="sidebar">
        <div className="sidebar__marca">
          <MarcaLogo className="marca__logo" size={42} />
          <div>
            <div className="marca__nome">Psyra AI</div>
            <div className="sidebar__sub">Operação</div>
          </div>
        </div>

        <p className="sidebar__sep">Gestão</p>
        <nav className="sidebar__nav" aria-label="Seções da operação">
          {SECOES.map(({ id, rotulo: r, icone: Icone }) => (
            <button
              key={id}
              type="button"
              className={`nav-item${secao === id ? " nav-item--ativo" : ""}`}
              aria-current={secao === id ? "page" : undefined}
              aria-label={r}
              title={r}
              onClick={() => setSecao(id)}
            >
              <Icone size={18} aria-hidden="true" />
              <span>{r}</span>
            </button>
          ))}
        </nav>

        <p className="sidebar__sep">Preferências</p>
        <nav className="sidebar__nav" aria-label="Preferências">
          <AlternarTema variante="linha" />
        </nav>

        <div className="sidebar__rodape">
          <div className="sidebar__privacidade">
            <Users size={14} aria-hidden="true" />
            <span>
              Contas são só para quem administra. Colaboradores respondem de forma anônima e
              nunca têm login.
            </span>
          </div>
        </div>
      </aside>

      <div className="conteudo">
        <header className="topbar">
          <div>
            <div className="topbar__titulo">{secaoAtual?.rotulo}</div>
            <div className="topbar__sub">{secaoAtual?.sub}</div>
          </div>
          <div className="topbar__dir">
            <AlternarTema />
            <div className="topbar__usuario">
              <b>{admin?.nome || "Operação"}</b>
              <span>Superadmin</span>
            </div>
            <Link className="botao botao--fantasma botao--pequeno op-oculto-mobile" to="/">
              Site
            </Link>
            <button className="botao botao--fantasma botao--pequeno" type="button" onClick={sair}>
              <LogOut size={15} aria-hidden="true" /> Sair
            </button>
          </div>
        </header>

        <main className="conteudo__corpo">
          {aviso ? (
            <div className={`op-aviso op-aviso--${aviso.tipo}`} role={aviso.tipo === "erro" ? "alert" : "status"}>
              {aviso.tipo === "ok" ? <Check size={16} aria-hidden="true" /> : null}
              <span>{aviso.texto}</span>
              <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso">
                ×
              </button>
            </div>
          ) : null}

          {secao === "visao" ? (
            <VisaoGeral empresas={empresas} irPara={setSecao} abrirEmpresa={abrirEmpresa} />
          ) : null}
          {secao === "empresas" ? (
            <Empresas
              empresas={empresas}
              selecionadaId={selecionadaId}
              setSelecionadaId={setSelecionadaId}
              recarregar={recarregar}
              avisar={avisar}
              irPara={setSecao}
            />
          ) : null}
          {secao === "nova" ? <NovaConta aoConcluir={aoConcluirConta} avisar={avisar} /> : null}
        </main>
      </div>
    </div>
  );
}
