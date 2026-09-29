// Atividades recentes da empresa (trilha de auditoria resumida).
// Respostas de colaboradores aparecem só agregadas por semana; abaixo do mínimo, sem total.

import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  KeyRound,
  LogIn,
  MessageSquare,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { api } from "../lib/api";

const ICONES = {
  login: LogIn,
  alterar_senha: KeyRound,
  redefinir_senha_usuario: KeyRound,
  criar_usuario: UserPlus,
  ativar_usuario: UserPlus,
  desativar_usuario: UserPlus,
  criar_empresa: Building2,
  atualizar_empresa: Building2,
  ativar_empresa: Building2,
  desativar_empresa: Building2,
};

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function tempoRelativo(iso) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const segundos = Math.round((data.getTime() - Date.now()) / 1000);
  const passos = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
  ];
  const abs = Math.abs(segundos);
  if (abs < 60) return "agora há pouco";
  for (let i = 1; i < passos.length; i += 1) {
    if (abs < passos[i][0]) {
      return relativo.format(Math.round(segundos / passos[i - 1][0]), passos[i][1]);
    }
  }
  return relativo.format(Math.round(segundos / 31557600), "year");
}

const dataCurta = (iso) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(`${iso}T12:00:00`),
  );

export default function AtividadesRecentes({ empresaId }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    api
      .atividades(empresaId)
      .then((resposta) => ativo && setDados(resposta))
      .catch((falha) => ativo && setErro(falha.message));
    return () => {
      ativo = false;
    };
  }, [empresaId]);

  return (
    <div className="grade grade--2 atividades">
      <section className="superficie">
        <h2 className="secao-titulo">
          <Activity size={18} aria-hidden="true" /> Atividades recentes
        </h2>
        <p className="aviso secao-lead">Registradas na trilha de auditoria com hash (LGPD Art. 37).</p>
        {erro ? <p className="erro">{erro}</p> : null}
        {!dados && !erro ? <p className="aviso">Carregando…</p> : null}
        {dados && !dados.eventos.length ? (
          <p className="aviso">Nenhuma atividade registrada ainda.</p>
        ) : null}
        {dados?.eventos.length ? (
          <ul className="linha-tempo">
            {dados.eventos.map((evento, indice) => {
              const Icone = ICONES[evento.tipo] || ShieldCheck;
              return (
                <li key={`${evento.tipo}-${evento.quando}-${indice}`}>
                  <span className="linha-tempo__icone" aria-hidden="true">
                    <Icone size={15} />
                  </span>
                  <span className="linha-tempo__texto">
                    <strong>{evento.titulo}</strong>
                    <small>{tempoRelativo(evento.quando)}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="superficie">
        <h2 className="secao-titulo">
          <MessageSquare size={18} aria-hidden="true" /> Respostas por semana
        </h2>
        <p className="aviso secao-lead">
          Sem horário de resposta individual. Semanas com menos de {dados?.n_minimo ?? 5}{" "}
          respostas não mostram o total.
        </p>
        {dados && !dados.respostas_por_semana.length ? (
          <p className="aviso">Nenhuma resposta recebida pelos canais da plataforma.</p>
        ) : null}
        {dados?.respostas_por_semana.length ? (
          <ul className="semanas">
            {dados.respostas_por_semana.map((semana) => (
              <li key={semana.semana_inicio}>
                <span>Semana de {dataCurta(semana.semana_inicio)}</span>
                {semana.abaixo_do_minimo ? (
                  <em>menos de {dados.n_minimo}</em>
                ) : (
                  <strong className="mono">{semana.total}</strong>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
