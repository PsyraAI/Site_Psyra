import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { apiAdmin, sessaoAdmin } from "../lib/api";

const empresaInicial = {
  razao_social: "",
  cnpj: "",
  plano: "starter",
  porte: "media",
  atuacao: "servicos",
};
const usuarioInicial = {
  nome: "",
  email: "",
  senha: "",
  papel: "admin",
};

export default function Admin() {
  const [checando, setChecando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [empresaAtual, setEmpresaAtual] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [empresaForm, setEmpresaForm] = useState(empresaInicial);
  const [usuarioForm, setUsuarioForm] = useState(usuarioInicial);
  const [erro, setErro] = useState("");

  const carregarEmpresas = useCallback(async () => {
    const dados = await apiAdmin.empresas();
    setEmpresas(dados);
    setEmpresaAtual((atual) => {
      if (!atual) return dados[0] || null;
      return dados.find((empresa) => empresa.id === atual.id) || dados[0] || null;
    });
  }, []);

  useEffect(() => {
    const sessao = sessaoAdmin.ler();
    if (!sessao?.access_token) {
      setChecando(false);
      setAutenticado(false);
      return;
    }
    apiAdmin
      .perfil()
      .then(async () => {
        setAutenticado(true);
        await carregarEmpresas();
      })
      .catch(() => {
        sessaoAdmin.limpar();
        setAutenticado(false);
      })
      .finally(() => setChecando(false));
  }, [carregarEmpresas]);

  useEffect(() => {
    if (!empresaAtual) {
      setUsuarios([]);
      return;
    }
    apiAdmin
      .usuarios(empresaAtual.id)
      .then(setUsuarios)
      .catch((falha) => setErro(falha.message));
  }, [empresaAtual]);

  async function criarEmpresa(evento) {
    evento.preventDefault();
    setErro("");
    try {
      await apiAdmin.criarEmpresa({
        ...empresaForm,
        cnpj: empresaForm.cnpj.replace(/\D/g, ""),
      });
      setEmpresaForm(empresaInicial);
      await carregarEmpresas();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function criarUsuario(evento) {
    evento.preventDefault();
    if (!empresaAtual) return;
    setErro("");
    try {
      await apiAdmin.criarUsuario(empresaAtual.id, usuarioForm);
      setUsuarioForm(usuarioInicial);
      setUsuarios(await apiAdmin.usuarios(empresaAtual.id));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function alternarEmpresa(empresa) {
    await apiAdmin.statusEmpresa(empresa.id, !empresa.ativo);
    await carregarEmpresas();
  }

  async function salvarMetaEmpresa(evento) {
    evento.preventDefault();
    if (!empresaAtual) return;
    setErro("");
    try {
      const atualizada = await apiAdmin.atualizarEmpresa(empresaAtual.id, {
        plano: empresaAtual.plano,
        porte: empresaAtual.porte || "media",
        atuacao: empresaAtual.atuacao || "servicos",
      });
      setEmpresaAtual(atualizada);
      await carregarEmpresas();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function alternarUsuario(usuario) {
    await apiAdmin.statusUsuario(usuario.id, !usuario.ativo);
    setUsuarios(await apiAdmin.usuarios(empresaAtual.id));
  }

  async function redefinirSenha(usuario) {
    const novaSenha = window.prompt(
      `Nova senha para ${usuario.email} (mínimo 12 caracteres):`,
    );
    if (!novaSenha) return;
    if (novaSenha.length < 12) {
      setErro("A nova senha deve ter ao menos 12 caracteres.");
      return;
    }
    try {
      await apiAdmin.redefinirSenha(usuario.id, novaSenha);
      setErro("");
    } catch (falha) {
      setErro(falha.message);
    }
  }

  if (checando) {
    return (
      <main className="entrada">
        <p className="aviso">Verificando sessão…</p>
      </main>
    );
  }

  if (!autenticado) {
    return <Navigate to="/?perfil=superadmin" replace />;
  }

  return (
    <main className="container admin">
      <header className="admin__cabecalho">
        <div>
          <p className="entrada__eyebrow">Operação global</p>
          <h1>Empresas e usuários</h1>
        </div>
        <button
          className="botao botao--fantasma"
          type="button"
          onClick={() => {
            sessaoAdmin.limpar();
            setAutenticado(false);
          }}
        >
          Sair
        </button>
      </header>

      <p className="erro" role="alert">
        {erro}
      </p>
      <div className="admin__grade">
        <section className="superficie">
          <h2 className="secao-titulo">Nova empresa</h2>
          <form onSubmit={criarEmpresa}>
            <div className="campo">
              <label>Razão social</label>
              <input
                value={empresaForm.razao_social}
                onChange={(e) =>
                  setEmpresaForm({ ...empresaForm, razao_social: e.target.value })
                }
                required
              />
            </div>
            <div className="campo">
              <label>CNPJ (14 dígitos)</label>
              <input
                inputMode="numeric"
                value={empresaForm.cnpj}
                onChange={(e) =>
                  setEmpresaForm({ ...empresaForm, cnpj: e.target.value })
                }
                required
              />
            </div>
            <div className="campo">
              <label>Plano</label>
              <select
                value={empresaForm.plano}
                onChange={(e) =>
                  setEmpresaForm({ ...empresaForm, plano: e.target.value })
                }
              >
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="campo">
              <label>Porte</label>
              <select
                value={empresaForm.porte}
                onChange={(e) =>
                  setEmpresaForm({ ...empresaForm, porte: e.target.value })
                }
              >
                <option value="micro">Micro</option>
                <option value="pequena">Pequena</option>
                <option value="media">Média</option>
                <option value="grande">Grande</option>
              </select>
            </div>
            <div className="campo">
              <label>Atuação</label>
              <select
                value={empresaForm.atuacao}
                onChange={(e) =>
                  setEmpresaForm({ ...empresaForm, atuacao: e.target.value })
                }
              >
                <option value="saude">Saúde</option>
                <option value="industria">Indústria</option>
                <option value="servicos">Serviços</option>
                <option value="comercio">Comércio</option>
                <option value="tecnologia">Tecnologia</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <button className="botao" type="submit">
              Criar empresa
            </button>
          </form>
        </section>

        <section className="superficie">
          <h2 className="secao-titulo">Empresas</h2>
          <div className="admin__lista">
            {empresas.map((empresa) => (
              <div
                className={`admin__item ${empresaAtual?.id === empresa.id ? "admin__item--ativo" : ""}`}
                key={empresa.id}
              >
                <button type="button" onClick={() => setEmpresaAtual(empresa)}>
                  <strong>{empresa.razao_social}</strong>
                  <span>
                    {empresa.total_usuarios} usuário(s) · {empresa.plano} ·{" "}
                    {empresa.porte || "media"} · {empresa.atuacao || "servicos"}
                  </span>
                </button>
                <button
                  className="botao botao--fantasma"
                  type="button"
                  onClick={() => alternarEmpresa(empresa)}
                >
                  {empresa.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {empresaAtual ? (
        <div className="admin__grade">
          <section className="superficie">
            <h2 className="secao-titulo">Plano e perfil · {empresaAtual.razao_social}</h2>
            <form onSubmit={salvarMetaEmpresa}>
              <div className="campo">
                <label>Plano</label>
                <select
                  value={empresaAtual.plano}
                  onChange={(e) =>
                    setEmpresaAtual({ ...empresaAtual, plano: e.target.value })
                  }
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="campo">
                <label>Porte</label>
                <select
                  value={empresaAtual.porte || "media"}
                  onChange={(e) =>
                    setEmpresaAtual({ ...empresaAtual, porte: e.target.value })
                  }
                >
                  <option value="micro">Micro</option>
                  <option value="pequena">Pequena</option>
                  <option value="media">Média</option>
                  <option value="grande">Grande</option>
                </select>
              </div>
              <div className="campo">
                <label>Atuação</label>
                <select
                  value={empresaAtual.atuacao || "servicos"}
                  onChange={(e) =>
                    setEmpresaAtual({ ...empresaAtual, atuacao: e.target.value })
                  }
                >
                  <option value="saude">Saúde</option>
                  <option value="industria">Indústria</option>
                  <option value="servicos">Serviços</option>
                  <option value="comercio">Comércio</option>
                  <option value="tecnologia">Tecnologia</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <button className="botao" type="submit">
                Salvar perfil da empresa
              </button>
            </form>
          </section>

          <section className="superficie">
            <h2 className="secao-titulo">Novo usuário · {empresaAtual.razao_social}</h2>
            <form onSubmit={criarUsuario}>
              <div className="campo">
                <label>Nome</label>
                <input
                  value={usuarioForm.nome}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, nome: e.target.value })
                  }
                  required
                />
              </div>
              <div className="campo">
                <label>E-mail</label>
                <input
                  type="email"
                  value={usuarioForm.email}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="campo">
                <label>Senha inicial (12+)</label>
                <input
                  type="password"
                  minLength={12}
                  value={usuarioForm.senha}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, senha: e.target.value })
                  }
                  required
                />
              </div>
              <div className="campo">
                <label>Papel</label>
                <select
                  value={usuarioForm.papel}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, papel: e.target.value })
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="gestor">Gestor</option>
                  <option value="crp">CRP</option>
                </select>
              </div>
              <button className="botao" type="submit">
                Criar usuário
              </button>
            </form>
          </section>
          <section className="superficie">
            <h2 className="secao-titulo">Usuários</h2>
            <div className="admin__lista">
              {usuarios.map((usuario) => (
                <div className="admin__item" key={usuario.id}>
                  <div>
                    <strong>{usuario.nome}</strong>
                    <span>
                      {usuario.email} · {usuario.papel}
                    </span>
                  </div>
                  <div className="admin__acoes">
                    <button
                      className="botao botao--fantasma"
                      type="button"
                      onClick={() => redefinirSenha(usuario)}
                    >
                      Senha
                    </button>
                    <button
                      className="botao botao--fantasma"
                      type="button"
                      onClick={() => alternarUsuario(usuario)}
                    >
                      {usuario.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
