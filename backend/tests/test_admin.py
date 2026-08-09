"""Testes do superadmin global e isolamento frente a gestores."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.db import conectar, executar
from app.security import gerar_hash_senha


def _criar_superadmin() -> dict[str, str]:
    email = f"ops-{uuid.uuid4().hex[:8]}@psyra.ai"
    senha = "SenhaSuperAdmin1!"
    conexao = conectar()
    try:
        executar(
            conexao,
            "INSERT INTO superadmin (id, nome, email, senha_hash, ativo) "
            "VALUES (?,?,?,?,1)",
            (uuid.uuid4().hex, "Operações", email, gerar_hash_senha(senha)),
        )
    finally:
        conexao.close()
    return {"email": email, "senha": senha}


def _login_admin(cliente: TestClient, credenciais: dict[str, str]) -> dict[str, str]:
    resposta = cliente.post("/v1/admin/auth/login", json=credenciais)
    assert resposta.status_code == 200, resposta.text
    token = resposta.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_gestor_nao_acessa_admin(cliente: TestClient, sessao_gestor: dict) -> None:
    resposta = cliente.get("/v1/admin/empresas", headers=sessao_gestor["headers"])
    assert resposta.status_code == 403


def test_superadmin_cria_empresa_e_usuario(cliente: TestClient) -> None:
    credenciais = _criar_superadmin()
    headers = _login_admin(cliente, credenciais)
    cnpj = f"{uuid.uuid4().int % 10**14:014d}"
    criada = cliente.post(
        "/v1/admin/empresas",
        headers=headers,
        json={
            "razao_social": "Empresa Piloto LTDA",
            "cnpj": cnpj,
            "plano": "starter",
        },
    )
    assert criada.status_code == 201, criada.text
    empresa_id = criada.json()["id"]

    usuario = cliente.post(
        f"/v1/admin/empresas/{empresa_id}/usuarios",
        headers=headers,
        json={
            "nome": "Gestor Piloto",
            "email": f"gestor-{uuid.uuid4().hex[:8]}@empresa.example",
            "senha": "SenhaEmpresa123",
            "papel": "admin",
        },
    )
    assert usuario.status_code == 201, usuario.text
    usuario_id = usuario.json()["id"]

    redef = cliente.post(
        f"/v1/admin/usuarios/{usuario_id}/redefinir-senha",
        headers=headers,
        json={"senha": "OutraSenha1234"},
    )
    assert redef.status_code == 204

    desativa = cliente.patch(
        f"/v1/admin/usuarios/{usuario_id}/status",
        headers=headers,
        json={"ativo": False},
    )
    assert desativa.status_code == 200
    assert desativa.json()["ativo"] in (0, False)


def test_cnpj_duplicado_retorna_conflito(cliente: TestClient) -> None:
    credenciais = _criar_superadmin()
    headers = _login_admin(cliente, credenciais)
    cnpj = f"{uuid.uuid4().int % 10**14:014d}"
    payload = {"razao_social": "Primeira", "cnpj": cnpj, "plano": "starter"}
    assert (
        cliente.post("/v1/admin/empresas", headers=headers, json=payload).status_code
        == 201
    )
    segunda = cliente.post(
        "/v1/admin/empresas",
        headers=headers,
        json={"razao_social": "Segunda", "cnpj": cnpj, "plano": "starter"},
    )
    assert segunda.status_code == 409


def test_login_superadmin_invalido(cliente: TestClient) -> None:
    resposta = cliente.post(
        "/v1/admin/auth/login",
        json={"email": "naoexiste@psyra.ai", "senha": "qualquer123"},
    )
    assert resposta.status_code == 401
