"""Plano de ação explicável, projeção de perda e correções do motor (17/10/2026).

Sprint: S10 | Risco: R1/R2
"""

from __future__ import annotations

from app.capital_risco import (
    perda_evitavel_mensal,
    perda_mensal_fiemg,
    projetar_perda,
)
from app.plano_acao import explicar_grupo, responsavel_sugerido
from app.scoring import agregar_ghe, calcular_sinal_texto

FATORES = [
    {
        "bloco": "C",
        "dimensao": "Clareza de papel e metas",
        "indice": 83.3,
        "contribuicao": 3.0,
    },
    {
        "bloco": "F",
        "dimensao": "Relações interpessoais e assédio",
        "indice": 77.6,
        "contribuicao": 3.5,
    },
    {
        "bloco": "I",
        "dimensao": "Equilíbrio trabalho-vida",
        "indice": 35.0,
        "contribuicao": -1.5,
    },
]


def _grupo(**extra):
    base = {
        "nome": "Atendimento",
        "n_respostas": 12,
        "indice_likert": 78.0,
        "indice_texto": 92.7,
        "divergencia": 14.7,
        "nivel_risco": "alto",
        "fatores": [dict(f) for f in FATORES],
    }
    base.update(extra)
    return base


# ------------------------------------------------------------------ plano de ação
def test_plano_ordena_pela_contribuicao_e_explica() -> None:
    item = explicar_grupo(_grupo(), lambda bloco: f"ação {bloco}")
    assert item is not None
    assert item["dimensao"] == "Relações interpessoais e assédio"  # maior contribuição
    assert [a["bloco"] for a in item["acoes"]] == ["F", "C"]  # só as dimensões ≥ 40
    assert item["prazo_dias"] == 30 and item["prioridade"] == "alta"
    assert "+3,5" in item["por_que"] and "28,0" in item["por_que"]
    assert item["texto_livre"]["divergencia"] == 14.7
    assert item["acoes"][0]["responsavel"] == "Comitê de ética e RH"
    assert "perda_evitavel_mensal" not in item  # plano gratuito não recebe valor em R$


def test_plano_inclui_impacto_so_quando_permitido() -> None:
    item = explicar_grupo(_grupo(), lambda b: "x", incluir_financeiro=True)
    assert item["perda_evitavel_mensal"] == perda_evitavel_mensal(12, "alto")
    assert item["perda_evitavel_mensal"] > 0


def test_plano_ignora_baixo_e_grupo_pequeno() -> None:
    assert explicar_grupo(_grupo(nivel_risco="baixo"), lambda b: "x") is None
    assert (
        explicar_grupo(_grupo(n_respostas=4), lambda b: "x") is None
    )  # R2: n < 5 nunca entra
    assert explicar_grupo(_grupo(fatores=[]), lambda b: "x") is None


def test_plano_moderado_tem_prazo_de_90_dias_e_sem_texto_quando_divergencia_pequena() -> (
    None
):
    item = explicar_grupo(
        _grupo(nivel_risco="moderado", indice_likert=50.0, divergencia=3.0), lambda b: "x"
    )
    assert item["prazo_dias"] == 90
    assert item["texto_livre"] is None
    assert "moderado para baixo" in item["meta"]


def test_responsavel_por_palavra_chave() -> None:
    assert responsavel_sugerido("Sinais de saúde e esgotamento").startswith("Psicóloga")
    assert responsavel_sugerido("Carga de trabalho").startswith("Gestor da área e RH")
    assert responsavel_sugerido("Algo novo") == "RH e SESMT"


# ------------------------------------------------------------------ projeção
def test_projecao_sem_acao_cresce_linear_e_com_plano_economiza() -> None:
    detalhes = [
        {
            "afetados": 10,
            "nivel_risco": "alto",
            "perda_mensal": perda_mensal_fiemg(10, "alto"),
        },
        {
            "afetados": 8,
            "nivel_risco": "moderado",
            "perda_mensal": perda_mensal_fiemg(8, "moderado"),
        },
        {
            "afetados": 6,
            "nivel_risco": "baixo",
            "perda_mensal": perda_mensal_fiemg(6, "baixo"),
        },
    ]
    proj = projetar_perda(detalhes)
    meses = proj["meses"]
    assert len(meses) == 12
    assert (
        meses[0]["com_plano_mensal"] == meses[0]["sem_acao_mensal"]
    )  # sem efeito no 1º mês
    assert meses[-1]["sem_acao_acumulado"] == round(proj["perda_mensal_atual"] * 12, 2)
    assert (
        meses[-1]["com_plano_mensal"] == proj["perda_mensal_com_plano"]
    )  # efeito completo
    assert proj["economia_12_meses"] > 0
    assert all(m["com_plano_acumulado"] <= m["sem_acao_acumulado"] for m in meses)


def test_projecao_vazia_nao_quebra() -> None:
    proj = projetar_perda([])
    assert proj["economia_12_meses"] == 0
    assert proj["meses"][0]["sem_acao_mensal"] == 0


def test_baixo_nao_tem_perda_evitavel() -> None:
    assert perda_evitavel_mensal(10, "baixo") == 0


# ------------------------------------------------------------------ motor
def test_negacao_vale_para_cada_ocorrencia() -> None:
    negado = calcular_sinal_texto("não estou exausto hoje, foi uma semana tranquila")
    duas = calcular_sinal_texto(
        "não estou exausto no começo, mas no fim do dia fico exausto"
    )
    afirmado = calcular_sinal_texto(
        "estou exausto no começo e no fim do dia fico exausto"
    )
    assert negado < duas < afirmado


def test_contribuicao_segue_a_media_ponderada_do_motor() -> None:
    from app.instrumento import carregar_instrumento

    instrumento = carregar_instrumento("psyra_form_v1")
    pesos = {b["codigo"]: float(b.get("peso", 1.0)) for b in instrumento["blocos"]}
    respostas = [
        {
            "likert": {f"{b}{i}": 1 + (i % 5) for b in "ABCDEFGHIJ" for i in range(1, 8)},
            "texto": None,
        }
    ] * 6
    resultado = agregar_ghe(respostas, "psyra_form_v1")
    soma = sum(pesos.values())
    for fator in resultado["fatores"]:
        esperado = round(pesos[fator["bloco"]] * (fator["indice"] - 50.0) / soma, 1)
        assert abs(fator["contribuicao"] - esperado) <= 0.11
    # o sinal da contribuição acompanha o lado do neutro
    assert all(
        (f["contribuicao"] >= 0) == (f["indice"] >= 50) for f in resultado["fatores"]
    )
