"""Fixtures de teste. Sprint: S6 | Banco temporário por sessão, nunca o de dev."""

from __future__ import annotations

import os
import sys
import tempfile
import uuid
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

_BANCO_TESTE = str(Path(tempfile.gettempdir()) / f"psyra_teste_{uuid.uuid4().hex}.db")
os.environ["PSYRA_ENV"] = "development"
os.environ["PSYRA_DB"] = _BANCO_TESTE
# Impede o dotenv de reaplicar a URI de produção e desvia testes para SQLite.
os.environ["PSYRA_DATABASE_URL"] = ""
os.environ.pop("DATABASE_URL", None)
os.environ["PSYRA_JWT_SECRET"] = "segredo-de-teste"
os.environ["PSYRA_ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver"
os.environ["PSYRA_DOCS"] = "true"
os.environ["PSYRA_RATE_LOGIN"] = "1000/minute"
os.environ["PSYRA_RATE_COLETA"] = "1000/minute"
os.environ["PSYRA_RATE_WEBHOOK"] = "1000/minute"

from fastapi.testclient import TestClient  # noqa: E402

from app.db import conectar, criar_schema  # noqa: E402
from app.main import app  # noqa: E402
from app.rate_limit import limitador  # noqa: E402
from seed import popular  # noqa: E402


@pytest.fixture(autouse=True)
def _limpar_rate_limit() -> Iterator[None]:
    """Evita 429 acumulado entre testes que compartilham o mesmo IP."""
    limitador._eventos.clear()
    yield
    limitador._eventos.clear()


@pytest.fixture(scope="session", autouse=True)
def banco() -> Iterator[str]:
    """Cria o banco de teste populado e remove ao final da sessão."""
    conexao = conectar(_BANCO_TESTE)
    criar_schema(conexao)
    conexao.close()
    popular(reset=True)
    yield _BANCO_TESTE
    Path(_BANCO_TESTE).unlink(missing_ok=True)


@pytest.fixture()
def cliente() -> Iterator[TestClient]:
    """Cliente HTTP da aplicação."""
    with TestClient(app) as teste:
        yield teste


@pytest.fixture()
def sessao_gestor(cliente: TestClient) -> dict[str, Any]:
    """Autentica o gestor demo e devolve token + headers + ids."""
    resposta = cliente.post(
        "/v1/auth/login",
        json={"email": "gestor@demo.psyra.ai", "senha": "psyra123"},
    )
    assert resposta.status_code == 200, resposta.text
    dados = resposta.json()
    return {
        "token": dados["access_token"],
        "headers": {"Authorization": f"Bearer {dados['access_token']}"},
        "empresa_id": dados["empresa_id"],
    }
