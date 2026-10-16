"""A frase de acesso do site foi retirada: a página abre direto.

O login do RH (e-mail e senha) continua na API. O questionário anônimo também.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import config
from app.main import app
from app.security import gerar_hash_senha

SENHA = "senha-do-portao-teste"


def test_desenvolvimento_segue_aberto(cliente: TestClient) -> None:
    assert cliente.get("/health/live").status_code == 200
    pagina = cliente.get("/", headers={"accept": "text/html"})
    assert pagina.status_code != 401
    assert "Acesso restrito" not in pagina.text


def test_site_abre_sem_frase_mesmo_com_hash_configurado(monkeypatch) -> None:
    """Hash antigo no ambiente não devolve a tela de frase."""
    monkeypatch.setattr(config, "portao_hash", lambda: gerar_hash_senha(SENHA))
    with TestClient(app) as isolado:
        pagina = isolado.get("/", headers={"accept": "text/html"})
        assert pagina.status_code != 401
        assert "Acesso restrito" not in pagina.text

        assert isolado.get("/health/live").status_code == 200
        login = isolado.post(
            "/v1/auth/login",
            json={"email": "a@b.c", "senha": "qualquer"},
        )
        assert login.status_code == 401
        assert login.json()["detail"] != "acesso restrito"


def test_portao_deixa_o_colaborador_responder_sem_frase(monkeypatch) -> None:
    """O link do questionário abre sem frase de acesso."""
    monkeypatch.setattr(config, "portao_hash", lambda: gerar_hash_senha(SENHA))
    with TestClient(app) as isolado:
        formulario = isolado.get("/v1/coletas/nebula-nr1-2026/formulario")
        assert formulario.status_code != 401
        envio = isolado.post("/v1/coleta", json={})
        assert envio.status_code != 401
        pagina = isolado.get("/responder/nebula-nr1-2026", headers={"accept": "text/html"})
        assert pagina.status_code != 401
        assert "Acesso restrito" not in pagina.text

        inicio = isolado.post("/v1/coletas/nebula-nr1-2026/inicio", json={"etapa": "inicio"})
        assert inicio.status_code != 401
        painel = isolado.get("/painel", headers={"accept": "text/html"})
        assert painel.status_code != 401
        assert "Acesso restrito" not in painel.text
