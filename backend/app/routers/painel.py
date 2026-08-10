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


def _recalcular(conexao: Any, coleta_id: str, instrumento: str) -> None:
    """Recalcula e persiste `resultado_ghe` para todos os GHEs da coleta."""
    respostas = buscar_todos(
        conexao,
        "SELECT ghe_id, likert_json, texto_anonimizado FROM resposta WHERE coleta_id = ?",
        (coleta_id,),
    )
    por_ghe: dict[str, list[dict[str, Any]]] = {}
    for linha in respostas:
        por_ghe.setdefault(linha["ghe_id"], []).append(
            {
                "likert": json.loads(linha["likert_json"]),
                "texto": linha["texto_anonimizado"],
            }
        )

    for ghe_id, itens in por_ghe.items():
        try:
            resultado = agregar_ghe(itens, instrumento)
        except ValueError as erro:
            logger.error("GHE %s sem resposta valida: %s", ghe_id, erro)
            continue
        executar(
            conexao,
            "INSERT INTO resultado_ghe (id, coleta_id, ghe_id, n_respostas, "
            "indice_likert, indice_texto, divergencia, nivel_risco, fatores_json, "
            "motor_versao, calculado_em) VALUES (?,?,?,?,?,?,?,?,?,?, datetime('now')) "
            "ON CONFLICT(coleta_id, ghe_id) DO UPDATE SET "
            "n_respostas=excluded.n_respostas,"
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

    _recalcular(conexao, coleta_id, coleta["instrumento"])
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
                    "Estimativa de capital em risco disponível no plano Professional."
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

    _recalcular(conexao, coleta_id, coleta["instrumento"])
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
