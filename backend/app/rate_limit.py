"""Limitador de taxa em memória para endpoints públicos sensíveis."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request, status


def _parse_limite(especificacao: str) -> tuple[int, float]:
    """Converte '5/minute' em (quantidade, janela_em_segundos)."""
    bruto = especificacao.strip().lower().replace(" ", "")
    quantidade_texto, unidade = bruto.split("/", 1)
    quantidade = int(quantidade_texto)
    janelas = {
        "second": 1.0,
        "sec": 1.0,
        "s": 1.0,
        "minute": 60.0,
        "min": 60.0,
        "m": 60.0,
        "hour": 3600.0,
        "h": 3600.0,
    }
    if unidade not in janelas:
        raise ValueError(f"unidade de rate limit inválida: {unidade}")
    return quantidade, janelas[unidade]


class Limitador:
    """Janela deslizante por chave (IP + rota)."""

    def __init__(self) -> None:
        self._eventos: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def verificar(self, chave: str, especificacao: str) -> None:
        quantidade, janela = _parse_limite(especificacao)
        agora = time.monotonic()
        with self._lock:
            fila = self._eventos[chave]
            while fila and agora - fila[0] > janela:
                fila.popleft()
            if len(fila) >= quantidade:
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "muitas requisicoes; tente novamente em instantes",
                )
            fila.append(agora)


limitador = Limitador()


def cliente_ip(request: Request) -> str:
    encaminhado = request.headers.get("x-forwarded-for", "")
    if encaminhado:
        return encaminhado.split(",")[0].strip() or "desconhecido"
    if request.client and request.client.host:
        return request.client.host
    return "desconhecido"


def limitar(especificacao: str) -> Callable[[Request], None]:
    """Dependência FastAPI que aplica o limite informado."""

    def dependencia(request: Request) -> None:
        chave = f"{request.url.path}:{cliente_ip(request)}"
        limitador.verificar(chave, especificacao)

    return dependencia
