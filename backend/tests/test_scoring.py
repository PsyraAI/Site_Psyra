"""Testes do motor de risco. Sprint: S6 | Risco: R1 (validade técnica)."""

from __future__ import annotations

import pytest

from app.instrumento import carregar_instrumento, listar_ids_itens, total_itens
from app.scoring import (
    agregar_ghe,
    calcular_indice_likert,
    calcular_sinal_texto,
    classificar_nivel,
)


def _respostas(valor: int) -> dict[str, int]:
    return {item: valor for item in listar_ids_itens()}


def test_instrumento_tem_46_itens() -> None:
    """O instrumento demo declara 46 itens Likert em 10 blocos."""
    assert total_itens() == 46


def test_indice_likert_respeita_limites_da_escala() -> None:
    """Todos os itens no mínimo/máximo produzem índice dentro de 0-100."""
    minimo, _ = calcular_indice_likert(_respostas(1))
    maximo, _ = calcular_indice_likert(_respostas(5))
    assert 0 <= minimo <= 100 and 0 <= maximo <= 100
    assert minimo != maximo


def test_indice_likert_recusa_valor_fora_da_escala() -> None:
    """Nota 7 é rejeitada (mesma trava do CHECK no banco)."""
    dados = _respostas(3)
    dados["A1"] = 7
    with pytest.raises(ValueError):
        calcular_indice_likert(dados)


def test_bloco_reverso_e_invertido() -> None:
    """No bloco C (protetor), nota alta deve reduzir o risco daquele bloco."""
    baixo = _respostas(3)
    alto = _respostas(3)
    for item in listar_ids_itens():
        if item.startswith("C"):
            baixo[item] = 5  # muita autonomia -> menos risco
            alto[item] = 1  # nenhuma autonomia -> mais risco
    _, blocos_baixo = calcular_indice_likert(baixo)
    _, blocos_alto = calcular_indice_likert(alto)
    assert blocos_baixo["C"] < blocos_alto["C"]


def test_sinal_texto_diferencia_relato_grave_de_tranquilo() -> None:
    """Texto de esgotamento pontua acima de texto neutro."""
    grave = calcular_sinal_texto(
        "Estou exausto, com insonia e sobrecarga. Ja pensei em pedir demissao."
    )
    tranquilo = calcular_sinal_texto(
        "Ambiente tranquilo, tenho apoio do time e equilibrio na rotina."
    )
    assert grave is not None and tranquilo is not None
    assert grave > tranquilo


def test_sinal_texto_ignora_texto_curto() -> None:
    """Texto muito curto não gera sinal (evita ruído)."""
    assert calcular_sinal_texto("ok") is None
    assert calcular_sinal_texto(None) is None


def test_classificacao_de_nivel() -> None:
    """Limiares baixo/moderado/alto conforme regra do produto."""
    assert classificar_nivel(10.0) == "baixo"
    assert classificar_nivel(45.0) == "moderado"
    assert classificar_nivel(75.0) == "alto"


def test_agregacao_detecta_divergencia_do_revelador() -> None:
    """Likert bom + texto grave gera divergência positiva (assinatura da marca)."""
    entradas = [
        {
            "likert": _respostas(2),
            "texto": (
                "No papel esta tudo certo, mas ando esgotado, com insonia e "
                "sobrecarga silenciosa. Nao aguento mais."
            ),
        }
        for _ in range(6)
    ]
    resultado = agregar_ghe(entradas)
    assert resultado["n_respostas"] == 6
    assert resultado["divergencia"] is not None
    assert resultado["divergencia"] > 0
    assert resultado["revelador"] is True


def test_agregacao_de_ghe_vazio_nao_expoe_nada() -> None:
    """GHE sem resposta volta mascarado e sem índice."""
    resultado = agregar_ghe([])
    assert resultado["n_respostas"] == 0
    assert resultado["mascarado"] is True
    assert resultado["indice_likert"] is None


def test_polaridade_por_item_no_bloco_misto() -> None:
    """Bloco com item protetor e item de risco junto (formulário real, blocos D e I).

    Marcar 5 no item protetor e 5 no item de risco não pode dar o mesmo valor:
    concordar com 'tenho tempo suficiente' é proteção, concordar com 'me sinto
    sobrecarregado' é risco. Antes da polaridade por item, os dois somavam igual.
    """
    from app.scoring import _texto_e_reverso

    protetor = {"texto": "A quantidade de tarefas é compatível", "reverso": True}
    risco = {"texto": "Frequentemente me sinto sobrecarregado", "reverso": False}

    assert _texto_e_reverso(protetor, False)[1] is True
    assert _texto_e_reverso(risco, True)[1] is False
    # item em string continua herdando a polaridade do bloco
    assert _texto_e_reverso("item antigo", True)[1] is True


def test_instrumento_do_formulario_real_carrega() -> None:
    """O instrumento gerado do formulário do Pedro tem 10 blocos e 46 itens."""
    instrumento = carregar_instrumento("psyra_form_v1")
    assert len(instrumento["blocos"]) == 10
    assert sum(len(b["itens"]) for b in instrumento["blocos"]) == 46
    mistos = [b["codigo"] for b in instrumento["blocos"] if b["polaridade_mista"]]
    assert mistos == ["D", "I"]
