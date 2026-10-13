"""Porta de acesso do site. A frase vira hash PBKDF2; o cookie é um JWT HS256.

Fica desligada em desenvolvimento. Em produção bloqueia o site, menos a
sonda de saúde e o webhook do Google Forms (que já tem assinatura própria).
"""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from urllib.parse import parse_qs

from fastapi import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import HTMLResponse, JSONResponse, RedirectResponse, Response

from .config import config
from .rate_limit import cliente_ip, limitador
from .security import TokenInvalido, criar_token, validar_token, verificar_senha

COOKIE = "psyra_acesso"
_CAMINHOS_LIVRES = ("/health", "/health/live", "/health/ready")


def _caminho_livre(caminho: str) -> bool:
    if caminho in _CAMINHOS_LIVRES:
        return True
    return caminho.startswith("/v1/integracoes/")


def _cookie_valido(request: Request) -> bool:
    valor = request.cookies.get(COOKIE)
    if not valor:
        return False
    try:
        payload = validar_token(valor)
    except TokenInvalido:
        return False
    return payload.get("papel") == "portao"


def _pagina(mensagem: str = "") -> str:
    aviso = f"<p class='aviso'>{mensagem}</p>" if mensagem else ""
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Acesso restrito — Psyra</title>
  <style>
    body {{ margin: 0; min-height: 100vh; display: grid; place-items: center;
      background: #140f24; color: #f4f0ff; font-family: sans-serif; }}
    form {{ width: min(22rem, 92vw); display: grid; gap: 0.75rem; }}
    h1 {{ font-size: 1.25rem; margin: 0; }}
    p {{ margin: 0; color: #c9bddf; line-height: 1.4; }}
    .aviso {{ color: #ffb4c0; }}
    input, button {{ font: inherit; padding: 0.7rem 0.8rem; border-radius: 0.6rem; }}
    input {{ border: 1px solid #4a3d68; background: #1d1630; color: inherit; }}
    button {{ border: 0; background: #c4a5ff; color: #1a1028; font-weight: 650; }}
  </style>
</head>
<body>
  <form method="post" action="/acesso" autocomplete="off">
    <h1>Acesso restrito</h1>
    <p>Este site pede uma frase de acesso antes de abrir.</p>
    {aviso}
    <label for="senha">Frase de acesso</label>
    <input id="senha" name="senha" type="password" required autofocus>
    <button type="submit">Entrar</button>
  </form>
</body>
</html>
"""


def _recusar_pagina(mensagem: str = "") -> HTMLResponse:
    return HTMLResponse(_pagina(mensagem), status_code=401)


def _definir_cookie(resposta: Response, token: str) -> None:
    resposta.set_cookie(
        key=COOKIE,
        value=token,
        httponly=True,
        secure=config.em_producao,
        samesite="lax",
        max_age=config.JWT_EXPIRA_MIN * 60,
        path="/",
    )


async def _ler_senha(request: Request) -> str:
    bruto = (await request.body()).decode("utf-8", errors="replace")
    tipo = request.headers.get("content-type", "")
    if "application/json" in tipo:
        try:
            corpo = json.loads(bruto or "{}")
        except json.JSONDecodeError:
            return ""
        senha = corpo.get("senha", "") if isinstance(corpo, dict) else ""
        return senha if isinstance(senha, str) else ""
    return parse_qs(bruto).get("senha", [""])[0]


class MiddlewarePortao(BaseHTTPMiddleware):
    """Exige cookie assinado, emitido só depois do hash da frase bater."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if not config.portao_ativo or _caminho_livre(request.url.path):
            return await call_next(request)
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path == "/acesso" and request.method == "GET":
            return _recusar_pagina()

        if request.url.path == "/acesso" and request.method == "POST":
            senha = (await _ler_senha(request)).strip()
            if not verificar_senha(senha, config.portao_hash()):
                try:
                    limitador.verificar(
                        f"/acesso:{cliente_ip(request)}",
                        config.RATE_LOGIN,
                    )
                except HTTPException as erro:
                    if erro.status_code != 429:
                        raise
                    if "application/json" in request.headers.get("content-type", ""):
                        return JSONResponse(
                            status_code=429,
                            content={
                                "detail": (
                                    "muitas requisicoes; tente novamente em instantes"
                                )
                            },
                        )
                    return _recusar_pagina(
                        "Muitas tentativas. Espere um instante e tente de novo."
                    )
                if "application/json" in request.headers.get("content-type", ""):
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "acesso restrito"},
                    )
                return _recusar_pagina("Frase incorreta.")
            destino = RedirectResponse(url="/", status_code=303)
            _definir_cookie(destino, criar_token({"papel": "portao", "sub": "acesso"}))
            return destino

        if _cookie_valido(request):
            return await call_next(request)

        aceita = request.headers.get("accept", "")
        if request.method == "GET" and "text/html" in aceita:
            return _recusar_pagina()
        return JSONResponse(status_code=401, content={"detail": "acesso restrito"})
