"""Estimativa ilustrativa de capital em risco e gate de plano."""

from __future__ import annotations

from app.capital_risco import (
    afetados_estimados,
    calcular_capital_risco,
    plano_permite_capital,
    salario_mensal_estimado,
)
from app.db import conectar, executar


def test_plano_permite_capital() -> None:
    assert plano_permite_capital("professional")
    assert plano_permite_capital("enterprise")
    assert not plano_permite_capital("starter")
    assert not plano_permite_capital(None)


def test_afetados_usa_respostas_quando_efetivo_zero() -> None:
    assert afetados_estimados(0, 8) == 8
    assert afetados_estimados(20, 8) == 8
    assert afetados_estimados(5, 8) == 5


def test_agregacao_por_setor_omite_mascarados() -> None:
    resultado = calcular_capital_risco(
        [
            {
                "codigo": "G1",
                "nome": "TI",
                "setor": "Tecnologia",
                "efetivo": 10,
                "n_respostas": 8,
                "nivel_risco": "alto",
                "mascarado": False,
            },
            {
                "codigo": "G2",
                "nome": "Vendas",
                "setor": "Vendas",
                "efetivo": 12,
                "n_respostas": 6,
                "nivel_risco": "moderado",
                "mascarado": False,
            },
            {
                "codigo": "G3",
                "nome": "Diretoria",
                "setor": "Diretoria",
                "efetivo": 3,
                "n_respostas": 3,
                "nivel_risco": "alto",
                "mascarado": True,
            },
        ],
        porte="media",
        atuacao="tecnologia",
    )
    assert resultado["ghes_considerados"] == 2
    assert resultado["ghes_omitidos_mascarados"] == 1
    assert len(resultado["setores"]) == 2
    assert resultado["perda_mensal_total"] > 0
    assert resultado["perda_anual_total"] == round(
        resultado["perda_mensal_total"] * 12, 2
    )
    assert salario_mensal_estimado("tecnologia", "media", "TI") > 0


def test_api_starter_bloqueia_capital(cliente, sessao_gestor) -> None:
    conexao = conectar()
    try:
        executar(
            conexao,
            "UPDATE empresa SET plano = 'starter' WHERE id = ?",
            (sessao_gestor["empresa_id"],),
        )
    finally:
        conexao.close()

    coletas = cliente.get(
        f"/v1/empresas/{sessao_gestor['empresa_id']}/coletas",
        headers=sessao_gestor["headers"],
    )
    assert coletas.status_code == 200
    coleta_id = coletas.json()[0]["id"]

    resposta = cliente.get(
        f"/v1/empresas/{sessao_gestor['empresa_id']}/coletas/{coleta_id}/capital-risco",
        headers=sessao_gestor["headers"],
    )
    assert resposta.status_code == 403
    assert resposta.json()["detail"]["codigo"] == "plano_insuficiente"

    # restaura para demais testes da sessão
    conexao = conectar()
    try:
        executar(
            conexao,
            "UPDATE empresa SET plano = 'professional' WHERE id = ?",
            (sessao_gestor["empresa_id"],),
        )
    finally:
        conexao.close()


def test_api_professional_retorna_estimativa(cliente, sessao_gestor) -> None:
    conexao = conectar()
    try:
        executar(
            conexao,
            "UPDATE empresa SET plano = 'professional', porte = 'media', "
            "atuacao = 'tecnologia' WHERE id = ?",
            (sessao_gestor["empresa_id"],),
        )
    finally:
        conexao.close()

    login = cliente.post(
        "/v1/auth/login",
        json={"email": "gestor@demo.psyra.ai", "senha": "psyra123"},
    )
    assert login.status_code == 200
    assert login.json()["plano"] == "professional"

    coletas = cliente.get(
        f"/v1/empresas/{sessao_gestor['empresa_id']}/coletas",
        headers=sessao_gestor["headers"],
    )
    coleta_id = coletas.json()[0]["id"]
    resposta = cliente.get(
        f"/v1/empresas/{sessao_gestor['empresa_id']}/coletas/{coleta_id}/capital-risco",
        headers=sessao_gestor["headers"],
    )
    assert resposta.status_code == 200, resposta.text
    corpo = resposta.json()
    assert corpo["versao_estimativa"]
    assert "disclaimer" in corpo
    assert "setores" in corpo
    assert corpo["ghes_omitidos_mascarados"] >= 0
