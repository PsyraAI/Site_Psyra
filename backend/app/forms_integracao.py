"""Normalização e segurança da integração com Google Forms."""

from __future__ import annotations

import hashlib
import hmac
import re
import uuid
from typing import Any
from urllib.parse import urlparse

from .config import config
from .db import buscar_um, executar
from .schemas import GoogleFormsWebhookEntrada


def extrair_google_form_id(url: str) -> str:
    """Valida a URL pública de resposta e devolve o ID estável do Form."""
    analisada = urlparse(url)
    if analisada.scheme != "https" or analisada.netloc != "docs.google.com":
        raise ValueError("use uma URL HTTPS válida do Google Forms")
    correspondencia = re.search(
        r"/forms/d/e/([A-Za-z0-9_-]+)/viewform/?$",
        analisada.path,
    )
    if not correspondencia:
        raise ValueError("use o link público de resposta terminado em /viewform")
    return correspondencia.group(1)


def segredo_da_coleta(coleta_id: str) -> str:
    """Deriva um segredo por coleta sem persistir credencial no banco."""
    return hmac.new(
        config.FORMS_WEBHOOK_SEGREDO.encode("utf-8"),
        coleta_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def assinatura_payload(coleta_id: str, corpo: bytes) -> str:
    return hmac.new(
        segredo_da_coleta(coleta_id).encode("utf-8"),
        corpo,
        hashlib.sha256,
    ).hexdigest()


def assinatura_valida(coleta_id: str, corpo: bytes, recebida: str | None) -> bool:
    if not recebida:
        return False
    fornecida = recebida.removeprefix("sha256=").strip().lower()
    return hmac.compare_digest(assinatura_payload(coleta_id, corpo), fornecida)


def _normalizar_texto(valor: str) -> str:
    return re.sub(r"\s+", " ", valor.strip().casefold())


def _valor_textual(valor: Any) -> str:
    if isinstance(valor, list):
        return str(valor[0] if valor else "").strip()
    return str(valor if valor is not None else "").strip()


def normalizar_nota_forms(valor: Any, rotulos: list[str]) -> int | None:
    bruto = _valor_textual(valor)
    if bruto.isdigit() and 1 <= int(bruto) <= 5:
        return int(bruto)
    escala = {
        _normalizar_texto(rotulo): indice
        for indice, rotulo in enumerate(rotulos, start=1)
    }
    return escala.get(_normalizar_texto(bruto))


def normalizar_resposta_forms(
    dados: GoogleFormsWebhookEntrada,
    instrumento: dict[str, Any],
) -> tuple[str, dict[str, int], str | None]:
    """Transforma títulos/respostas do Apps Script no contrato interno Psyra."""
    por_titulo = {
        _normalizar_texto(item.titulo): _valor_textual(item.valor)
        for item in dados.answers
    }
    pergunta_setor = instrumento["campo_grupo"]["pergunta"]
    setor = por_titulo.get(_normalizar_texto(pergunta_setor), "").strip() or "Outro"

    likert: dict[str, int] = {}
    ausentes: list[str] = []
    for bloco in instrumento["blocos"]:
        for indice, item in enumerate(bloco["itens"], start=1):
            texto = item if isinstance(item, str) else item["texto"]
            bruto = por_titulo.get(_normalizar_texto(texto), "")
            nota = normalizar_nota_forms(
                bruto,
                instrumento["escala"]["rotulos"],
            )
            item_id = f"{bloco['codigo']}{indice}"
            if nota is None:
                ausentes.append(item_id)
            else:
                likert[item_id] = nota
    if ausentes:
        raise ValueError(f"respostas Likert ausentes ou inválidas: {', '.join(ausentes)}")

    pergunta_texto = instrumento["bloco_texto_livre"]["pergunta"]
    texto_livre = por_titulo.get(_normalizar_texto(pergunta_texto), "").strip() or None
    return setor, likert, texto_livre


def codigo_ghe(setor: str) -> str:
    limpo = re.sub(r"[^A-Za-z0-9]+", "-", setor.strip()).strip("-").upper()
    return (limpo or "OUTRO")[:24]


def garantir_ghe_forms(conexao: Any, empresa_id: str, setor: str) -> str:
    """Resolve/cria o GHE apenas dentro da empresa derivada da coleta."""
    codigo = codigo_ghe(setor)
    existente = buscar_um(
        conexao,
        "SELECT id FROM ghe WHERE empresa_id = ? AND codigo = ?",
        (empresa_id, codigo),
    )
    if existente:
        return existente["id"]
    ghe_id = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO ghe (id, empresa_id, codigo, nome, setor, efetivo) "
        "VALUES (?,?,?,?,?,0)",
        (ghe_id, empresa_id, codigo, setor, setor),
    )
    return ghe_id
