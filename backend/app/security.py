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


_SENHAS_COMUNS = {
    "psyra12345", "1234567890", "senha12345", "password123", "qwerty1234",
    "abc1234567", "0123456789", "senhasenha", "mudar12345", "admin12345",
}


def validar_politica_senha(senha: str, email: str = "", nome: str = "") -> list[str]:
    """Regras de senha no espírito da NIST SP 800-63B: tamanho mínimo e lista de senhas óbvias,
    sem exigir combinação de símbolos. Devolve a lista de problemas (vazia = senha aceita).

    Sprint: S10 | Risco: R2
    """
    problemas = []
    if len(senha) < 10:
        problemas.append("use pelo menos 10 caracteres")
    base = senha.lower()
    local = email.split("@")[0].lower()
    if local and len(local) >= 4 and local in base:
        problemas.append("não use o seu e-mail na senha")
    primeiro = (nome.split() or [""])[0].lower()
    if primeiro and len(primeiro) >= 4 and primeiro in base:
        problemas.append("não use o seu nome na senha")
    if base in _SENHAS_COMUNS or len(set(base)) <= 2:
        problemas.append("essa senha é muito óbvia")
    return problemas


def gerar_senha_temporaria() -> str:
    """Senha temporária legível (troca obrigatória no primeiro acesso). Sprint: S10 | Risco: R2"""
    alfabeto = "abcdefghjkmnpqrstuvwxyz23456789"
    partes = ["".join(secrets.choice(alfabeto) for _ in range(4)) for _ in range(3)]
    return "Psyra-" + "-".join(partes)
