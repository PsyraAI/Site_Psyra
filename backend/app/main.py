"""API Psyra AI — ponto de entrada. Sprint: S6 | Épico: Dashboard + deploy.

Sobe a API e serve o frontend estático no mesmo processo. Em produção exige
Postgres, segredos fortes, HTTPS público e oculta a documentação OpenAPI.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import date
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import (
    FileResponse,
    HTMLResponse,
    JSONResponse,
    PlainTextResponse,
    Response,
)
from fastapi.staticfiles import StaticFiles

from .config import DIR_REACT, config
from .db import conectar, criar_schema
from .middleware import MiddlewareSeguranca
from .routers import admin, auth, coleta, configuracoes, empresas, integracoes, painel
from .seo import html_da_rota, ler_index, robots_txt, rota_privada, sitemap_xml

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


def _subir_banco() -> None:
    """Aplica o schema. Falha rápido se o Postgres não responder."""
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


async def _preparar_banco() -> None:
    """Tenta o banco em segundo plano para o processo escutar a porta na hora."""
    espera = 5
    while True:
        try:
            await asyncio.to_thread(_subir_banco)
            return
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception(
                "banco indisponível na inicialização; nova tentativa em %ss",
                espera,
            )
            await asyncio.sleep(espera)
            espera = min(espera * 2, 30)


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI) -> AsyncIterator[None]:
    """Valida produção e sobe o HTTP sem esperar o banco travar o boot."""
    config.validar_producao()
    _configurar_sentry()
    tarefa = asyncio.create_task(_preparar_banco())
    try:
        yield
    finally:
        tarefa.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await tarefa


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


class GZipSoArquivosPublicos(GZipMiddleware):
    """Compacta HTML, JS e CSS do site; respostas da API (/v1) seguem sem compressão.

    Evita misturar, numa mesma resposta compactada, segredo (token) e texto controlado por
    terceiros (classe de ataque BREACH). Sprint: S10 | Risco: None
    """

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope.get("type") == "http" and str(scope.get("path", "")).startswith("/v1"):
            await self.app(scope, receive, send)
            return
        await super().__call__(scope, receive, send)


app.add_middleware(GZipSoArquivosPublicos, minimum_size=1024)
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
app.include_router(auth.conta)
app.include_router(configuracoes.router)
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
    except Exception as erro:
        logger.exception("readiness falhou ao consultar o banco")
        return JSONResponse(
            status_code=503,
            content={
                "status": "indisponivel",
                "motivo": "banco_indisponivel",
                "causa": type(erro).__name__,
            },
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


@app.api_route("/robots.txt", methods=["GET", "HEAD"], include_in_schema=False)
def robots() -> PlainTextResponse:
    """robots.txt: páginas públicas liberadas; painel, admin e questionário fora do
    Google."""
    return PlainTextResponse(
        robots_txt(), headers={"Cache-Control": "public, max-age=3600"}
    )


@app.api_route("/sitemap.xml", methods=["GET", "HEAD"], include_in_schema=False)
def sitemap() -> Response:
    """Mapa do site com as versões pt/en/zh (hreflang)."""
    return Response(
        sitemap_xml(os.getenv("PSYRA_DATA_SITEMAP", date.today().isoformat())),
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.api_route(
    "/.well-known/assetlinks.json", methods=["GET", "HEAD"], include_in_schema=False
)
def assetlinks() -> JSONResponse:
    """Digital Asset Links do app Android (TWA): sem isto, o app abre com barra de
    navegador.

    PSYRA_TWA_PACOTE = id do app (ex.: ai.psyra.app) e PSYRA_TWA_SHA256 = impressões
    SHA-256
    separadas por vírgula (chave de upload E chave de assinatura do Play App Signing).
    """
    pacote = os.getenv("PSYRA_TWA_PACOTE", "ai.psyra.app").strip()
    digitais = [
        d.strip().upper()
        for d in os.getenv("PSYRA_TWA_SHA256", "").split(",")
        if d.strip()
    ]
    corpo = (
        [
            {
                "relation": ["delegate_permission/common.handle_all_urls"],
                "target": {
                    "namespace": "android_app",
                    "package_name": pacote,
                    "sha256_cert_fingerprints": digitais,
                },
            }
        ]
        if digitais
        else []
    )
    return JSONResponse(corpo, headers={"Cache-Control": "public, max-age=3600"})


if (DIR_REACT / "index.html").is_file():

    class ArquivosComHash(StaticFiles):
        """Arquivos do build têm hash no nome: podem ficar em cache por 1 ano
        (imutáveis)."""

        def file_response(self, *args: Any, **kwargs: Any) -> Response:
            resposta = super().file_response(*args, **kwargs)
            resposta.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            return resposta

    app.mount(
        "/assets",
        ArquivosComHash(directory=DIR_REACT / "assets"),
        name="assets",
    )

    @app.api_route("/{caminho:path}", methods=["GET", "HEAD"], include_in_schema=False)
    def spa(caminho: str) -> Response:
        """Entrega arquivos públicos ou o index.html do React com as tags de SEO da
        rota."""
        arquivo = (DIR_REACT / caminho).resolve()
        if caminho and arquivo.is_file() and DIR_REACT.resolve() in arquivo.parents:
            cabecalhos = {"Cache-Control": "public, max-age=3600"}
            if arquivo.name == "sw.js":
                cabecalhos = {"Cache-Control": "no-cache", "Service-Worker-Allowed": "/"}
            elif arquivo.name.endswith(".webmanifest"):
                return FileResponse(
                    arquivo,
                    media_type="application/manifest+json",
                    headers={"Cache-Control": "public, max-age=86400"},
                )
            return FileResponse(arquivo, headers=cabecalhos)
        conteudo = html_da_rota(ler_index(DIR_REACT / "index.html"), "/" + caminho)
        cabecalhos = {"Cache-Control": "no-cache"}
        if rota_privada("/" + caminho):
            cabecalhos["X-Robots-Tag"] = "noindex, nofollow"
        return HTMLResponse(conteudo, headers=cabecalhos)
