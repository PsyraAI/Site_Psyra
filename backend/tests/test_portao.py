"""A porta de acesso bloqueia o site até a frase bater com o hash."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import config
from app.main import app
from app.security import gerar_hash_senha

SENHA = "senha-do-portao-teste"


def test_desenvolvimento_segue_aberto(cliente: TestClient) -> None:
    assert config.portao_ativo is False
    assert cliente.get("/health/live").status_code == 200


def test_portao_bloqueia_libera_e_preserva_saude(
    monkeypatch,
) -> None:
    monkeypatch.setattr(config, "portao_hash", lambda: gerar_hash_senha(SENHA))
    with TestClient(app) as isolado:
        bloqueado = isolado.get("/", headers={"accept": "text/html"})
        assert bloqueado.status_code == 401
        assert "Acesso restrito" in bloqueado.text

        assert isolado.get("/health/live").status_code == 200
        api = isolado.post(
            "/v1/auth/login",
            json={"email": "a@b.c", "senha": "qualquer"},
        )
        assert api.status_code == 401
        assert api.json()["detail"] == "acesso restrito"

        webhook = isolado.post("/v1/integracoes/google-forms/coleta-x", json={})
        assert webhook.json()["detail"] == "assinatura invalida"

        ruim = isolado.post(
            "/acesso",
            data={"senha": "errada"},
            headers={"accept": "text/html"},
        )
        assert ruim.status_code == 401

        bom = isolado.post(
            "/acesso",
            data={"senha": SENHA},
            follow_redirects=False,
        )
        assert bom.status_code == 303
        liberado = isolado.get("/", headers={"accept": "text/html"})
        assert liberado.status_code != 401
        assert "Acesso restrito" not in liberado.text
