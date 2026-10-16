"""Painel agregado por GHE. Sprint: S6 | Risco: R1 + R2.

Contrato consumido por fetchPainel() em psyra_dashboard.jsx:
    GET /v1/empresas/{empresa_id}/coletas/{coleta_id}/painel

Duas travas de privacidade em série: agregação no motor (scoring.mascarar) e
supressão na view do banco (vw_painel_ghe). Nenhuma rota devolve linha
individual — isso é garantido por teste (tests/test_privacidade.py).
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..auditoria import registrar
from ..capital_risco import calcular_capital_risco, plano_permite_capital
from ..config import config
from ..db import buscar_todos, buscar_um, executar
from ..deps import Conexao, Usuario, exigir_empresa
from ..instrumento import carregar_instrumento
from ..schemas import CapitalRiscoSaida, PainelSaida
from ..qualidade import SEG_POR_ITEM_MIN, ritmo_por_parte
from ..qualidade import VERSAO as VERSAO_QUALIDADE
from ..scoring import agregar_ghe, mascarar

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/empresas", tags=["painel"])

# Ações sugeridas por dimensão — insumo para o PGR, NUNCA o PGR final.
_ACOES_POR_BLOCO: dict[str, str] = {
    "A": "Revisar dimensionamento de equipe e distribuição de metas do grupo.",
    "B": "Instituir pausas assistidas e rodízio em atividades de alta carga emocional.",
    "C": "Ampliar margem de decisão do grupo sobre método e ritmo de trabalho.",
    "D": "Publicar descrição de papel e critérios de avaliação por função.",
    "E": "Capacitar lideranças em escuta e criar canal de reporte sem retaliação.",
    "F": "Revisar política de reconhecimento e trilha de desenvolvimento do grupo.",
    "G": "Acionar comitê de ética; reforçar canal de denúncia e protocolo antiassédio.",
    "H": "Definir política de desconexão fora da jornada e limites de acionamento.",
    "I": "Estruturar comunicação formal de mudanças com antecedência mínima.",
    "J": "Encaminhar avaliação clínica coletiva com a psicóloga responsável (CRP).",
}


def _excluir_sinalizadas(conexao: Any, empresa_id: str) -> bool:
    """Política da empresa (Configurações): tirar do cálculo as respostas sinalizadas."""
    linha = buscar_um(conexao, "SELECT excluir_sinalizadas FROM empresa WHERE id = ?", (empresa_id,))
    return bool(int((linha or {}).get("excluir_sinalizadas", 1) or 0))


def _recalcular(conexao: Any, coleta_id: str, instrumento: str, excluir: bool = True) -> None:
    """Recalcula e persiste `resultado_ghe` para todos os GHEs da coleta.

    Respostas sinalizadas pela verificação de qualidade saem do índice do grupo quando a empresa
    escolhe isso E o grupo continua com n ≥ N_MINIMO válidas; senão, entram todas (o grupo nunca
    é calculado com menos de 5 pessoas). Sprint: S10 | Risco: R1/R2
    """
    respostas = buscar_todos(
        conexao,
        "SELECT ghe_id, likert_json, texto_anonimizado, sinalizada FROM resposta WHERE coleta_id = ?",
        (coleta_id,),
    )
    por_ghe: dict[str, list[dict[str, Any]]] = {}
    for linha in respostas:
        por_ghe.setdefault(linha["ghe_id"], []).append(
            {
                "likert": json.loads(linha["likert_json"]),
                "texto": linha["texto_anonimizado"],
                "sinalizada": bool(int(linha.get("sinalizada") or 0)),
            }
        )

    for ghe_id, itens in por_ghe.items():
        validas = [item for item in itens if not item["sinalizada"]]
        usar = itens
        if excluir and len(validas) < len(itens) and len(validas) >= config.N_MINIMO_GHE:
            usar = validas
        try:
            resultado = agregar_ghe(usar, instrumento)
        except ValueError as erro:
            logger.error("GHE %s sem resposta valida: %s", ghe_id, erro)
            continue
        resultado["n_respostas"] = len(itens)
        n_excluidas = len(itens) - len(usar)
        executar(
            conexao,
            "INSERT INTO resultado_ghe (id, coleta_id, ghe_id, n_respostas, "
            "indice_likert, indice_texto, divergencia, nivel_risco, fatores_json, "
            "motor_versao, n_excluidas, calculado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?, datetime('now')) "
            "ON CONFLICT(coleta_id, ghe_id) DO UPDATE SET "
            "n_respostas=excluded.n_respostas, n_excluidas=excluded.n_excluidas,"
            " indice_likert=excluded.indice_likert, indice_texto=excluded.indice_texto,"
            " divergencia=excluded.divergencia, nivel_risco=excluded.nivel_risco,"
            " fatores_json=excluded.fatores_json, calculado_em=datetime('now')",
            (
                uuid.uuid4().hex,
                coleta_id,
                ghe_id,
                resultado["n_respostas"],
                resultado["indice_likert"],
                resultado["indice_texto"],
                resultado["divergencia"],
                resultado["nivel_risco"],
                json.dumps(resultado["fatores"], ensure_ascii=False),
                resultado["motor_versao"],
                n_excluidas,
            ),
        )


def _acao_do_bloco(instrumento_codigo: str, bloco: str) -> str:
    """Ação sugerida para a dimensão dominante do grupo.

    Lê primeiro o `acao_sugerida` do próprio instrumento: com mais de um
    instrumento em uso (NR-1 e derivados), a ação pertence ao instrumento, não
    ao router. Cai no mapa NR-1 quando o instrumento não declara ação.
    """
    try:
        instrumento = carregar_instrumento(instrumento_codigo)
        for item in instrumento["blocos"]:
            if item["codigo"] == bloco and item.get("acao_sugerida"):
                return str(item["acao_sugerida"])
    except (OSError, KeyError) as erro:
        logger.error("falha ao ler acao do instrumento %s: %s", instrumento_codigo, erro)
    return _ACOES_POR_BLOCO.get(bloco, "Revisar com a área responsável.")


@router.get("/{empresa_id}/coletas/{coleta_id}/painel", response_model=PainelSaida)
def obter_painel(
    empresa_id: str, coleta_id: str, usuario: Usuario, conexao: Conexao
) -> PainelSaida:
    """Devolve o painel agregado da coleta. Risco: R2 — GHE com n<5 vem mascarado."""
    exigir_empresa(usuario, empresa_id)
    coleta = buscar_um(
        conexao,
        "SELECT id, titulo, status, instrumento, origem_dados, aberta_em FROM coleta "
        "WHERE id = ? AND empresa_id = ?",
        (coleta_id, empresa_id),
    )
    if not coleta:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "coleta nao encontrada")

    _recalcular(conexao, coleta_id, coleta["instrumento"], _excluir_sinalizadas(conexao, empresa_id))
    linhas = buscar_todos(
        conexao,
        "SELECT * FROM vw_painel_ghe WHERE coleta_id = ? AND empresa_id = ? "
        "ORDER BY ghe_codigo",
        (coleta_id, empresa_id),
    )

    ghes: list[dict[str, Any]] = []
    revelador: list[dict[str, Any]] = []
    plano: list[dict[str, Any]] = []
    visiveis: list[dict[str, Any]] = []

    for linha in linhas:
        base = {
            "codigo": linha["ghe_codigo"],
            "nome": linha["ghe_nome"],
            "setor": linha["ghe_setor"],
            "n_respostas": linha["n_respostas"],
        }
        if linha["mascarado"]:
            ghes.append({**base, **mascarar({"n_respostas": linha["n_respostas"]})})
            continue

        fatores = json.loads(linha["fatores_json"] or "[]")
        divergencia = linha["divergencia"]
        item = {
            **base,
            "indice_likert": linha["indice_likert"],
            "indice_texto": linha["indice_texto"],
            "divergencia": divergencia,
            "nivel_risco": linha["nivel_risco"],
            "fatores": fatores,
            "mascarado": False,
            "motor_versao": linha["motor_versao"],
            "n_excluidas": int(linha.get("n_excluidas") or 0),
        }
        ghes.append(item)
        visiveis.append(item)

        if divergencia is not None and abs(divergencia) >= 12.0:
            revelador.append(
                {
                    "ghe": linha["ghe_nome"],
                    "indice_likert": linha["indice_likert"],
                    "indice_texto": linha["indice_texto"],
                    "divergencia": divergencia,
                    "leitura": (
                        "O texto livre indica exposição maior do que a escala Likert."
                        if divergencia > 0
                        else "A escala indica exposição maior do que o texto livre."
                    ),
                }
            )

        if linha["nivel_risco"] in ("alto", "moderado") and fatores:
            bloco = fatores[0]["bloco"]
            plano.append(
                {
                    "ghe": linha["ghe_nome"],
                    "prioridade": "alta" if linha["nivel_risco"] == "alto" else "media",
                    "dimensao": fatores[0]["dimensao"],
                    "acao_sugerida": _acao_do_bloco(coleta["instrumento"], bloco),
                    "status": "aguardando validação CRP",
                }
            )

    total_respostas = sum(item["n_respostas"] for item in ghes)
    distribuicao = {"baixo": 0, "moderado": 0, "alto": 0}
    for item in visiveis:
        distribuicao[item["nivel_risco"]] += 1
    indice_geral = (
        round(sum(item["indice_likert"] for item in visiveis) / len(visiveis), 1)
        if visiveis
        else None
    )

    registrar(
        conexao, usuario["id"], "consultar_painel", f"coleta:{coleta_id}", empresa_id
    )

    return PainelSaida(
        empresa={"id": empresa_id, "nome": usuario["razao_social"]},
        coleta={
            "id": coleta["id"],
            "titulo": coleta["titulo"],
            "status": coleta["status"],
            "origem_dados": coleta["origem_dados"],
            "aberta_em": coleta["aberta_em"],
        },
        resumo={
            "total_respostas": total_respostas,
            "ghes_avaliados": len(ghes),
            "ghes_visiveis": len(visiveis),
            "ghes_mascarados": len(ghes) - len(visiveis),
            "respostas_fora_do_calculo": sum(item.get("n_excluidas", 0) for item in visiveis),
            "indice_geral": indice_geral,
            "distribuicao_risco": distribuicao,
        },
        ghes=ghes,
        revelador=revelador,
        conformidade={
            "nr1_inventario_riscos": len(visiveis) > 0,
            "resultado_por_ghe": True,
            "k_anonimato_n_minimo": config.N_MINIMO_GHE,
            "anonimizacao_texto_livre": True,
            "trilha_auditoria_sha256": True,
            "cep_aprovado": config.CEP_APROVADO,
            "pgr_assinado_crp": False,
            "observacao": (
                "PGR só é emitido após validação e assinatura de psicóloga com CRP ativo."
            ),
        },
        plano_acao=plano,
        selo={
            "provisorio": True,
            "origem_dados": coleta["origem_dados"],
            "motor": config.MOTOR_VERSAO,
            "aviso": (
                "DADOS PROVISÓRIOS — motor de regra determinístico, não é modelo "
                "treinado. Não usar como resultado de pesquisa nem em material "
                "comercial. Substituição prevista: XGBoost + MentalBERT-PT + SHAP "
                "após aprovação do CEP e coleta real."
            ),
        },
    )


@router.get(
    "/{empresa_id}/coletas/{coleta_id}/capital-risco",
    response_model=CapitalRiscoSaida,
)
def obter_capital_risco(
    empresa_id: str, coleta_id: str, usuario: Usuario, conexao: Conexao
) -> CapitalRiscoSaida:
    """Estimativa ilustrativa de capital em risco — planos Professional/Enterprise."""
    exigir_empresa(usuario, empresa_id)
    empresa = buscar_um(
        conexao,
        "SELECT id, plano, porte, atuacao FROM empresa WHERE id = ? AND ativo = 1",
        (empresa_id,),
    )
    if not empresa:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "empresa nao encontrada")
    plano = str(empresa.get("plano") or "starter")
    if not plano_permite_capital(plano):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={
                "codigo": "plano_insuficiente",
                "mensagem": (
                    "Estimativa de capital em risco disponível no plano Padrão ou Panorama."
                ),
            },
        )

    coleta = buscar_um(
        conexao,
        "SELECT id, instrumento FROM coleta WHERE id = ? AND empresa_id = ?",
        (coleta_id, empresa_id),
    )
    if not coleta:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "coleta nao encontrada")

    _recalcular(conexao, coleta_id, coleta["instrumento"], _excluir_sinalizadas(conexao, empresa_id))
    linhas = buscar_todos(
        conexao,
        "SELECT g.codigo AS codigo, g.nome AS nome, g.setor AS setor, "
        "g.efetivo AS efetivo, r.n_respostas AS n_respostas, "
        "r.nivel_risco AS nivel_risco, "
        "CASE WHEN r.n_respostas >= ? THEN 0 ELSE 1 END AS mascarado "
        "FROM resultado_ghe r "
        "JOIN ghe g ON g.id = r.ghe_id "
        "JOIN coleta c ON c.id = r.coleta_id "
        "WHERE r.coleta_id = ? AND c.empresa_id = ? "
        "ORDER BY g.codigo",
        (config.N_MINIMO_GHE, coleta_id, empresa_id),
    )
    ghes = [
        {
            "codigo": linha["codigo"],
            "nome": linha["nome"],
            "setor": linha["setor"],
            "efetivo": int(linha["efetivo"] or 0),
            "n_respostas": int(linha["n_respostas"] or 0),
            "nivel_risco": linha["nivel_risco"],
            "mascarado": bool(linha["mascarado"]),
        }
        for linha in linhas
    ]
    resultado = calcular_capital_risco(
        ghes,
        porte=str(empresa.get("porte") or "media"),
        atuacao=str(empresa.get("atuacao") or "servicos"),
    )
    registrar(
        conexao,
        usuario["id"],
        "consultar_capital_risco",
        f"coleta:{coleta_id}",
        empresa_id,
    )
    return CapitalRiscoSaida(plano=plano, **resultado)


# ---------------------------------------------------------------- qualidade da coleta
REFERENCIAS_QUALIDADE = [
    "Meade e Craig (2012), Psychological Methods: 10% a 12% de respostas descuidadas numa amostra de estudantes.",
    "Huang et al. (2012), Journal of Business and Psychology: menos de 2 s por item indica pressa.",
    "Bowling et al. (2023), Organizational Research Methods: tempo por página com a regra dos 2 s por item.",
    "Galesic e Bošnjak (2009), Public Opinion Quarterly: questionário longo, menos gente termina e as respostas do fim ficam mais rápidas e uniformes.",
    "Baruch e Holtom (2008), Human Relations: taxa média de resposta de 52,7% em pesquisas com pessoas nas organizações.",
]


@router.get("/{empresa_id}/coletas/{coleta_id}/qualidade")
def obter_qualidade(empresa_id: str, coleta_id: str, usuario: Usuario, conexao: Conexao) -> dict[str, Any]:
    """Participação, evasão, pressa e atenção da coleta — sempre agregado (n ≥ 5).

    Sprint: S10 | Risco: R2 — nenhum dado de resposta individual sai daqui; contagens de
    respostas sinalizadas só aparecem em grupos com 5+ respostas.
    """
    exigir_empresa(usuario, empresa_id)
    coleta = buscar_um(
        conexao, "SELECT id, instrumento FROM coleta WHERE id = ? AND empresa_id = ?", (coleta_id, empresa_id)
    )
    if not coleta:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "coleta nao encontrada")
    n_min = int(config.N_MINIMO_GHE)
    excluir = _excluir_sinalizadas(conexao, empresa_id)
    ghes = buscar_todos(
        conexao, "SELECT id, codigo, nome, setor, efetivo FROM ghe WHERE empresa_id = ? ORDER BY codigo", (empresa_id,)
    )
    respostas = buscar_todos(
        conexao,
        "SELECT ghe_id, sinalizada, qualidade_json, duracao_s, tempos_partes_json, origem_externa "
        "FROM resposta WHERE coleta_id = ?",
        (coleta_id,),
    )
    inicios = buscar_todos(
        conexao,
        "SELECT ghe_id, etapa, COUNT(*) AS n FROM coleta_inicio WHERE coleta_id = ? GROUP BY ghe_id, etapa",
        (coleta_id,),
    )
    comecaram_grupo = {linha["ghe_id"]: int(linha["n"]) for linha in inicios if linha["etapa"] == "grupo"}
    abriram = sum(int(linha["n"]) for linha in inicios if linha["etapa"] == "inicio")

    por_ghe: dict[str, list[dict[str, Any]]] = {}
    for linha in respostas:
        por_ghe.setdefault(linha["ghe_id"], []).append(linha)

    def motivos(lista: list[dict[str, Any]]) -> dict[str, int]:
        cont = {"rapida": 0, "linha_reta": 0, "incoerente": 0}
        for linha in lista:
            for m in json.loads(linha.get("qualidade_json") or "{}").get("motivos", []):
                if m in cont:
                    cont[m] += 1
        return cont

    grupos = []
    for g in ghes:
        lista = por_ghe.get(g["id"], [])
        n = len(lista)
        efetivo = int(g["efetivo"] or 0)
        comecou = comecaram_grupo.get(g["id"])
        do_site = sum(1 for linha in lista if not linha.get("origem_externa"))
        mascarado = n < n_min
        sinal = sum(1 for linha in lista if int(linha.get("sinalizada") or 0))
        validas = n - sinal
        excluidas = sinal if (excluir and sinal and validas >= n_min) else 0
        grupos.append({
            "codigo": g["codigo"],
            "nome": g["nome"],
            "setor": g["setor"],
            "efetivo": efetivo,
            "comecaram": comecou,
            "respostas": n,
            "participacao": round(n / efetivo, 3) if efetivo else None,
            "conclusao": round(do_site / comecou, 3) if comecou and comecou >= do_site else None,
            "mascarado": mascarado,
            "sinalizadas": None if mascarado else sinal,
            "motivos": None if mascarado else motivos(lista),
            "fora_do_calculo": None if mascarado else excluidas,
            "faltam_para_5": max(0, n_min - n),
        })

    total = len(respostas)
    do_site_total = sum(1 for linha in respostas if not linha.get("origem_externa"))
    efetivo_total = sum(item["efetivo"] for item in grupos)
    com_tempo = [linha for linha in respostas if linha.get("tempos_partes_json")]
    duracoes = sorted(int(linha["duracao_s"]) for linha in com_tempo if linha.get("duracao_s") is not None)
    ritmo = (
        ritmo_por_parte([json.loads(linha["tempos_partes_json"]) for linha in com_tempo], coleta["instrumento"])
        if len(com_tempo) >= n_min
        else []
    )
    visivel = total >= n_min
    sinal_total = sum(1 for linha in respostas if int(linha.get("sinalizada") or 0))
    resumo = {
        "respostas": total,
        "efetivo": efetivo_total,
        "participacao": round(total / efetivo_total, 3) if efetivo_total else None,
        "abriram": abriram or None,
        "conclusao": round(do_site_total / abriram, 3) if abriram and abriram >= do_site_total else None,
        "sinalizadas": sinal_total if visivel else None,
        "motivos": motivos(respostas) if visivel else None,
        "fora_do_calculo": sum(item["fora_do_calculo"] or 0 for item in grupos),
        "tempo_mediano_min": round(duracoes[len(duracoes) // 2] / 60, 1) if len(duracoes) >= n_min else None,
        "excluir_sinalizadas": excluir,
        "n_minimo": n_min,
    }
    registrar(conexao, usuario["id"], "consultar_qualidade", f"coleta:{coleta_id}", empresa_id)
    return {
        "resumo": resumo,
        "grupos": grupos,
        "ritmo_por_parte": ritmo,
        "seg_por_item_min": SEG_POR_ITEM_MIN,
        "versao": VERSAO_QUALIDADE,
        "referencias": REFERENCIAS_QUALIDADE,
    }
