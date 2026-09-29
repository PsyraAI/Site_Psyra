"""Testes da área de conta do gestor: perfil, troca de senha e atividades.

Sprint: S7 | Risco: R2 (privacidade: respostas só aparecem agregadas, n >= mínimo).
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime

from fastapi.testclient import TestClient

from app.auditoria import registrar
from app.db import buscar_todos, buscar_um, conectar, executar
from app.security import gerar_hash_senha


def _criar_usuario_teste(senha: str) -> tuple[str, str]:
    """Cria usuário isolado na empresa demo (não mexe no gestor dos outros testes)."""
    conexao = conectar(os.environ["PSYRA_DB"])
    try:
        empresa = buscar_um(
            conexao,
            "SELECT empresa_id FROM usuario_empresa WHERE email = ?",
            ("gestor@demo.psyra.ai",),
        )
        assert empresa is not None
        email = f"conta-{uuid.uuid4().hex[:8]}@demo.psyra.ai"
        executar(
            conexao,
            "INSERT INTO usuario_empresa "
            "(id, empresa_id, nome, email, senha_hash, papel, ativo) "
            "VALUES (?,?,?,?,?,?,1)",
            (
                uuid.uuid4().hex,
                empresa["empresa_id"],
                "Conta Teste",
                email,
                gerar_hash_senha(senha),
                "gestor",
            ),
        )
        return email, str(empresa["empresa_id"])
    finally:
        conexao.close()


def _entrar(cliente: TestClient, email: str, senha: str) -> dict[str, str]:
    resposta = cliente.post("/v1/auth/login", json={"email": email, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return {"Authorization": f"Bearer {resposta.json()['access_token']}"}


# --------------------------------------------------------------------- perfil
def test_perfil_traz_email_e_acessos_recentes(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    """/me devolve e-mail e últimos logins em ISO 8601, do mais recente ao antigo."""
    corpo = cliente.get("/v1/auth/me", headers=sessao_gestor["headers"]).json()
    assert corpo["email"] == "gestor@demo.psyra.ai"
    acessos = corpo["acessos_recentes"]
    assert 1 <= len(acessos) <= 5
    datas = [datetime.fromisoformat(a.replace("Z", "+00:00")) for a in acessos]
    assert datas == sorted(datas, reverse=True)


def test_perfil_sem_token_retorna_401(cliente: TestClient) -> None:
    assert cliente.get("/v1/auth/me").status_code == 401


# --------------------------------------------------------------- troca de senha
def test_alterar_senha_fluxo_completo(cliente: TestClient) -> None:
    """Senha atual errada ou repetida é recusada; troca válida vale no login."""
    antiga, nova = "senha-antiga-2026", "senha-nova-segura-2026"
    email, _ = _criar_usuario_teste(antiga)
    headers = _entrar(cliente, email, antiga)

    errada = cliente.post(
        "/v1/auth/senha",
        headers=headers,
        json={"senha_atual": "x" * 12, "nova_senha": nova},
    )
    assert errada.status_code == 400

    repetida = cliente.post(
        "/v1/auth/senha",
        headers=headers,
        json={"senha_atual": antiga, "nova_senha": antiga},
    )
    assert repetida.status_code == 400

    curta = cliente.post(
        "/v1/auth/senha",
        headers=headers,
        json={"senha_atual": antiga, "nova_senha": "curta"},
    )
    assert curta.status_code == 422

    ok = cliente.post(
        "/v1/auth/senha",
        headers=headers,
        json={"senha_atual": antiga, "nova_senha": nova},
    )
    assert ok.status_code == 204

    assert (
        cliente.post("/v1/auth/login", json={"email": email, "senha": antiga}).status_code
        == 401
    )
    assert (
        cliente.post("/v1/auth/login", json={"email": email, "senha": nova}).status_code
        == 200
    )


def test_alterar_senha_exige_token(cliente: TestClient) -> None:
    resposta = cliente.post(
        "/v1/auth/senha", json={"senha_atual": "a" * 12, "nova_senha": "b" * 12}
    )
    assert resposta.status_code == 401


def test_alterar_senha_fica_na_trilha_de_auditoria(cliente: TestClient) -> None:
    antiga, nova = "senha-antiga-2026", "outra-senha-forte-26"
    email, empresa_id = _criar_usuario_teste(antiga)
    headers = _entrar(cliente, email, antiga)
    assert (
        cliente.post(
            "/v1/auth/senha",
            headers=headers,
            json={"senha_atual": antiga, "nova_senha": nova},
        ).status_code
        == 204
    )
    conexao = conectar(os.environ["PSYRA_DB"])
    try:
        eventos = buscar_todos(
            conexao,
            "SELECT acao FROM log_auditoria "
            "WHERE empresa_id = ? AND acao = 'alterar_senha'",
            (empresa_id,),
        )
    finally:
        conexao.close()
    assert eventos


# ------------------------------------------------------------------ atividades
def test_atividades_nao_listam_respostas_individuais(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    """Resposta nunca vira evento isolado; semana abaixo do mínimo fica sem total."""
    empresa_id = sessao_gestor["empresa_id"]
    conexao = conectar(os.environ["PSYRA_DB"])
    try:
        for _ in range(2):
            registrar(
                conexao,
                ator="anonimo",
                acao="receber_resposta",
                entidade="resposta:teste",
                empresa_id=empresa_id,
            )
    finally:
        conexao.close()

    corpo = cliente.get(
        f"/v1/empresas/{empresa_id}/atividades", headers=sessao_gestor["headers"]
    ).json()
    assert all(
        e["tipo"] not in ("receber_resposta", "receber_resposta_forms")
        for e in corpo["eventos"]
    )
    assert corpo["n_minimo"] >= 5
    for semana in corpo["respostas_por_semana"]:
        assert (semana["total"] is None) == semana["abaixo_do_minimo"]
        if semana["total"] is not None:
            assert semana["total"] >= corpo["n_minimo"]


def test_atividades_mostram_total_quando_atinge_minimo(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    empresa_id = sessao_gestor["empresa_id"]
    conexao = conectar(os.environ["PSYRA_DB"])
    try:
        for _ in range(6):
            registrar(
                conexao,
                ator="anonimo",
                acao="receber_resposta",
                entidade="resposta:teste",
                empresa_id=empresa_id,
            )
    finally:
        conexao.close()
    corpo = cliente.get(
        f"/v1/empresas/{empresa_id}/atividades", headers=sessao_gestor["headers"]
    ).json()
    atual = corpo["respostas_por_semana"][0]
    assert atual["abaixo_do_minimo"] is False and atual["total"] >= 6


def test_atividades_de_outra_empresa_retorna_403(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    resposta = cliente.get(
        "/v1/empresas/empresa-fantasma/atividades", headers=sessao_gestor["headers"]
    )
    assert resposta.status_code == 403
