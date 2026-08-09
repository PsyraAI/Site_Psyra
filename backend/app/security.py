"""Autenticação: PBKDF2 para senha e JWT HS256. Sprint: S6 | Risco: R2.

Implementado só com a stdlib (hashlib/hmac) para reduzir superfície de
dependências. Em produção com Supabase Auth, esta camada é substituída pelo
`signInWithPassword` e a verificação passa a ser do JWT do Supabase.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time
from typing import Any

from .config import config

logger = logging.getLogger(__name__)
_ITERACOES = 120_000


class TokenInvalido(Exception):
    """Token ausente, malformado, adulterado ou expirado."""


def gerar_hash_senha(senha: str) -> str:
    """Gera hash PBKDF2-SHA256 no formato `pbkdf2_sha256$iter$salt$hash`."""
    salt = secrets.token_hex(16)
    derivada = hashlib.pbkdf2_hmac("sha256", senha.encode(), salt.encode(), _ITERACOES)
    return f"pbkdf2_sha256${_ITERACOES}${salt}${derivada.hex()}"


def verificar_senha(senha: str, hash_armazenado: str) -> bool:
    """Compara senha em texto com o hash armazenado (comparação constante)."""
    try:
        algoritmo, iteracoes, salt, esperado = hash_armazenado.split("$")
        if algoritmo != "pbkdf2_sha256":
            return False
        derivada = hashlib.pbkdf2_hmac(
            "sha256", senha.encode(), salt.encode(), int(iteracoes)
        )
        return hmac.compare_digest(derivada.hex(), esperado)
    except (ValueError, AttributeError) as erro:
        logger.error("hash de senha em formato inválido: %s", erro)
        return False


def _b64url(dado: bytes) -> str:
    return base64.urlsafe_b64encode(dado).rstrip(b"=").decode()


def _b64url_decode(texto: str) -> bytes:
    return base64.urlsafe_b64decode(texto + "=" * (-len(texto) % 4))


def criar_token(payload: dict[str, Any], expira_min: int | None = None) -> str:
    """Emite JWT HS256 com `exp` (segundos epoch)."""
    minutos = expira_min if expira_min is not None else config.JWT_EXPIRA_MIN
    corpo = {**payload, "exp": int(time.time()) + minutos * 60}
    cabecalho = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    dados = _b64url(json.dumps(corpo, separators=(",", ":")).encode())
    assinatura = hmac.new(
        config.JWT_SEGREDO.encode(), f"{cabecalho}.{dados}".encode(), hashlib.sha256
    ).digest()
    return f"{cabecalho}.{dados}.{_b64url(assinatura)}"


def validar_token(token: str) -> dict[str, Any]:
    """Valida assinatura e expiração; devolve o payload ou levanta TokenInvalido."""
    try:
        cabecalho, dados, assinatura = token.split(".")
    except ValueError as erro:
        raise TokenInvalido("formato de token inválido") from erro

    esperada = _b64url(
        hmac.new(
            config.JWT_SEGREDO.encode(), f"{cabecalho}.{dados}".encode(), hashlib.sha256
        ).digest()
    )
    if not hmac.compare_digest(assinatura, esperada):
        raise TokenInvalido("assinatura inválida")

    payload: dict[str, Any] = json.loads(_b64url_decode(dados))
    if payload.get("exp", 0) < int(time.time()):
        raise TokenInvalido("token expirado")
    return payload
