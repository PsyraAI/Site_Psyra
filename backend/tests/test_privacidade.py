"""Testes de conformidade LGPD/CFP. Sprint: S6 | Risco: R2 (BLOQUEANTE).

Se qualquer teste deste arquivo falhar, o produto não pode ir para piloto.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.anonimizador import anonimizar
from app.config import config
from app.scoring import mascarar


def test_anonimizador_remove_cpf_email_e_telefone() -> None:
    """PII direta é substituída por marcador antes de qualquer gravação."""
    texto = (
        "Meu nome é Carlos Andrade, CPF 123.456.789-00, email carlos@empresa.com.br, "
        "telefone (11) 98765-4321."
    )
    limpo, motor = anonimizar(texto)
    assert limpo is not None
    assert "123.456.789-00" not in limpo
    assert "carlos@empresa.com.br" not in limpo
    assert "98765-4321" not in limpo
    assert motor


def test_anonimizador_remove_nome_no_inicio_da_frase() -> None:
    """Regressão: nome com gatilho maiúsculo ("Sou o ...") vazava no ensaio e2e."""
    limpo, _ = anonimizar("Sou o Joao Pereira e estou exausto com a rotina.")
    assert limpo is not None
    assert "Joao" not in limpo and "Pereira" not in limpo
    assert "<NOME>" in limpo


def test_anonimizador_remove_nome_de_terceiro_com_cargo() -> None:
    """Nome de gestor citado no relato também é removido."""
    limpo, _ = anonimizar("A Gerente Carla cobra metas de forma agressiva.")
    assert limpo is not None
    assert "Carla" not in limpo


def test_anonimizador_preserva_conteudo_psicossocial() -> None:
    """A anonimização não pode destruir o sinal clínico do texto."""
    limpo, _ = anonimizar("Estou exausto com a sobrecarga e nao consigo dormir.")
    assert limpo is not None
    assert "exausto" in limpo and "sobrecarga" in limpo


def test_anonimizador_texto_vazio_nao_quebra() -> None:
    """Texto ausente devolve None sem levantar exceção."""
    limpo, _ = anonimizar(None)
    assert limpo is None


def test_mascarar_remove_todos_os_numeros() -> None:
    """GHE com n<5 não expõe nenhum índice."""
    mascarado = mascarar({"n_respostas": 3})
    assert mascarado["mascarado"] is True
    assert mascarado["indice_likert"] is None
    assert mascarado["indice_texto"] is None
    assert mascarado["fatores"] == []


def test_painel_mascara_ghe_com_n_menor_que_cinco(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    """A Diretoria (3 respostas no seed) aparece sem números no painel."""
    empresa = sessao_gestor["empresa_id"]
    coletas = cliente.get(
        f"/v1/empresas/{empresa}/coletas", headers=sessao_gestor["headers"]
    ).json()
    coleta_demo = next(c for c in coletas if c["token_publico"] == "demo-nr1-2026")
    painel = cliente.get(
        f"/v1/empresas/{empresa}/coletas/{coleta_demo['id']}/painel",
        headers=sessao_gestor["headers"],
    ).json()

    pequenos = [g for g in painel["ghes"] if g["n_respostas"] < config.N_MINIMO_GHE]
    assert pequenos, "o seed deve conter ao menos um GHE com n<5"
    for grupo in pequenos:
        assert grupo["mascarado"] is True
        assert grupo["indice_likert"] is None
        assert grupo["nivel_risco"] is None


def test_painel_nao_expoe_resposta_individual(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    """Nenhum campo do painel carrega resposta bruta, texto livre ou protocolo."""
    empresa = sessao_gestor["empresa_id"]
    coletas = cliente.get(
        f"/v1/empresas/{empresa}/coletas", headers=sessao_gestor["headers"]
    ).json()
    bruto = cliente.get(
        f"/v1/empresas/{empresa}/coletas/{coletas[0]['id']}/painel",
        headers=sessao_gestor["headers"],
    ).text.lower()

    for proibido in ("likert_json", "texto_anonimizado", "protocolo", "resposta_id"):
        assert proibido not in bruto


def test_coleta_real_bloqueada_sem_cep(cliente: TestClient, sessao_gestor: dict) -> None:
    """Abrir coleta com origem 'real' sem CEP aprovado retorna 403."""
    empresa = sessao_gestor["empresa_id"]
    resposta = cliente.post(
        f"/v1/empresas/{empresa}/coletas",
        headers=sessao_gestor["headers"],
        json={"titulo": "Coleta piloto real", "origem_dados": "real"},
    )
    assert resposta.status_code == 403
    assert "cep" in resposta.json()["detail"].lower()
