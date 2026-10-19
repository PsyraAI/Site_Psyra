"""SEO no servidor: título, descrição, canônico e hreflang certos em cada rota pública.

Sprint: S10 | Risco: None
O site é uma SPA (React). Sem isto, toda URL devolve o mesmo <title> e a mesma descrição
do index.html, e o Google pode tratar /en, /privacidade e /termos como duplicatas da
página inicial. Aqui o servidor troca as tags antes de entregar o HTML e marca as telas
privadas (painel, admin, questionário, acesso) com noindex.
"""

from __future__ import annotations

import html
import json
import logging
import os
import re
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

URL_BASE = os.getenv("PSYRA_URL_PUBLICA", "https://site-psyra.onrender.com").rstrip("/")
# Código de verificação do Google Search Console (meta tag "google-site-verification").
VERIFICACAO_GOOGLE = os.getenv("PSYRA_GOOGLE_SITE_VERIFICATION", "").strip()
VERIFICACAO_BING = os.getenv("PSYRA_BING_SITE_VERIFICATION", "").strip()

# Rotas privadas: nunca indexar (painel com dado de empresa, links de questionário,
# acesso).
PREFIXOS_PRIVADOS = (
    "/painel",
    "/admin",
    "/responder",
    "/entrar",
    "/v1",
    "/docs",
    "/redoc",
)

_GRUPOS = {
    "inicio": {"pt": "/", "en": "/en", "zh": "/zh"},
    "privacidade": {"pt": "/privacidade", "en": "/en/privacy", "zh": "/zh/privacy"},
    "termos": {"pt": "/termos", "en": "/en/terms", "zh": "/zh/terms"},
    "guia": {"pt": "/guia-nr1"},
}
_HREFLANG = {"pt": "pt-BR", "en": "en", "zh": "zh-Hans"}
_OG_LOCALE = {"pt": "pt_BR", "en": "en_US", "zh": "zh_CN"}

DATA_GUIA = "2026-10-17"

PAGINAS: dict[str, dict[str, str]] = {
    "/guia-nr1": {
        "grupo": "guia",
        "idioma": "pt",
        "titulo": (
            "NR-1 e riscos psicossociais: guia prático para o PGR (2026) — Psyra AI"
        ),
        "descricao": (
            "O que a NR-1 (Portaria MTE 1.419/2024) exige sobre riscos psicossociais, a "
            "situação "
            "das multas no STF (ADPF 1316) e o passo a passo para mapear o risco por "
            "grupo e "
            "montar o plano de ação do PGR."
        ),
    },
    "/": {
        "grupo": "inicio",
        "idioma": "pt",
        "titulo": "Psyra AI — Risco psicossocial e NR-1 com IA que lê texto em português",
        "descricao": (
            "Mapeie riscos psicossociais por grupo e cumpra a NR-1: questionário "
            "anônimo com "
            "texto livre em português, IA explicável (LGPD art. 20), plano de ação para "
            "o PGR "
            "validado por psicóloga com CRP. Diagnóstico gratuito."
        ),
    },
    "/en": {
        "grupo": "inicio",
        "idioma": "en",
        "titulo": (
            "Psyra AI — Psychosocial risk and NR-1 compliance with AI that reads "
            "Portuguese"
        ),
        "descricao": (
            "Map psychosocial risk per group and comply with Brazil's NR-1: anonymous "
            "survey with "
            "free text in Portuguese, explainable AI (LGPD art. 20) and a PGR action "
            "plan reviewed "
            "by a licensed psychologist."
        ),
    },
    "/zh": {
        "grupo": "inicio",
        "idioma": "zh",
        "titulo": "Psyra AI — 用读懂葡萄牙语文本的 AI 管理心理社会风险与 NR-1 合规",
        "descricao": (
            "按组识别心理社会风险并满足巴西 NR-1：匿名问卷与葡萄牙语自由文本、"
            "可解释 AI（LGPD 第 20 条）、由持证心理学家审核的 PGR 行动计划。"
        ),
    },
    "/privacidade": {
        "grupo": "privacidade",
        "idioma": "pt",
        "titulo": "Política de Privacidade e Termos de Uso — Psyra AI",
        "descricao": (
            "Como a Psyra AI trata dados: anonimização antes de gravar, resultado só "
            "por grupo com 5 ou mais respostas, IA explicável e seus direitos pela LGPD."
        ),
    },
    "/en/privacy": {
        "grupo": "privacidade",
        "idioma": "en",
        "titulo": "Privacy Policy and Terms of Use — Psyra AI",
        "descricao": (
            "How Psyra AI handles data: anonymization before storage, group-only "
            "results with 5 or more answers, explainable AI and your rights under the "
            "LGPD."
        ),
    },
    "/zh/privacy": {
        "grupo": "privacidade",
        "idioma": "zh",
        "titulo": "隐私政策与使用条款 — Psyra AI",
        "descricao": (
            "Psyra AI 如何处理数据：保存前匿名化、仅展示至少 5 份回答的组结果、"
            "可解释 AI 以及您在 LGPD 下的权利。"
        ),
    },
    "/termos": {
        "grupo": "termos",
        "idioma": "pt",
        "titulo": "Termos de Uso e Política de Privacidade — Psyra AI",
        "descricao": (
            "Regras de uso da Psyra AI para empresas, usuários do painel e "
            "respondentes: uso só coletivo dos resultados, papel da psicóloga com CRP, "
            "planos e cancelamento."
        ),
    },
    "/en/terms": {
        "grupo": "termos",
        "idioma": "en",
        "titulo": "Terms of Use and Privacy Policy — Psyra AI",
        "descricao": (
            "Rules for using Psyra AI for companies, dashboard users and respondents: "
            "collective use of results only, the licensed psychologist's role, plans "
            "and cancellation."
        ),
    },
    "/zh/terms": {
        "grupo": "termos",
        "idioma": "zh",
        "titulo": "使用条款与隐私政策 — Psyra AI",
        "descricao": (
            "Psyra AI 对企业、仪表盘用户和受访者的使用规则：结果仅用于集体措施、"
            "持证心理学家的角色、套餐与取消。"
        ),
    },
}


def rota_privada(caminho: str) -> bool:
    """True para telas que não devem aparecer no Google. Sprint: S10 | Risco: R2"""
    c = "/" + caminho.lstrip("/")
    return any(c == p or c.startswith(p + "/") for p in PREFIXOS_PRIVADOS)


def _dados_estruturados(idioma: str) -> str:
    descricao = PAGINAS[_GRUPOS["inicio"][idioma]]["descricao"]
    grafo = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": f"{URL_BASE}/#organizacao",
                "name": "Psyra AI",
                "url": f"{URL_BASE}/",
                "logo": f"{URL_BASE}/icone-512.png",
                "email": "psyra.ai.io@gmail.com",
                "description": descricao,
                "foundingLocation": "São Paulo, Brasil",
            },
            {
                "@type": "WebSite",
                "@id": f"{URL_BASE}/#site",
                "url": f"{URL_BASE}/",
                "name": "Psyra AI",
                "inLanguage": ["pt-BR", "en", "zh-Hans"],
                "publisher": {"@id": f"{URL_BASE}/#organizacao"},
            },
            {
                "@type": "SoftwareApplication",
                "name": "Psyra AI",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web, Android",
                "url": f"{URL_BASE}/",
                "description": descricao,
                "publisher": {"@id": f"{URL_BASE}/#organizacao"},
                "offers": {
                    "@type": "AggregateOffer",
                    "priceCurrency": "BRL",
                    "lowPrice": "1200",
                    "highPrice": "4500",
                    "offerCount": "3",
                },
            },
        ],
    }
    return json.dumps(grafo, ensure_ascii=False, separators=(",", ":")).replace(
        "</", "<\\/"
    )


def _tags(caminho: str) -> tuple[str, str, str]:
    """Devolve (título, descrição, bloco de tags extras) para a rota."""
    pagina = PAGINAS.get(caminho)
    if not pagina:
        return "", "", ""
    idioma = pagina["idioma"]
    grupo = _GRUPOS[pagina["grupo"]]
    canonico = f"{URL_BASE}{caminho if caminho != '/' else '/'}"
    titulo = html.escape(pagina["titulo"], quote=True)
    descricao = html.escape(pagina["descricao"], quote=True)
    linhas = [f'<link rel="canonical" href="{canonico}" />']
    for cod, rota in grupo.items():
        linhas.append(
            f'<link rel="alternate" hreflang="{_HREFLANG[cod]}" '
            f'href="{URL_BASE}{rota}" />'
        )
    linhas.append(
        f'<link rel="alternate" hreflang="x-default" href="{URL_BASE}{grupo["pt"]}" />'
    )
    linhas += [
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="Psyra AI" />',
        f'<meta property="og:title" content="{titulo}" />',
        f'<meta property="og:description" content="{descricao}" />',
        f'<meta property="og:url" content="{canonico}" />',
        f'<meta property="og:image" content="{URL_BASE}/og-psyra.png" />',
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        f'<meta property="og:locale" content="{_OG_LOCALE[idioma]}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{titulo}" />',
        f'<meta name="twitter:description" content="{descricao}" />',
        f'<meta name="twitter:image" content="{URL_BASE}/og-psyra.png" />',
    ]
    if VERIFICACAO_GOOGLE:
        linhas.append(
            '<meta name="google-site-verification" '
            f'content="{html.escape(VERIFICACAO_GOOGLE, quote=True)}" />'
        )
    if VERIFICACAO_BING:
        linhas.append(
            '<meta name="msvalidate.01" '
            f'content="{html.escape(VERIFICACAO_BING, quote=True)}" />'
        )
    if pagina["grupo"] == "inicio":
        linhas.append(
            f'<script type="application/ld+json">{_dados_estruturados(idioma)}</script>'
        )
    if pagina["grupo"] == "guia":
        artigo = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": (
                "NR-1 e riscos psicossociais: o que a empresa precisa fazer em 2026"
            ),
            "description": pagina["descricao"],
            "inLanguage": "pt-BR",
            "datePublished": DATA_GUIA,
            "dateModified": DATA_GUIA,
            "mainEntityOfPage": canonico,
            "image": f"{URL_BASE}/og-psyra.png",
            "author": {
                "@type": "Organization",
                "name": "Psyra AI",
                "url": f"{URL_BASE}/",
            },
            "publisher": {
                "@type": "Organization",
                "name": "Psyra AI",
                "logo": {"@type": "ImageObject", "url": f"{URL_BASE}/icone-512.png"},
            },
        }
        corpo = json.dumps(artigo, ensure_ascii=False, separators=(",", ":")).replace(
            "</", "<\\/"
        )
        linhas.append(f'<script type="application/ld+json">{corpo}</script>')
    return titulo, descricao, "\n    ".join(linhas)


@lru_cache(maxsize=64)
def html_da_rota(index_html: str, caminho: str) -> str:
    """index.html com as tags da rota. Sprint: S10 | Risco: None"""
    c = "/" + caminho.strip("/") if caminho.strip("/") else "/"
    if rota_privada(c):
        return index_html.replace(
            "<head>", '<head>\n    <meta name="robots" content="noindex, nofollow" />', 1
        )
    titulo, descricao, extras = _tags(c)
    if not titulo:
        return index_html
    pagina = PAGINAS[c]
    saida = re.sub(
        r"<title>.*?</title>", f"<title>{titulo}</title>", index_html, count=1, flags=re.S
    )
    saida = re.sub(
        r'<meta\s+name="description"\s+content=".*?"\s*/>',
        f'<meta name="description" content="{descricao}" />',
        saida,
        count=1,
        flags=re.S,
    )
    # tira os hreflang fixos do index.html (valem só para a raiz) e põe os da rota
    saida = re.sub(
        r'\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+" />', "", saida
    )
    saida = saida.replace(
        '<html lang="pt-BR">', f'<html lang="{_HREFLANG[pagina["idioma"]]}">', 1
    )
    return saida.replace("</head>", f"    {extras}\n  </head>", 1)


def ler_index(caminho: Path) -> str:
    try:
        return caminho.read_text(encoding="utf-8")
    except OSError as erro:
        logger.error("falha ao ler index.html: %s", erro)
        raise


def sitemap_xml(data_modificacao: str) -> str:
    """sitemap.xml com as páginas públicas e as versões em cada idioma."""
    blocos = []
    for grupo, prioridade in (
        ("inicio", "1.0"),
        ("guia", "0.8"),
        ("privacidade", "0.4"),
        ("termos", "0.4"),
    ):
        rotas = _GRUPOS[grupo]
        alternativas = "".join(
            f'\n    <xhtml:link rel="alternate" hreflang="{_HREFLANG[c]}" '
            f'href="{URL_BASE}{r}"/>'
            for c, r in rotas.items()
        ) + (
            '\n    <xhtml:link rel="alternate" hreflang="x-default" '
            f'href="{URL_BASE}{rotas["pt"]}"/>'
        )
        for rota in rotas.values():
            peso = (
                prioridade
                if rota == rotas["pt"]
                else str(round(float(prioridade) - 0.2, 1))
            )
            blocos.append(
                f"  <url>\n    <loc>{URL_BASE}{rota}</loc>\n    "
                f"<lastmod>{data_modificacao}</lastmod>"
                f"\n    <priority>{peso}</priority>"
                f"{alternativas}\n  </url>"
            )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(blocos)
        + "\n</urlset>\n"
    )


def robots_txt() -> str:
    linhas = ["User-agent: *", "Allow: /"]
    linhas += [f"Disallow: {p}" for p in PREFIXOS_PRIVADOS]
    linhas += ["", f"Sitemap: {URL_BASE}/sitemap.xml", ""]
    return "\n".join(linhas)
