"""Headers de segurança e correlação de requisições."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("psyra.request")


class MiddlewareSeguranca(BaseHTTPMiddleware):
    """Adiciona request-id, headers seguros e log estruturado sem payloads."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_id = request_id
        inicio = time.perf_counter()
        resposta = await call_next(request)
        duracao_ms = round((time.perf_counter() - inicio) * 1000, 1)
        resposta.headers["X-Request-ID"] = request_id
        resposta.headers["X-Content-Type-Options"] = "nosniff"
        resposta.headers["X-Frame-Options"] = "DENY"
        resposta.headers["Referrer-Policy"] = "no-referrer"
        resposta.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        resposta.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        if (
            request.url.scheme == "https"
            or request.headers.get("x-forwarded-proto", "").lower() == "https"
        ):
            resposta.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        logger.info(
            "request_id=%s method=%s path=%s status=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            resposta.status_code,
            duracao_ms,
        )
        return resposta
