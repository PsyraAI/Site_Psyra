"""API Psyra AI — ponto de entrada. Sprint: S6 | Épico: Dashboard + deploy.

Sobe a API e serve o frontend estático no mesmo processo. Em produção exige
Postgres, segredos fortes, HTTPS público e oculta a documentação OpenAPI.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import DIR_REACT, config
from .db import conectar, criar_schema
from .middleware import MiddlewareSeguranca
from .routers import admin, auth, coleta, empresas, integracoes, painel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _configurar_sentry() -> None:
    if not config.SENTRY_DSN:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
    except ImportError:
        logger.warning("PSYRA_SENTRY_DSN definido, mas sentry-sdk não está instalado")
        return
    sentry_sdk.init(
        dsn=config.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.05,
        send_default_pii=False,
        environment=config.AMBIENTE,
    )


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI) -> AsyncIterator[None]:
    """Valida produção, aplica schema e registra o backend ativo."""
    config.validar_producao()
    _configurar_sentry()
    conexao = conectar()
    try:
        criar_schema(conexao)
        backend = "postgres" if config.usa_postgres else "sqlite"
        logger.info(
            "API pronta — ambiente=%s banco=%s docs=%s",
            config.AMBIENTE,
            backend,
            config.DOCS_ATIVOS and not config.em_producao,
        )
    finally:
        conexao.close()
    yield


docs_url = "/docs" if (config.DOCS_ATIVOS and not config.em_producao) else None
redoc_url = "/redoc" if (config.DOCS_ATIVOS and not config.em_producao) else None
openapi_url = "/openapi.json" if docs_url else None

app = FastAPI(
    lifespan=ciclo_de_vida,
    title=config.APP_NOME,
    version=config.APP_VERSAO,
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
    description=(
        "API do MVP Psyra AI — coleta anônima NR-1, agregação por GHE com "
        "k-anonimato (n>=5) e painel de conformidade. Motor de risco atual é "
        "determinístico e PROVISÓRIO (não é modelo treinado)."
    ),
)

app.add_middleware(MiddlewareSeguranca)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGENS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
if config.HOSTS_PERMITIDOS:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=config.HOSTS_PERMITIDOS)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(empresas.router)
app.include_router(coleta.router)
app.include_router(painel.router)
app.include_router(integracoes.router)


@app.get("/health", tags=["infra"])
@app.get("/health/live", tags=["infra"])
def health_live() -> dict[str, object]:
    """Liveness: processo no ar, sem depender do banco."""
    return {
        "status": "ok",
        "versao": config.APP_VERSAO,
        "ambiente": config.AMBIENTE,
        "motor_risco": config.MOTOR_VERSAO,
        "n_minimo_ghe": config.N_MINIMO_GHE,
        "cep_aprovado": config.CEP_APROVADO,
    }


@app.get("/health/ready", tags=["infra"])
def health_ready() -> JSONResponse:
    """Readiness: exige banco acessível; em produção, somente Postgres."""
    if config.em_producao and not config.usa_postgres:
        return JSONResponse(
            status_code=503,
            content={"status": "indisponivel", "motivo": "sqlite_proibido_em_producao"},
        )
    try:
        conexao = conectar()
        try:
            conexao.execute("SELECT 1").fetchone()
        finally:
            conexao.close()
    except Exception:
        logger.exception("readiness falhou ao consultar o banco")
        return JSONResponse(
            status_code=503,
            content={"status": "indisponivel", "motivo": "banco_indisponivel"},
        )
    return JSONResponse(
        {
            "status": "ok",
            "versao": config.APP_VERSAO,
            "ambiente": config.AMBIENTE,
            "banco": "postgres" if config.usa_postgres else "sqlite",
            "motor_risco": config.MOTOR_VERSAO,
            "cep_aprovado": config.CEP_APROVADO,
        }
    )


if (DIR_REACT / "index.html").is_file():
    app.mount(
        "/assets",
        StaticFiles(directory=DIR_REACT / "assets"),
        name="assets",
    )

    @app.get("/{caminho:path}", include_in_schema=False)
    def spa(caminho: str) -> FileResponse:
        """Entrega o index.html do React para qualquer rota de navegação."""
        arquivo = DIR_REACT / caminho
        if caminho and arquivo.is_file():
            return FileResponse(arquivo)
        return FileResponse(DIR_REACT / "index.html")
