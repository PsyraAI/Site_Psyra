"""SEO no servidor, robots, sitemap e Digital Asset Links do app Android. Sprint: S10"""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.main import app
from app.seo import html_da_rota, robots_txt, rota_privada, sitemap_xml

INDEX = """<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <title>Psyra AI</title>
    <meta name="description" content="padrão" />
    <link rel="alternate" hreflang="en" href="https://site-psyra.onrender.com/en" />
  </head>
  <body></body>
</html>"""


def test_rotas_privadas() -> None:
    for rota in ("/painel", "/admin", "/responder/abc", "/entrar", "/v1/auth/login"):
        assert rota_privada(rota), rota
    for rota in ("/", "/en", "/termos", "/privacidade", "/painelzinho"):
        assert not rota_privada(rota), rota


def test_html_publico_recebe_titulo_canonico_e_hreflang() -> None:
    saida = html_da_rota(INDEX, "/en/privacy")
    assert "<title>Privacy Policy and Terms of Use — Psyra AI</title>" in saida
    assert 'rel="canonical" href="https://site-psyra.onrender.com/en/privacy"' in saida
    assert 'hreflang="pt-BR" href="https://site-psyra.onrender.com/privacidade"' in saida
    assert '<html lang="en">' in saida
    assert saida.count("<title>") == 1
    assert 'content="padrão"' not in saida
    assert "ld+json" not in saida  # dados estruturados só na página inicial


def test_pagina_inicial_tem_dados_estruturados_validos() -> None:
    saida = html_da_rota(INDEX, "/")
    bloco = saida.split('<script type="application/ld+json">')[1].split("</script>")[0]
    dados = json.loads(bloco.replace("<\\/", "</"))
    tipos = {item["@type"] for item in dados["@graph"]}
    assert {"Organization", "WebSite", "SoftwareApplication"} <= tipos


def test_html_privado_recebe_noindex_e_nada_de_canonico() -> None:
    saida = html_da_rota(INDEX, "/painel")
    assert 'name="robots" content="noindex, nofollow"' in saida
    assert "canonical" not in saida


def test_robots_e_sitemap() -> None:
    robots = robots_txt()
    assert (
        "Disallow: /painel" in robots
        and "Sitemap: https://site-psyra.onrender.com/sitemap.xml" in robots
    )
    mapa = sitemap_xml("2026-10-17")
    assert mapa.count("<url>") == 10
    assert "<loc>https://site-psyra.onrender.com/termos</loc>" in mapa
    assert "/painel" not in mapa


def test_endpoints_publicos(monkeypatch) -> None:
    cliente = TestClient(app)
    assert cliente.get("/robots.txt").status_code == 200
    resposta = cliente.get("/sitemap.xml")
    assert resposta.status_code == 200 and "xml" in resposta.headers["content-type"]
    assert (
        cliente.get("/.well-known/assetlinks.json").json() == []
    )  # sem digital configurada
    monkeypatch.setenv("PSYRA_TWA_SHA256", "aa:bb, cc:dd")
    monkeypatch.setenv("PSYRA_TWA_PACOTE", "ai.psyra.app")
    links = cliente.get("/.well-known/assetlinks.json").json()
    assert links[0]["target"]["package_name"] == "ai.psyra.app"
    assert links[0]["target"]["sha256_cert_fingerprints"] == ["AA:BB", "CC:DD"]
    assert cliente.head("/robots.txt").status_code == 200
