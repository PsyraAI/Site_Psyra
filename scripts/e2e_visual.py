"""Checagens visuais do painel e da landing (bugs relatados em 17/10/2026).

Sprint: S10 | Risco: None
- barra lateral rola até "Conta" em telas baixas (desktop e celular);
- balões "?" ficam inteiros dentro da janela;
- tooltip do gráfico com texto claro sobre fundo escuro;
- "/" abre em português mesmo com navegador em inglês e escolha salva "en".

Uso: python scripts/e2e_visual.py --base http://localhost:8010 --saida /tmp/visual
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

EMAIL, SENHA = "gestor@demo.psyra.ai", "psyra123"


def entrar(pg: Page, base: str) -> None:
    pg.goto(f"{base}/entrar")
    pg.locator(".entrada__perfil").first.click()
    pg.fill("input[type=email]", EMAIL)
    pg.fill("input[type=password]", SENHA)
    pg.keyboard.press("Enter")
    pg.wait_for_url(re.compile(r".*/painel"))
    pg.wait_for_selector(".kpi")


def luminancia(rgb: str) -> float:
    nums = [int(x) for x in re.findall(r"\d+", rgb)[:3]]
    canais = []
    for v in nums:
        c = v / 255
        canais.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2]


def contraste(a: str, b: str) -> float:
    la, lb = sorted((luminancia(a), luminancia(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def baloes_dentro(pg: Page, saida: Path, nome: str, falhas: list[str]) -> int:
    botoes = pg.locator(".explicacao__botao:visible")
    total = botoes.count()
    for i in range(total):
        b = botoes.nth(i)
        b.scroll_into_view_if_needed()
        b.click()
        pg.wait_for_timeout(120)
        caixa = pg.evaluate(
            """() => { const e = document.querySelector('.explicacao__texto--flutuante');
            if (!e) return null; const r = e.getBoundingClientRect();
            return {l: r.left, r: r.right, t: r.top, b: r.bottom, w:
            innerWidth, h: innerHeight,
                    vis: getComputedStyle(e).visibility}; }"""
        )
        if not caixa:
            falhas.append(f"{nome}: balão {i} não abriu")
        elif (
            caixa["l"] < 0
            or caixa["r"] > caixa["w"]
            or caixa["t"] < 0
            or caixa["b"] > caixa["h"]
        ):
            falhas.append(f"{nome}: balão {i} sai da janela {caixa}")
        if i == 0:
            pg.screenshot(path=str(saida / f"{nome}_balao.png"))
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(60)
    return total


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8010")
    ap.add_argument("--saida", default="/tmp/visual")
    a = ap.parse_args()
    saida = Path(a.saida)
    saida.mkdir(parents=True, exist_ok=True)
    falhas: list[str] = []
    ok: list[str] = []

    with sync_playwright() as p:
        nav = p.chromium.launch()

        # 1) landing com navegador em inglês e escolha salva "en"
        ctx = nav.new_context(locale="en-US", viewport={"width": 1366, "height": 800})
        pg = ctx.new_page()
        pg.goto(a.base + "/")
        pg.evaluate("localStorage.setItem('psyra-idioma','en')")
        pg.goto(a.base + "/")
        pg.wait_for_selector("h1")
        pg.wait_for_timeout(400)
        lang = pg.evaluate("document.documentElement.lang")
        url = pg.url
        (ok if lang == "pt-BR" and not url.endswith("/en") else falhas).append(
            "landing '/' em português com navegador en-US e escolha 'en' salva "
            f"(lang={lang}, url={url})"
        )
        for rota, trecho in (
            ("/guia-nr1", "NR-1 e riscos psicossociais"),
            ("/termos", "Termos de Uso"),
        ):
            pg.goto(a.base + rota)
            pg.wait_for_selector("h1")
            h1 = pg.locator("h1").first.inner_text()
            (ok if trecho in h1 else falhas).append(
                f"página {rota} abre com o título certo ({h1[:40]})"
            )
        pg.goto(a.base + "/")
        pg.wait_for_selector("h1")
        tem_sugestao = pg.locator(".lp-sugestao").count()
        (ok if tem_sugestao == 0 else falhas).append(
            "landing sem faixa sugerindo outro idioma"
        )
        ctx.close()

        for nome, vp in (
            ("desktop_baixo", {"width": 1366, "height": 560}),
            ("celular", {"width": 390, "height": 700}),
        ):
            ctx = nav.new_context(locale="pt-BR", viewport=vp)
            pg = ctx.new_page()
            entrar(pg, a.base)
            if nome == "celular":
                pg.locator(".topbar__menu").click()
                pg.wait_for_timeout(350)
            barra = pg.locator(".sidebar")
            medidas = barra.evaluate(
                "e => ({sh: e.scrollHeight, ch: e.clientHeight, oy: "
                "getComputedStyle(e).overflowY})"
            )
            barra.evaluate("e => e.scrollTo(0, e.scrollHeight)")
            pg.wait_for_timeout(150)
            conta = pg.locator(".sidebar__nav").last.locator(".nav-item").last
            caixa = conta.bounding_box()
            visivel = (
                caixa is not None
                and caixa["y"] >= 0
                and caixa["y"] + caixa["height"] <= vp["height"] + 1
            )
            (ok if visivel else falhas).append(
                f"{nome}: último item de 'Conta' alcançável rolando a barra ({medidas})"
            )
            pg.screenshot(path=str(saida / f"{nome}_sidebar_fim.png"))
            if nome == "celular":
                pg.locator(".sidebar__fechar").click()
                pg.wait_for_timeout(300)

            # balões em todas as seções do painel
            secoes = pg.locator(".sidebar__nav").first.locator(".nav-item")
            n_secoes = secoes.count()
            total_baloes = 0
            for i in range(n_secoes):
                if nome == "celular":
                    pg.locator(".topbar__menu").click()
                    pg.wait_for_timeout(300)
                pg.locator(".sidebar__nav").first.locator(".nav-item").nth(i).click()
                pg.wait_for_timeout(450)
                total_baloes += baloes_dentro(pg, saida, f"{nome}_s{i}", falhas)
            ok.append(
                f"{nome}: {total_baloes} balões '?' conferidos em {n_secoes} seções"
            )

            # tooltip do gráfico (visão geral)
            if nome == "desktop_baixo":
                pg.locator(".sidebar__nav").first.locator(".nav-item").first.click()
                pg.wait_for_timeout(400)
                barra_g = pg.locator(".recharts-bar-rectangle").first
                barra_g.scroll_into_view_if_needed()
                barra_g.hover()
                pg.wait_for_timeout(300)
                cores = pg.evaluate(
                    """() => { const t =
                    document.querySelector('.recharts-default-tooltip');
                    const i = document.querySelector('.recharts-tooltip-item');
                    if (!t || !i) return null;
                    return {fundo: getComputedStyle(t).backgroundColor,
                            texto: getComputedStyle(i).color}; }"""
                )
                if cores:
                    c = contraste(cores["fundo"], cores["texto"])
                    (ok if c >= 4.5 else falhas).append(
                        f"tooltip do gráfico com contraste {c:.1f}:1 (mínimo 4,5)"
                    )
                else:
                    falhas.append("tooltip do gráfico não apareceu")
                pg.screenshot(path=str(saida / "tooltip.png"))
            ctx.close()
        nav.close()

    for x in ok:
        print("  ✓", x)
    for x in falhas:
        print("  ✗", x)
    print(f"\n{len(ok)} ok, {len(falhas)} falhas")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
