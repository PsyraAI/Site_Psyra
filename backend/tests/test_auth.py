"""Testes de autenticação. Sprint: S6 | Risco: R2."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.security import gerar_hash_senha, verificar_senha


def test_hash_senha_verifica_correta_e_recusa_errada() -> None:
    """PBKDF2 aceita a senha certa e recusa a errada e o hash corrompido."""
    hash_gerado = gerar_hash_senha("psyra123")
    assert verificar_senha("psyra123", hash_gerado) is True
    assert verificar_senha("psyra124", hash_gerado) is False
    assert verificar_senha("psyra123", "formato-invalido") is False


def test_login_valido_retorna_token(cliente: TestClient) -> None:
    """Credencial correta devolve JWT e o vínculo de empresa."""
    resposta = cliente.post(
        "/v1/auth/login", json={"email": "gestor@demo.psyra.ai", "senha": "psyra123"}
    )
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["access_token"].count(".") == 2
    assert corpo["papel"] == "gestor"


def test_login_invalido_retorna_401(cliente: TestClient) -> None:
    """Senha errada não vaza se o e-mail existe."""
    resposta = cliente.post(
        "/v1/auth/login", json={"email": "gestor@demo.psyra.ai", "senha": "errada99"}
    )
    assert resposta.status_code == 401


def test_rota_protegida_exige_token(cliente: TestClient, sessao_gestor: dict) -> None:
    """Sem Authorization retorna 401; com token válido retorna 200."""
    empresa = sessao_gestor["empresa_id"]
    assert cliente.get(f"/v1/empresas/{empresa}/ghes").status_code == 401
    ok = cliente.get(f"/v1/empresas/{empresa}/ghes", headers=sessao_gestor["headers"])
    assert ok.status_code == 200


def test_empresa_de_terceiro_retorna_403(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    """Usuário não acessa dados de outra empresa (equivalente ao RLS)."""
    resposta = cliente.get(
        "/v1/empresas/empresa-fantasma/ghes", headers=sessao_gestor["headers"]
    )
    assert resposta.status_code == 403
