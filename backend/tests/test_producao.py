"""Guardrails de produção e endpoints de saúde."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import Config


def test_health_live_e_ready(cliente: TestClient) -> None:
    live = cliente.get("/health/live")
    assert live.status_code == 200
    assert live.json()["status"] == "ok"
    assert "X-Request-ID" in live.headers

    ready = cliente.get("/health/ready")
    assert ready.status_code == 200
    corpo = ready.json()
    assert corpo["status"] == "ok"
    assert corpo["banco"] == "sqlite"


def test_validacao_producao_recusa_defaults() -> None:
    cfg = Config()
    cfg.AMBIENTE = "production"
    cfg.DATABASE_URL = ""
    cfg.JWT_SEGREDO = "dev-somente-local-trocar-em-prod"
    cfg.FORMS_WEBHOOK_SEGREDO = "dev-forms-somente-local-trocar-em-prod"
    cfg.PUBLIC_URL = "http://localhost:8000"
    cfg.CORS_ORIGENS = ["http://localhost:8000"]
    with pytest.raises(RuntimeError, match="configuração de produção inválida"):
        cfg.validar_producao()


def test_validacao_producao_aceita_config_forte() -> None:
    cfg = Config()
    cfg.AMBIENTE = "production"
    cfg.DATABASE_URL = "postgresql://user:pass@db.example/postgres"
    cfg.JWT_SEGREDO = "a" * 32
    cfg.FORMS_WEBHOOK_SEGREDO = "b" * 32
    cfg.PUBLIC_URL = "https://psyra.example.com"
    cfg.CORS_ORIGENS = ["https://psyra.example.com"]
    cfg.HOSTS_PERMITIDOS = ["psyra.example.com"]
    cfg.validar_producao()
