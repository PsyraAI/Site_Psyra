"""Qualidade das respostas e evasão. Sprint: S10 | Risco: R1/R2."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.instrumento import carregar_instrumento, listar_ids_itens
from app.qualidade import LIMIAR_IGUAL, avaliar

INSTR = "psyra_form_v1"
TOKEN_DEMO = "nebula-nr1-2026"


def _atenta() -> dict[str, int]:
    """Resposta coerente: risco moderado em tudo, frase protetora com a nota invertida."""
    saida = {}
    for bloco in carregar_instrumento(INSTR)["blocos"]:
        for i, item in enumerate(bloco["itens"], start=1):
            reverso = (
                bool(item.get("reverso", bloco.get("reverso", False)))
                if isinstance(item, dict)
                else bool(bloco.get("reverso"))
            )
            risco = 3 + (i % 2)
            saida[f"{bloco['codigo']}{i}"] = 6 - risco if reverso else risco
    return saida


def _tempos(seg_item: float) -> list[int]:
    return [
        int(len(b["itens"]) * seg_item) for b in carregar_instrumento(INSTR)["blocos"]
    ]


def test_resposta_atenta_nao_e_sinalizada() -> None:
    q = avaliar(_atenta(), INSTR, _tempos(5))
    assert q["sinalizada"] is False and q["motivos"] == []


def test_linha_reta_e_sinalizada() -> None:
    q = avaliar({c: 4 for c in listar_ids_itens(INSTR)}, INSTR, _tempos(5))
    assert q["linha_reta"] and q["igual_frac"] >= LIMIAR_IGUAL
    # todas iguais também ficam incoerentes nos blocos com frases de direção oposta
    assert "linha_reta" in q["motivos"]


def test_pressa_e_sinalizada_pela_regra_dos_2_segundos() -> None:
    q = avaliar(_atenta(), INSTR, _tempos(1))
    assert q["rapida"] and q["partes_rapidas"] == 10


def test_sem_tempo_nao_acusa_pressa() -> None:
    q = avaliar(_atenta(), INSTR, None)
    assert q["com_tempo"] is False and q["rapida"] is False


def test_envio_guarda_qualidade_e_nunca_devolve(cliente: TestClient) -> None:
    payload = {
        "token_coleta": TOKEN_DEMO,
        "ghe_codigo": "GHE-01",
        "likert": {c: 4 for c in listar_ids_itens(INSTR)},
        "consentimento": True,
        "tempos_partes": _tempos(1),
    }
    resposta = cliente.post("/v1/coleta", json=payload)
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    assert "qualidade" not in corpo and "sinalizada" not in str(corpo)


def test_inicio_conta_sem_identificar(cliente: TestClient) -> None:
    assert (
        cliente.post(
            f"/v1/coletas/{TOKEN_DEMO}/inicio", json={"etapa": "inicio"}
        ).status_code
        == 204
    )
    assert (
        cliente.post(
            f"/v1/coletas/{TOKEN_DEMO}/inicio",
            json={"etapa": "grupo", "ghe_codigo": "GHE-02"},
        ).status_code
        == 204
    )
    assert (
        cliente.post(
            f"/v1/coletas/{TOKEN_DEMO}/inicio",
            json={"etapa": "grupo", "ghe_codigo": "XX"},
        ).status_code
        == 400
    )
    assert (
        cliente.post(
            f"/v1/coletas/{TOKEN_DEMO}/inicio", json={"etapa": "outra"}
        ).status_code
        == 422
    )


def test_painel_de_qualidade_respeita_n_minimo(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    emp = sessao_gestor["empresa_id"]
    coletas = cliente.get(
        f"/v1/empresas/{emp}/coletas", headers=sessao_gestor["headers"]
    ).json()
    coleta = next(c for c in coletas if c["token_publico"] == TOKEN_DEMO)
    q = cliente.get(
        f"/v1/empresas/{emp}/coletas/{coleta['id']}/qualidade",
        headers=sessao_gestor["headers"],
    )
    assert q.status_code == 200
    corpo = q.json()
    assert corpo["resumo"]["sinalizadas"] >= 3
    diretoria = next(g for g in corpo["grupos"] if g["codigo"] == "GHE-05")
    assert (
        diretoria["mascarado"]
        and diretoria["sinalizadas"] is None
        and diretoria["motivos"] is None
    )
    assert len(corpo["ritmo_por_parte"]) == 10
    assert all("protocolo" not in str(g) for g in corpo["grupos"])


def test_sinalizadas_saem_do_calculo_so_com_5_validas(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    emp = sessao_gestor["empresa_id"]
    h = sessao_gestor["headers"]
    coletas = cliente.get(f"/v1/empresas/{emp}/coletas", headers=h).json()
    coleta = next(c for c in coletas if c["token_publico"] == TOKEN_DEMO)
    painel = cliente.get(
        f"/v1/empresas/{emp}/coletas/{coleta['id']}/painel", headers=h
    ).json()
    atendimento = next(g for g in painel["ghes"] if g["codigo"] == "GHE-01")
    assert atendimento["n_excluidas"] >= 2
    assert painel["resumo"]["respostas_fora_do_calculo"] >= 3
    # desligando a política, nada sai do cálculo
    assert (
        cliente.patch(
            f"/v1/empresas/{emp}/configuracoes",
            headers=h,
            json={"excluir_sinalizadas": False},
        ).status_code
        == 200
    )
    painel2 = cliente.get(
        f"/v1/empresas/{emp}/coletas/{coleta['id']}/painel", headers=h
    ).json()
    assert painel2["resumo"]["respostas_fora_do_calculo"] == 0
    cliente.patch(
        f"/v1/empresas/{emp}/configuracoes", headers=h, json={"excluir_sinalizadas": True}
    )


def test_grupo_pequeno_nunca_calcula_com_menos_de_5(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    """Coleta nova com 5 respostas, 1 sinalizada: ficam 4 válidas, então entram todas."""
    emp = sessao_gestor["empresa_id"]
    h = sessao_gestor["headers"]
    nova = cliente.post(
        f"/v1/empresas/{emp}/coletas",
        headers=h,
        json={
            "titulo": f"Teste k {uuid.uuid4().hex[:6]}",
            "origem_dados": "teste",
            "instrumento": INSTR,
        },
    ).json()
    for i in range(5):
        likert = {c: 4 for c in listar_ids_itens(INSTR)} if i == 0 else _atenta()
        cliente.post(
            "/v1/coleta",
            json={
                "token_coleta": nova["token_publico"],
                "ghe_codigo": "GHE-03",
                "likert": likert,
                "consentimento": True,
                "tempos_partes": _tempos(5),
            },
        )
    painel = cliente.get(
        f"/v1/empresas/{emp}/coletas/{nova['id']}/painel", headers=h
    ).json()
    grupo = next(g for g in painel["ghes"] if g["codigo"] == "GHE-03")
    assert grupo["n_respostas"] == 5 and grupo["n_excluidas"] == 0
