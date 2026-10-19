"""Gera os prints do site usados no guia da banca e nos slides.

Sprint: S10 | Risco: R2 (só dados sintéticos do seed; nenhum dado real)

Uso (com o servidor local rodando e o banco recém-semeado):
    python3 scripts/prints_site.py --base http://localhost:8010 --saida docs/prints
"""
from __future__ import annotations

import argparse
import logging
import re
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

EMAIL, SENHA = "gestor@demo.psyra.ai", "psyra123"
TOKEN = "nebula-nr1-2026"
logger = logging.getLogger(__name__)


def entrar(pg: Page, base: str) -> None:
    """Entra no painel com o usuário do seed."""
    pg.goto(f"{base}/entrar")
    pg.locator(".entrada__perfil").first.click()
    pg.fill("input[type=email]", EMAIL)
    pg.fill("input[type=password]", SENHA)
    pg.keyboard.press("Enter")
    pg.wait_for_url(re.compile(r".*/painel"))
    pg.wait_for_selector(".kpi")
    pg.wait_for_timeout(600)


def ir_para(pg: Page, rotulo: str) -> None:
    """Abre uma seção do painel pelo texto do menu lateral."""
    pg.locator(f".nav-item:has-text('{rotulo}')").first.click()
    pg.wait_for_timeout(700)


def prints_painel(pg: Page, base: str, saida: Path) -> None:
    """Painel do RH: questionário, grupos, capital, visão geral, qualidade e conta."""
    entrar(pg, base)
    ir_para(pg, "Questionário")
    pg.wait_for_selector(".questionario")
    pg.screenshot(path=str(saida / "S10_APP_print_painel_questionario.png"))
    ir_para(pg, "Riscos por grupo")
    pg.screenshot(path=str(saida / "S10_APP_print_painel_grupos.png"))
    ir_para(pg, "Capital em risco")
    pg.screenshot(path=str(saida / "S10_APP_print_painel_capital.png"))
    ir_para(pg, "Visão geral")
    pg.locator(".tema-icone").click()
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(saida / "S10_APP_print_painel_claro.png"))
    pg.locator(".tema-icone").click()
    ir_para(pg, "Qualidade da coleta")
    pg.wait_for_selector(".ritmo")
    pg.locator(".qualidade .superficie").first.scroll_into_view_if_needed()
    pg.evaluate("document.querySelector('.qualidade').scrollIntoView({block: 'start'})")
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(saida / "S10_APP_print_qualidade.png"))
    pg.evaluate("document.querySelector('.ritmo').closest('.superficie').scrollIntoView({block: 'center'})")
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(saida / "S10_APP_print_qualidade_ritmo.png"))
    ir_para(pg, "Como a Psyra calcula")
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(saida / "S10_APP_print_metodologia.png"))
    pg.locator(".menu-usuario__botao").click()
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(saida / "S10_APP_print_menu_conta.png"))
    pg.locator("[role=menuitem]").first.click()
    pg.wait_for_timeout(400)
    pg.locator(".config__aba").nth(3).click()
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(saida / "S10_APP_print_config_empresa.png"))
    pg.locator(".config__aba").nth(4).click()
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(saida / "S10_APP_print_config_equipe.png"))
    pg.locator(".config__aba").nth(1).click()
    pg.wait_for_timeout(300)
    pg.fill("#cfg-nova", "girassol-azul-2026")
    pg.wait_for_timeout(200)
    pg.screenshot(path=str(saida / "S10_APP_print_config_seguranca.png"))
    pg.fill("#cfg-nova", "")


def print_landing(pg: Page, base: str, saida: Path) -> None:
    """Landing com a seta da solução aberta e os blocos novos."""
    pg.set_viewport_size({"width": 1440, "height": 810})
    pg.evaluate("localStorage.setItem('psyra-tema', 'escuro')")
    pg.goto(f"{base}/#solucao")
    pg.wait_for_timeout(500)
    botao = pg.locator("#solucao .lp-saiba__botao").nth(1)
    botao.scroll_into_view_if_needed()
    botao.click()
    pg.wait_for_timeout(500)
    alvo = pg.locator("#solucao")
    caixa = alvo.bounding_box()
    if caixa:
        pg.evaluate(f"window.scrollTo(0, {max(0, caixa['y'] + pg.evaluate('window.scrollY') - 40)})")
        pg.wait_for_timeout(300)
    pg.screenshot(path=str(saida / "S10_APP_print_landing_explicacao.png"))
    pg.set_viewport_size({"width": 1440, "height": 900})
    for seletor, nome in (("#numeros", "numeros"), ("#para-quem", "para_quem"), (".lp-caminho", "caminho")):
        pg.evaluate(f"window.scrollTo(0, document.querySelector('{seletor}').getBoundingClientRect().top + window.scrollY - 90)")
        pg.wait_for_timeout(1600)
        pg.screenshot(path=str(saida / f"S10_APP_print_landing_{nome}.png"))
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(saida / "S10_APP_print_landing_rodape.png"))


def prints_questionario(pg: Page, base: str, saida: Path) -> None:
    """Questionário no celular: início, grupo, uma parte, pressa, pausa e a confirmação."""
    pg.goto(f"{base}/responder/{TOKEN}")
    pg.wait_for_selector(".rq-inicio")
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(saida / "S10_APP_print_questionario_1_inicio.png"))
    pg.locator(".rq-check input").check()
    pg.locator(".rq-botao").click()
    pg.wait_for_selector(".rq-grupos")
    pg.locator(".rq-grupo").nth(1).click()
    pg.wait_for_timeout(200)
    pg.screenshot(path=str(saida / "S10_APP_print_questionario_2_grupo.png"))
    pg.locator(".rq-botao").click()

    partes = 0
    while pg.locator(".rq-itens").count():
        itens = pg.locator(".rq-item")
        for i in range(itens.count()):
            if partes == 1 and i >= 2:
                break
            itens.nth(i).locator(".rq-opcao").nth(1 + (i % 3)).click()
        if partes == 1:
            pg.wait_for_timeout(900)
            pg.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
            pg.wait_for_timeout(500)
            pg.screenshot(path=str(saida / "S10_APP_print_questionario_3_parte.png"))
            for i in range(2, itens.count()):
                itens.nth(i).locator(".rq-opcao").nth(1 + (i % 3)).click()
        partes += 1
        pg.locator(".rq-botao").click()
        pg.wait_for_timeout(250)
        if pg.locator(".rq-pressa").count():
            if partes == 1:
                pg.locator(".rq-pressa").scroll_into_view_if_needed()
                pg.wait_for_timeout(300)
                pg.screenshot(path=str(saida / "S10_APP_print_questionario_4_pressa.png"))
            pg.locator(".rq-botao").click()
            pg.wait_for_timeout(250)
        if partes == 5 and pg.locator(".rq-pausa").count():
            pg.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(saida / "S10_APP_print_questionario_5_pausa.png"))
        if pg.locator(".rq-texto").count():
            break
    pg.fill(
        ".rq-texto",
        "A meta dobrou e a equipe continua do mesmo tamanho. Falta tempo para pausa.",
    )
    pg.locator(".rq-botao").click()
    pg.wait_for_selector(".rq-revisao")
    pg.locator(".rq-botao").click()
    pg.wait_for_selector(".rq-sucesso")
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(saida / "S10_APP_print_questionario_6_enviado.png"))


def main() -> int:
    """Gera todos os prints. Retorna 0 em caso de sucesso."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8000")
    ap.add_argument("--saida", default="docs/prints")
    args = ap.parse_args()
    base, saida = args.base.rstrip("/"), Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch()
            ctx = nav.new_context(viewport={"width": 1440, "height": 900}, locale="pt-BR", device_scale_factor=2)
            pg = ctx.new_page()
            prints_painel(pg, base, saida)
            print_landing(pg, base, saida)
            cel = nav.new_context(
                viewport={"width": 390, "height": 844},
                locale="pt-BR",
                is_mobile=True,
                has_touch=True,
                device_scale_factor=3,
            )
            prints_questionario(cel.new_page(), base, saida)
            entrada = nav.new_context(viewport={"width": 1440, "height": 900}, locale="pt-BR", device_scale_factor=2).new_page()
            entrada.goto(f"{base}/entrar")
            entrada.locator(".entrada__perfil").first.click()
            entrada.fill("input[type=email]", "marina.alves@nebula.com.br")
            entrada.fill("#senha", "minha senha")
            entrada.locator(".campo-senha__olho").click()
            entrada.locator(".entrada__lembrar input").check()
            entrada.wait_for_timeout(300)
            entrada.screenshot(path=str(saida / "S10_APP_print_login.png"))
            nav.close()
    except Exception as e:
        logger.error("falha ao gerar prints: %s", e)
        raise
    logger.info("prints em %s", saida)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
