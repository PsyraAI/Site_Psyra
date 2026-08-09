"""Integração Google Forms: isolamento multiempresa, HMAC e idempotência."""

from __future__ import annotations

import hashlib
import hmac
import json
import uuid

from fastapi.testclient import TestClient

from app.db import buscar_um, conectar, executar
from app.instrumento import carregar_instrumento
from app.security import gerar_hash_senha


def _criar_coleta_forms(
    cliente: TestClient,
    empresa_id: str,
    headers: dict[str, str],
) -> dict:
    resposta = cliente.post(
        f"/v1/empresas/{empresa_id}/coletas",
        headers=headers,
        json={
            "titulo": f"Forms {uuid.uuid4().hex[:6]}",
            "origem_dados": "teste",
            "instrumento": "psyra_form_v1",
        },
    )
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def _configurar(
    cliente: TestClient,
    empresa_id: str,
    coleta_id: str,
    headers: dict[str, str],
    form_id: str | None = None,
) -> dict:
    form_id = form_id or f"FORM_{uuid.uuid4().hex}"
    resposta = cliente.put(
        f"/v1/empresas/{empresa_id}/coletas/{coleta_id}/google-form",
        headers=headers,
        json={"url": f"https://docs.google.com/forms/d/e/{form_id}/viewform"},
    )
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _payload(response_id: str) -> dict:
    instrumento = carregar_instrumento("psyra_form_v1")
    respostas = [
        {
            "item_id": "setor",
            "titulo": instrumento["campo_grupo"]["pergunta"],
            "valor": "Tecnologia da Informação (TI)",
        }
    ]
    for bloco in instrumento["blocos"]:
        for item in bloco["itens"]:
            respostas.append(
                {
                    "item_id": str(item["coluna_csv"]),
                    "titulo": item["texto"],
                    "valor": instrumento["escala"]["rotulos"][2],
                }
            )
    respostas.append(
        {
            "item_id": "texto",
            "titulo": instrumento["bloco_texto_livre"]["pergunta"],
            "valor": "Estou cansado. Meu email teste@empresa.com não pode aparecer.",
        }
    )
    return {
        "response_id": response_id,
        "submitted_at": "2026-08-06T20:00:00.000Z",
        "answers": respostas,
        "empresa_id": "empresa-forjada",
        "email": "respondente@empresa.com",
    }


def _enviar_webhook(
    cliente: TestClient,
    coleta_id: str,
    segredo: str,
    payload: dict,
):
    corpo = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    assinatura = hmac.new(segredo.encode("utf-8"), corpo, hashlib.sha256).hexdigest()
    return cliente.post(
        f"/v1/integracoes/google-forms/{coleta_id}",
        content=corpo,
        headers={
            "Content-Type": "application/json",
            "X-Psyra-Signature": assinatura,
        },
    )


def test_configuracao_forms_exige_empresa_do_jwt(
    cliente: TestClient,
    sessao_gestor: dict,
) -> None:
    coleta = _criar_coleta_forms(
        cliente,
        sessao_gestor["empresa_id"],
        sessao_gestor["headers"],
    )
    resposta = cliente.put(
        f"/v1/empresas/empresa-de-terceiro/coletas/{coleta['id']}/google-form",
        headers=sessao_gestor["headers"],
        json={"url": "https://docs.google.com/forms/d/e/FORM_TERCEIRO/viewform"},
    )
    assert resposta.status_code == 403


def test_um_form_nao_pode_ser_vinculado_a_duas_coletas(
    cliente: TestClient,
    sessao_gestor: dict,
) -> None:
    empresa = sessao_gestor["empresa_id"]
    headers = sessao_gestor["headers"]
    primeira = _criar_coleta_forms(cliente, empresa, headers)
    segunda = _criar_coleta_forms(cliente, empresa, headers)
    form_id = f"FORM_UNICO_{uuid.uuid4().hex}"
    _configurar(cliente, empresa, primeira["id"], headers, form_id)
    conflito = cliente.put(
        f"/v1/empresas/{empresa}/coletas/{segunda['id']}/google-form",
        headers=headers,
        json={"url": f"https://docs.google.com/forms/d/e/{form_id}/viewform"},
    )
    assert conflito.status_code == 409


def test_webhook_rejeita_assinatura_invalida(
    cliente: TestClient,
    sessao_gestor: dict,
) -> None:
    empresa = sessao_gestor["empresa_id"]
    coleta = _criar_coleta_forms(cliente, empresa, sessao_gestor["headers"])
    _configurar(cliente, empresa, coleta["id"], sessao_gestor["headers"])
    resposta = cliente.post(
        f"/v1/integracoes/google-forms/{coleta['id']}",
        json=_payload(uuid.uuid4().hex),
        headers={"X-Psyra-Signature": "invalida"},
    )
    assert resposta.status_code == 401


def test_webhook_e_idempotente_e_anonimiza_texto(
    cliente: TestClient,
    sessao_gestor: dict,
) -> None:
    empresa = sessao_gestor["empresa_id"]
    coleta = _criar_coleta_forms(cliente, empresa, sessao_gestor["headers"])
    config = _configurar(cliente, empresa, coleta["id"], sessao_gestor["headers"])
    payload = _payload(f"resposta-{uuid.uuid4().hex}")

    primeira = _enviar_webhook(
        cliente,
        coleta["id"],
        config["webhook_secret"],
        payload,
    )
    segunda = _enviar_webhook(
        cliente,
        coleta["id"],
        config["webhook_secret"],
        payload,
    )
    assert primeira.status_code == 201, primeira.text
    assert primeira.json()["duplicada"] is False
    assert segunda.status_code == 201
    assert segunda.json()["duplicada"] is True
    assert primeira.json()["protocolo"] == segunda.json()["protocolo"]

    conexao = conectar()
    linha = buscar_um(
        conexao,
        "SELECT texto_anonimizado, COUNT(*) AS total FROM resposta "
        "WHERE coleta_id = ? AND id_externo = ?",
        (coleta["id"], payload["response_id"]),
    )
    conexao.close()
    assert linha is not None
    assert linha["total"] == 1
    assert "teste@empresa.com" not in linha["texto_anonimizado"]
    assert "respondente@empresa.com" not in linha["texto_anonimizado"]

    painel = cliente.get(
        f"/v1/empresas/{empresa}/coletas/{coleta['id']}/painel",
        headers=sessao_gestor["headers"],
    )
    assert painel.status_code == 200
    grupo = next(g for g in painel.json()["ghes"] if g["n_respostas"] == 1)
    assert grupo["mascarado"] is True
    assert grupo["indice_likert"] is None


def test_coleta_encerrada_recusa_webhook(
    cliente: TestClient,
    sessao_gestor: dict,
) -> None:
    empresa = sessao_gestor["empresa_id"]
    headers = sessao_gestor["headers"]
    coleta = _criar_coleta_forms(cliente, empresa, headers)
    config = _configurar(cliente, empresa, coleta["id"], headers)
    encerrada = cliente.post(
        f"/v1/empresas/{empresa}/coletas/{coleta['id']}/encerrar",
        headers=headers,
    )
    assert encerrada.status_code == 200
    resposta = _enviar_webhook(
        cliente,
        coleta["id"],
        config["webhook_secret"],
        _payload(uuid.uuid4().hex),
    )
    assert resposta.status_code == 410


def test_resposta_forms_fica_na_empresa_vinculada(
    cliente: TestClient,
    sessao_gestor: dict,
) -> None:
    conexao = conectar()
    empresa_b = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO empresa (id, razao_social, cnpj, plano) VALUES (?,?,?,?)",
        (empresa_b, "Empresa B", f"cnpj-{uuid.uuid4().hex}", "professional"),
    )
    executar(
        conexao,
        "INSERT INTO usuario_empresa (id, empresa_id, nome, email, senha_hash, papel) "
        "VALUES (?,?,?,?,?,?)",
        (
            uuid.uuid4().hex,
            empresa_b,
            "Gestora B",
            "gestora-b@teste.psyra.ai",
            gerar_hash_senha("psyra123"),
            "gestor",
        ),
    )
    conexao.close()

    login_b = cliente.post(
        "/v1/auth/login",
        json={"email": "gestora-b@teste.psyra.ai", "senha": "psyra123"},
    ).json()
    headers_b = {"Authorization": f"Bearer {login_b['access_token']}"}
    coleta_b = _criar_coleta_forms(cliente, empresa_b, headers_b)
    config_b = _configurar(cliente, empresa_b, coleta_b["id"], headers_b)
    enviada = _enviar_webhook(
        cliente,
        coleta_b["id"],
        config_b["webhook_secret"],
        _payload(uuid.uuid4().hex),
    )
    assert enviada.status_code == 201

    proibida = cliente.get(
        f"/v1/empresas/{empresa_b}/coletas/{coleta_b['id']}/google-form",
        headers=sessao_gestor["headers"],
    )
    assert proibida.status_code == 403
    conexao = conectar()
    vinculada = buscar_um(
        conexao,
        "SELECT c.empresa_id FROM resposta r JOIN coleta c ON c.id = r.coleta_id "
        "WHERE r.coleta_id = ?",
        (coleta_b["id"],),
    )
    conexao.close()
    assert vinculada is not None
    assert vinculada["empresa_id"] == empresa_b
