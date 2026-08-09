"""Testes de integração da API. Sprint: S6 | Risco: R1/R2."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.instrumento import listar_ids_itens

TOKEN_DEMO = "demo-nr1-2026"


def test_health_declara_motor_provisorio(cliente: TestClient) -> None:
    """O /health expõe versão do motor e o n mínimo de k-anonimato."""
    corpo = cliente.get("/health").json()
    assert corpo["status"] == "ok"
    assert "PROVISORIO" in corpo["motor_risco"]
    assert corpo["n_minimo_ghe"] == 5


def test_formulario_publico_entrega_instrumento_e_consentimento(
    cliente: TestClient,
) -> None:
    """O formulário público traz 10 blocos, bloco K e o texto de consentimento."""
    corpo = cliente.get(f"/v1/coletas/{TOKEN_DEMO}/formulario").json()
    assert len(corpo["instrumento"]["blocos"]) == 10
    assert corpo["instrumento"]["bloco_texto_livre"]["codigo"] == "K"
    assert "anônima" in corpo["instrumento"]["consentimento"]
    assert len(corpo["ghes"]) == 5


def test_formulario_com_token_invalido_retorna_404(cliente: TestClient) -> None:
    """Token inexistente não revela nada."""
    assert cliente.get("/v1/coletas/nao-existe/formulario").status_code == 404


def test_envio_de_resposta_anonima(cliente: TestClient) -> None:
    """Resposta válida é aceita, anonimizada e devolve protocolo."""
    payload = {
        "token_coleta": TOKEN_DEMO,
        "ghe_codigo": "GHE-02",
        "likert": {item: 3 for item in listar_ids_itens()},
        "texto_livre": "Trabalho corrido. Meu email joao@empresa.com nao deve aparecer.",
        "consentimento": True,
    }
    resposta = cliente.post("/v1/coleta", json=payload)
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert len(corpo["protocolo"]) == 8
    assert corpo["anonimizacao"]["texto_recebido"] is True


def test_envio_sem_consentimento_e_recusado(cliente: TestClient) -> None:
    """Sem consentimento (TCLE) a resposta é rejeitada na validação."""
    payload = {
        "token_coleta": TOKEN_DEMO,
        "ghe_codigo": "GHE-02",
        "likert": {item: 3 for item in listar_ids_itens()},
        "consentimento": False,
    }
    assert cliente.post("/v1/coleta", json=payload).status_code == 422


def test_envio_com_likert_fora_da_escala_e_recusado(cliente: TestClient) -> None:
    """Nota 9 é barrada antes de tocar no banco."""
    itens = {item: 3 for item in listar_ids_itens()}
    itens["A1"] = 9
    payload = {
        "token_coleta": TOKEN_DEMO,
        "ghe_codigo": "GHE-02",
        "likert": itens,
        "consentimento": True,
    }
    assert cliente.post("/v1/coleta", json=payload).status_code == 422


def test_envio_com_ghe_inexistente_e_recusado(cliente: TestClient) -> None:
    """GHE fora da empresa retorna 400."""
    payload = {
        "token_coleta": TOKEN_DEMO,
        "ghe_codigo": "GHE-99",
        "likert": {item: 3 for item in listar_ids_itens()},
        "consentimento": True,
    }
    assert cliente.post("/v1/coleta", json=payload).status_code == 400


def test_painel_retorna_selo_provisorio_e_agregados(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    """Painel traz resumo, GHEs, Revelador, conformidade e selo PROVISÓRIO."""
    empresa = sessao_gestor["empresa_id"]
    coletas = cliente.get(
        f"/v1/empresas/{empresa}/coletas", headers=sessao_gestor["headers"]
    ).json()
    painel = cliente.get(
        f"/v1/empresas/{empresa}/coletas/{coletas[0]['id']}/painel",
        headers=sessao_gestor["headers"],
    ).json()

    assert painel["selo"]["provisorio"] is True
    assert painel["selo"]["origem_dados"] == "sintetico"
    assert painel["resumo"]["total_respostas"] > 0
    assert painel["conformidade"]["pgr_assinado_crp"] is False
    assert painel["resumo"]["ghes_mascarados"] >= 1


def test_auditoria_mantem_cadeia_integra(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    """A cadeia SHA-256 de auditoria valida após as operações do teste."""
    empresa = sessao_gestor["empresa_id"]
    corpo = cliente.get(
        f"/v1/empresas/{empresa}/auditoria", headers=sessao_gestor["headers"]
    ).json()
    assert corpo["integridade"]["integra"] is True
    assert corpo["integridade"]["total"] > 0
