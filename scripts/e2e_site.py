"""Teste ponta a ponta do site: landing, acesso, painel do RH e questionário no site.

Sprint: S10 | Risco: R2 (confere que nada de "demo" aparece, que a resposta chega anonimizada
e que um ciclo encerrado recusa respostas).

Uso (com o backend rodando e o seed local carregado):
    python scripts/e2e_site.py --base http://localhost:8000 --saida /tmp/e2e
Requer: pip install playwright && playwright install chromium
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import sys
import uuid
from pathlib import Path

from playwright.sync_api import Page, expect, sync_playwright

EMAIL, SENHA = "gestor@demo.psyra.ai", "psyra123"
IGNORAR = ("fonts.googleapis", "fonts.gstatic", "ERR_TUNNEL_CONNECTION_FAILED", "ERR_NAME_NOT_RESOLVED")


class Checagens:
    def __init__(self) -> None:
        self.ok: list[str] = []
        self.falhas: list[str] = []

    def conferir(self, condicao: bool, descricao: str) -> None:
        (self.ok if condicao else self.falhas).append(descricao)
        print(("  ✓ " if condicao else "  ✗ ") + descricao)


def entrar(pg: Page, base: str) -> None:
    pg.goto(f"{base}/entrar")
    pg.locator(".entrada__perfil").first.click()
    pg.fill("input[type=email]", EMAIL)
    pg.fill("input[type=password]", SENHA)
    pg.keyboard.press("Enter")
    pg.wait_for_url(re.compile(r".*/painel"))
    pg.wait_for_selector(".kpi")


def texto_visivel(pg: Page) -> str:
    return pg.evaluate("document.body.innerText")


def responder_questionario(pg: Page, url: str, saida: Path, c: Checagens, fotos: bool) -> str:
    pg.goto(url)
    pg.wait_for_selector(".rq-inicio")
    largura_inicio = pg.evaluate("document.documentElement.scrollWidth")
    if fotos:
        pg.screenshot(path=str(saida / "q1_inicio.png"), full_page=True)
    c.conferir(pg.locator(".rq-botao").is_disabled(), "questionário: 'Começar' bloqueado sem consentimento")
    pg.locator(".rq-check input").check()
    pg.locator(".rq-botao").click()
    pg.wait_for_selector(".rq-grupos")
    pg.locator(".rq-grupo").first.click()
    if fotos:
        pg.screenshot(path=str(saida / "q2_grupo.png"), full_page=True)
    pg.locator(".rq-botao").click()

    partes = 0
    while pg.locator(".rq-itens").count():
        itens = pg.locator(".rq-item")
        if partes == 0:
            pg.locator(".rq-botao").click()  # tenta avançar sem responder
            c.conferir("Responda" in pg.locator(".erro").inner_text(), "questionário: avisa quando falta pergunta na parte")
        if partes == 5:
            c.conferir(pg.locator(".rq-pausa").count() == 1, "questionário: convite para pausar na metade (parte 6)")
        for i in range(itens.count()):
            nota = 2 + (i % 3)
            itens.nth(i).locator(".rq-opcao").nth(nota - 1).click()
        if partes == 0:
            largura = pg.evaluate("document.documentElement.scrollWidth")
            vp = pg.viewport_size["width"]
            c.conferir(max(largura, largura_inicio) <= vp + 1, f"questionário: sem rolagem lateral no celular ({largura}px de {vp}px)")
        if fotos and partes == 0:
            pg.screenshot(path=str(saida / "q3_parte1.png"), full_page=True)
        partes += 1
        pg.locator(".rq-botao").click()
        pg.wait_for_timeout(250)
        # respondeu a menos de 2 s por pergunta: o questionário convida a revisar (sem bloquear)
        if pg.locator(".rq-pressa").count():
            if partes == 1:
                c.conferir(True, "questionário: aviso de pressa (menos de 2 s por pergunta) aparece e não bloqueia")
            pg.locator(".rq-botao").click()
            pg.wait_for_timeout(250)
        if pg.locator(".rq-texto").count():
            break
    c.conferir(partes == 10, f"questionário: 10 partes respondidas (foram {partes})")

    pg.fill(".rq-texto", "Desde que a meta dobrou eu nao durmo direito. Falei com o Carlos Souza, carlos@empresa.com.br, e nada mudou.")
    if fotos:
        pg.screenshot(path=str(saida / "q4_texto.png"), full_page=True)
    pg.locator(".rq-botao").click()
    pg.wait_for_selector(".rq-revisao")
    if fotos:
        pg.screenshot(path=str(saida / "q5_revisao.png"), full_page=True)
    pg.locator(".rq-botao").click()
    pg.wait_for_selector(".rq-sucesso")
    protocolo = pg.locator(".rq-protocolo .mono").inner_text()
    if fotos:
        pg.screenshot(path=str(saida / "q6_enviado.png"), full_page=True)
    c.conferir(bool(re.fullmatch(r"[0-9A-F]{8}", protocolo)), f"questionário: protocolo recebido ({protocolo})")
    return protocolo


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:8000")
    ap.add_argument("--saida", default="e2e_saida")
    ap.add_argument("--banco", default="backend/psyra.db")
    args = ap.parse_args()
    base, saida = args.base.rstrip("/"), Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    c = Checagens()
    erros_console: list[str] = []

    with sync_playwright() as p:
        nav = p.chromium.launch()
        ctx = nav.new_context(viewport={"width": 1366, "height": 860}, locale="pt-BR")
        pg = ctx.new_page()
        pg.on("console", lambda m: erros_console.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: erros_console.append(str(e)))

        print("1. Landing")
        pg.goto(f"{base}/#solucao")
        botao = pg.locator("#solucao .lp-saiba__botao").first
        botao.scroll_into_view_if_needed()
        botao.click()
        pg.wait_for_timeout(450)
        c.conferir(botao.get_attribute("aria-expanded") == "true", "landing: seta abre a explicação da solução")
        pg.locator("#solucao").screenshot(path=str(saida / "landing_solucao.png"))
        pg.locator("#como-funciona .lp-saiba__botao").nth(0).click()
        pg.wait_for_timeout(450)
        pg.locator("#como-funciona").screenshot(path=str(saida / "landing_como.png"))
        c.conferir(pg.locator("#como-funciona .lp-saiba--aberto").count() == 1, "landing: passo 1 de Como funciona expandido")
        fontes = pg.locator("#numeros .lp-numeros__fonte")
        c.conferir(
            fontes.count() == 4 and all((fontes.nth(i).get_attribute("href") or "").startswith("https://") for i in range(4)),
            "landing: os 4 números têm fonte com link",
        )
        c.conferir(pg.locator(".lp-hero__fonte a").count() == 1, "landing: número do hero tem fonte")
        pg.locator("#perfil-aba-rh").focus()
        pg.keyboard.press("ArrowRight")
        pg.keyboard.press("ArrowRight")
        c.conferir(
            pg.locator("#perfil-aba-psi").get_attribute("aria-selected") == "true"
            and "decisão técnica" in pg.locator("#perfil-painel").inner_text(),
            "landing: abas por perfil andam pelo teclado",
        )
        c.conferir(
            pg.locator(".lp-caminho__passo").count() == 4 and pg.locator(".lp-caminho__grupo--oculto").count() == 1,
            "landing: caminho da resposta com grupo oculto (n < 5)",
        )
        pg.locator(".lp-tema-seg__opcao").nth(1).click()
        pg.wait_for_timeout(300)
        claro = pg.evaluate("document.documentElement.dataset.tema") == "claro"
        pg.locator(".lp-tema-seg__opcao").nth(2).click()
        pg.wait_for_timeout(300)
        c.conferir(claro and pg.evaluate("document.documentElement.dataset.tema") == "escuro", "landing: seletor de tema do rodapé troca claro/escuro")
        for rota, titulo in (("/en", "By the numbers"), ("/zh", "数据")):
            pg.goto(f"{base}{rota}")
            pg.wait_for_selector("#numeros")
            c.conferir(
                titulo in pg.locator("#numeros .lp-eyebrow").inner_text() or titulo.upper() in pg.locator("#numeros .lp-eyebrow").inner_text(),
                f"landing {rota}: blocos novos traduzidos",
            )

        print("2. Painel")
        entrar(pg, base)
        corpo = texto_visivel(pg)
        c.conferir(not re.search(r"\bdemo", corpo, re.I), "painel: nenhum texto com 'demo' na tela")
        pg.screenshot(path=str(saida / "painel_visao_escuro.png"), full_page=True)

        pg.locator(".risco-ranking__item--botao").first.click()
        pg.wait_for_selector(".grupo--destaque")
        c.conferir(pg.locator(".nav-item--ativo").inner_text().startswith("Riscos por grupo"), "painel: clicar no grupo abre Riscos por grupo com destaque")
        pg.locator(".chip-filtro--alto").click()
        c.conferir(pg.locator(".grupo--cartao").count() == 1, "painel: filtro 'Alto' mostra só os grupos em risco alto")

        pg.locator(".tema-icone").click()
        pg.wait_for_timeout(500)
        c.conferir(pg.evaluate("document.documentElement.dataset.tema") == "claro", "painel: botão troca para o modo claro")
        pg.locator(".nav-item").first.click()
        pg.wait_for_timeout(500)
        pg.screenshot(path=str(saida / "painel_visao_claro.png"), full_page=True)

        for codigo, nome, primeiro in (("en", "English", "Overview"), ("zh", "简体中文", "总览"), ("pt", "Português", "Visão geral")):
            pg.locator(".topbar .seletor-idioma__botao").click()
            pg.locator(f".topbar .seletor-idioma__lista button:has-text('{nome}')").click()
            pg.wait_for_timeout(400)
            c.conferir(pg.locator(".nav-item").first.inner_text().strip().startswith(primeiro), f"painel: idioma {codigo} aplicado na navegação")
            if codigo != "pt":
                pg.screenshot(path=str(saida / f"painel_{codigo}.png"))

        pg.locator(".tema-icone").click()  # volta ao escuro
        pg.wait_for_timeout(300)

        print("3. Novo ciclo e questionário no site")
        pg.locator(".pagina-cabecalho__botoes .botao").first.click()
        pg.wait_for_selector(".dialogo")
        pg.fill("#titulo-ciclo", "Mapeamento NR-1 · teste ponta a ponta")
        pg.locator(".dialogo__acoes .botao:not(.botao--fantasma)").click()
        pg.wait_for_selector(".questionario__link")
        url = pg.locator(".questionario .link-coleta__url").inner_text().strip()
        c.conferir("/responder/" in url, f"painel: novo ciclo gera link próprio ({url})")
        c.conferir(pg.locator(".qr svg").count() == 1, "painel: QR code do link gerado no navegador")
        pg.screenshot(path=str(saida / "painel_questionario.png"), full_page=True)

        anonimo = nav.new_context(viewport={"width": 390, "height": 844}, locale="pt-BR", is_mobile=True, has_touch=True)
        qp = anonimo.new_page()
        qp.on("pageerror", lambda e: erros_console.append(str(e)))
        responder_questionario(qp, url, saida, c, fotos=True)

        pg.reload()
        pg.wait_for_selector(".kpi, .questionario")
        valor = pg.evaluate(
            "[...document.querySelectorAll('#seletor-coleta option')].find(o => o.textContent.includes('teste ponta a ponta'))?.value"
        )
        pg.locator("#seletor-coleta").select_option(value=valor)
        pg.wait_for_timeout(1200)
        opcao = pg.locator("#seletor-coleta option:checked").inner_text()
        c.conferir("1 resposta" in opcao, f"painel: o ciclo novo mostra a resposta recebida ({opcao})")

        banco = Path(args.banco)
        if banco.exists():
            con = sqlite3.connect(banco)
            texto = con.execute("SELECT texto_anonimizado FROM resposta ORDER BY rowid DESC LIMIT 1").fetchone()[0] or ""
            con.close()
            c.conferir("Carlos" not in texto and "carlos@empresa" not in texto, f"banco: texto gravado sem nome e sem e-mail ({texto[:80]}…)")
            con = sqlite3.connect(banco)
            sinal, qualidade = con.execute("SELECT sinalizada, qualidade_json FROM resposta ORDER BY rowid DESC LIMIT 1").fetchone()
            inicios = con.execute(
                "SELECT COUNT(*) FROM coleta_inicio ci JOIN coleta c ON c.id = ci.coleta_id WHERE c.titulo LIKE '%ponta a ponta%'"
            ).fetchone()[0]
            con.close()
            c.conferir(sinal == 1 and "rapida" in (qualidade or ""), "banco: resposta feita às pressas ficou sinalizada (qualidade)")
            c.conferir(inicios == 2, f"banco: começo do questionário contado sem identificar ({inicios} registros: início e grupo)")

        print("4. Encerrar ciclo")
        pg.locator(".nav-item:has-text('Questionário')").click()
        pg.locator(".botao--perigo-suave").click()
        pg.locator(".botao--perigo-cheio").click()
        expect(pg.locator(".ciclo-meta__status")).to_contain_text("encerrada")
        c.conferir(True, "painel: ciclo encerrado pelo diálogo de confirmação")
        qp.goto(url)
        qp.wait_for_selector(".rq-titulo")
        c.conferir("encerrado" in qp.locator(".rq-titulo").inner_text(), "questionário: link de ciclo encerrado recusa respostas")

        print("5. Celular")
        mp = anonimo.new_page()
        entrar(mp, base)
        mp.screenshot(path=str(saida / "celular_painel.png"))
        mp.locator(".topbar__menu").click()
        mp.wait_for_timeout(400)
        c.conferir("app--menu" in (mp.locator(".app").get_attribute("class") or ""), "celular: menu lateral abre como gaveta")
        mp.screenshot(path=str(saida / "celular_menu.png"))
        largura = mp.evaluate("document.documentElement.scrollWidth")
        c.conferir(largura <= 391, f"celular: sem rolagem lateral ({largura}px)")

        print("6. Qualidade da coleta e como a Psyra calcula")
        pg.locator("#seletor-coleta").select_option(
            index=pg.evaluate(
                "[...document.querySelectorAll('#seletor-coleta option')].findIndex(o => o.textContent.includes('2º semestre'))"
            )
        )
        pg.wait_for_timeout(800)
        pg.locator(".nav-item:has-text('Qualidade da coleta')").click()
        pg.wait_for_selector(".qualidade")
        c.conferir(pg.locator(".qualidade .kpi").count() == 4, "qualidade: participação, término, sinalizadas e tempo")
        c.conferir(pg.locator(".qualidade__tabela tbody tr").count() == 5, "qualidade: tabela com os 5 grupos")
        c.conferir("oculto" in pg.locator(".qualidade__tabela tbody tr").last.inner_text(), "qualidade: grupo com n < 5 sem contagem de sinalizadas")
        c.conferir(pg.locator(".ritmo__barra").count() == 10, "qualidade: ritmo nas 10 partes")
        pg.screenshot(path=str(saida / "painel_qualidade.png"), full_page=True)
        pg.locator(".nav-item:has-text('Como a Psyra calcula')").click()
        c.conferir(pg.locator(".metodo__passo").count() == 10, "metodologia: 10 passos explicados")

        print("7. Conta: menu, configurações, equipe e primeiro acesso")
        pg.locator(".menu-usuario__botao").click()
        c.conferir(pg.locator(".menu-usuario__lista [role=menuitem]").count() == 3, "menu da conta: configurações, como calcula e sair")
        pg.locator("[role=menuitem]:has-text('Configurações')").click()
        c.conferir(pg.locator(".config__aba").count() == 6, "configurações: 6 abas para gestão de RH")
        pg.locator(".config__aba:has-text('Aparência')").click()
        pg.locator(".config__opcao:has-text('Claro')").click()
        pg.wait_for_timeout(300)
        c.conferir(pg.evaluate("document.documentElement.dataset.tema") == "claro", "configurações: tema claro escolhido na aba Aparência")
        pg.locator(".config__opcao:has-text('Escuro')").click()
        pg.locator(".config__aba:has-text('Equipe')").click()
        novo_email = f"e2e.{uuid.uuid4().hex[:6]}@nebula.com.br"
        pg.fill("#eq-nome", "Teste Ponta")
        pg.fill("#eq-email", novo_email)
        pg.locator(".config__cartao .botao[type=submit]").click()
        pg.wait_for_selector(".config__senha-temp")
        temporaria = pg.locator(".config__senha-temp code").inner_text().strip()
        c.conferir(temporaria.startswith("Psyra-"), "equipe: acesso criado com senha temporária mostrada uma vez")
        pg.keyboard.press("Escape")

        novo = nav.new_context(viewport={"width": 1366, "height": 860}, locale="pt-BR").new_page()
        novo.on("pageerror", lambda e: erros_console.append(str(e)))
        novo.goto(f"{base}/entrar")
        novo.locator(".entrada__perfil").first.click()
        novo.fill("input[type=email]", novo_email)
        novo.fill("#senha", temporaria)
        novo.locator(".campo-senha__olho").click()
        c.conferir(novo.locator("#senha").get_attribute("type") == "text", "login: botão mostra a senha")
        novo.locator(".entrada__esqueci").click()
        c.conferir(novo.locator(".entrada__esqueci-passos li").count() == 3, "login: 'Esqueci minha senha' explica o caminho seguro")
        novo.keyboard.press("Escape")
        novo.locator("form .botao[type=submit]").click()
        novo.wait_for_selector("#senha-nova")
        c.conferir(True, "primeiro acesso: senha temporária pede senha nova antes do painel")
        novo.fill("#senha-nova", "123")
        novo.fill("#senha-confirma", "123")
        novo.locator("form .botao[type=submit]").click()
        novo.wait_for_timeout(500)
        c.conferir("10 caracteres" in novo.locator(".erro").inner_text(), "primeiro acesso: senha fraca recusada com o motivo")
        novo.fill("#senha-nova", "girassol-azul-2026")
        novo.fill("#senha-confirma", "girassol-azul-2026")
        novo.locator("form .botao[type=submit]").click()
        novo.wait_for_url(re.compile(r".*/painel"))
        novo.wait_for_selector(".kpi")
        c.conferir(True, "primeiro acesso: senha criada e painel aberto")
        novo.locator(".menu-usuario__botao").click()
        novo.locator("[role=menuitem]:has-text('Configurações')").click()
        novo.locator(".config__aba:has-text('Segurança')").click()
        novo.locator(".botao--perigo-suave").click()
        novo.locator(".botao--perigo-cheio").click()
        novo.wait_for_url(re.compile(r".*/(entrar)?$"))
        novo.goto(f"{base}/painel")
        novo.wait_for_timeout(800)
        c.conferir("/entrar" in novo.url, "segurança: 'Sair de todos os aparelhos' encerra a sessão")

        anonimo.close()
        nav.close()

    erros = [e for e in erros_console if not any(x in e for x in IGNORAR)]
    c.conferir(not erros, f"console sem erros de JavaScript ({erros[:3]})")
    print(f"\n{len(c.ok)} ok · {len(c.falhas)} falha(s)")
    for f in c.falhas:
        print("  FALHOU:", f)
    return 0 if not c.falhas else 1


if __name__ == "__main__":
    sys.exit(main())
