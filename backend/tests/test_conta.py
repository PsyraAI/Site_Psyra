"""Login, sessão, troca de senha, configurações e equipe. Sprint: S10 | Risco: R2."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.security import validar_politica_senha


def _entrar(cliente: TestClient, email: str, senha: str, lembrar: bool = False) -> dict:
    r = cliente.post(
        "/v1/auth/login", json={"email": email, "senha": senha, "lembrar": lembrar}
    )
    assert r.status_code == 200, r.text
    return r.json()


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_politica_de_senha() -> None:
    assert validar_politica_senha("curta1") == ["use pelo menos 10 caracteres"]
    assert "não use o seu e-mail na senha" in validar_politica_senha(
        "marina.alves2026", "marina.alves@x.com"
    )
    assert validar_politica_senha("1234567890")
    assert validar_politica_senha("cavalo-bateria-grampo") == []


def test_login_errado_tem_mensagem_generica(cliente: TestClient) -> None:
    r = cliente.post(
        "/v1/auth/login", json={"email": "gestor@demo.psyra.ai", "senha": "errada123"}
    )
    assert r.status_code == 401 and r.json()["detail"] == "E-mail ou senha incorretos."


def test_convite_senha_temporaria_e_primeiro_acesso(
    cliente: TestClient, sessao_gestor: dict
) -> None:
    emp, h = sessao_gestor["empresa_id"], sessao_gestor["headers"]
    email = f"rh.{uuid.uuid4().hex[:6]}@nebula.com.br"
    r = cliente.post(
        f"/v1/empresas/{emp}/usuarios",
        headers=h,
        json={"nome": "Ana Teste", "email": email, "papel": "gestor"},
    )
    assert r.status_code == 201, r.text
    temporaria = r.json()["senha_temporaria"]
    assert temporaria.startswith("Psyra-")
    assert (
        cliente.post(
            f"/v1/empresas/{emp}/usuarios",
            headers=h,
            json={"nome": "Xavier", "email": email},
        ).status_code
        == 409
    )

    novo = _entrar(cliente, email, temporaria)
    assert novo["trocar_senha"] is True
    # com senha temporária, o painel fica bloqueado; perfil e troca de senha não
    assert (
        cliente.get(
            f"/v1/empresas/{emp}/coletas", headers=_h(novo["access_token"])
        ).status_code
        == 403
    )
    assert cliente.get("/v1/auth/me", headers=_h(novo["access_token"])).status_code == 200
    fraca = cliente.put(
        "/v1/conta/senha",
        headers=_h(novo["access_token"]),
        json={"senha_atual": temporaria, "senha_nova": "123"},
    )
    assert fraca.status_code == 400 and fraca.json()["detail"]["codigo"] == "senha_fraca"
    ok = cliente.put(
        "/v1/conta/senha",
        headers=_h(novo["access_token"]),
        json={"senha_atual": temporaria, "senha_nova": "girassol-azul-2026"},
    )
    assert ok.status_code == 200 and ok.json()["trocar_senha"] is False
    assert (
        cliente.get(
            f"/v1/empresas/{emp}/coletas", headers=_h(ok.json()["access_token"])
        ).status_code
        == 200
    )
    # o token antigo (da senha temporária) deixou de valer
    assert cliente.get("/v1/auth/me", headers=_h(novo["access_token"])).status_code == 401


def test_sair_de_todos_invalida_tokens(cliente: TestClient, sessao_gestor: dict) -> None:
    emp, h = sessao_gestor["empresa_id"], sessao_gestor["headers"]
    email = f"crp.{uuid.uuid4().hex[:6]}@nebula.com.br"
    temporaria = cliente.post(
        f"/v1/empresas/{emp}/usuarios",
        headers=h,
        json={"nome": "Bia CRP", "email": email, "papel": "crp"},
    ).json()["senha_temporaria"]
    t1 = _entrar(cliente, email, temporaria)
    ok = cliente.put(
        "/v1/conta/senha",
        headers=_h(t1["access_token"]),
        json={"senha_atual": temporaria, "senha_nova": "laranja-verde-77"},
    ).json()
    a = _entrar(cliente, email, "laranja-verde-77", lembrar=True)
    assert a["lembrar"] is True
    b = ok["access_token"]
    assert (
        cliente.post("/v1/auth/sair-de-todos", headers=_h(a["access_token"])).status_code
        == 204
    )
    assert cliente.get("/v1/auth/me", headers=_h(a["access_token"])).status_code == 401
    assert cliente.get("/v1/auth/me", headers=_h(b)).status_code == 401


def test_papel_crp_nao_gerencia_equipe(cliente: TestClient, sessao_gestor: dict) -> None:
    emp, h = sessao_gestor["empresa_id"], sessao_gestor["headers"]
    email = f"crp2.{uuid.uuid4().hex[:6]}@nebula.com.br"
    temporaria = cliente.post(
        f"/v1/empresas/{emp}/usuarios",
        headers=h,
        json={"nome": "Caio CRP", "email": email, "papel": "crp"},
    ).json()["senha_temporaria"]
    t = _entrar(cliente, email, temporaria)
    ok = cliente.put(
        "/v1/conta/senha",
        headers=_h(t["access_token"]),
        json={"senha_atual": temporaria, "senha_nova": "pinheiro-sul-55"},
    ).json()
    hc = _h(ok["access_token"])
    assert cliente.get(f"/v1/empresas/{emp}/usuarios", headers=hc).status_code == 403
    assert (
        cliente.patch(
            f"/v1/empresas/{emp}/configuracoes", headers=hc, json={"porte": "grande"}
        ).status_code
        == 403
    )
    cfg = cliente.get(f"/v1/empresas/{emp}/configuracoes", headers=hc).json()
    assert cfg["pode_editar"] is False and cfg["n_minimo"] == 5


def test_equipe_desativar_e_nova_senha(cliente: TestClient, sessao_gestor: dict) -> None:
    emp, h = sessao_gestor["empresa_id"], sessao_gestor["headers"]
    email = f"apoio.{uuid.uuid4().hex[:6]}@nebula.com.br"
    criado = cliente.post(
        f"/v1/empresas/{emp}/usuarios",
        headers=h,
        json={"nome": "Davi Apoio", "email": email},
    ).json()
    uid = criado["usuario"]["id"]
    lista = cliente.get(f"/v1/empresas/{emp}/usuarios", headers=h).json()
    assert any(u["id"] == uid for u in lista) and any(u["voce"] for u in lista)
    nova = cliente.post(f"/v1/empresas/{emp}/usuarios/{uid}/senha-temporaria", headers=h)
    assert (
        nova.status_code == 200
        and nova.json()["senha_temporaria"] != criado["senha_temporaria"]
    )
    assert (
        cliente.post(
            "/v1/auth/login", json={"email": email, "senha": criado["senha_temporaria"]}
        ).status_code
        == 401
    )
    off = cliente.patch(
        f"/v1/empresas/{emp}/usuarios/{uid}/status", headers=h, json={"ativo": False}
    )
    assert off.status_code == 200 and off.json()["ativo"] is False
    assert (
        cliente.post(
            "/v1/auth/login",
            json={"email": email, "senha": nova.json()["senha_temporaria"]},
        ).status_code
        == 401
    )
    eu = next(u for u in lista if u["voce"])
    assert (
        cliente.patch(
            f"/v1/empresas/{emp}/usuarios/{eu['id']}/status",
            headers=h,
            json={"ativo": False},
        ).status_code
        == 400
    )


def test_atualizar_nome_e_configuracoes(cliente: TestClient, sessao_gestor: dict) -> None:
    emp, h = sessao_gestor["empresa_id"], sessao_gestor["headers"]
    assert (
        cliente.patch("/v1/conta", headers=h, json={"nome": "Marina Alves"}).json()[
            "nome"
        ]
        == "Marina Alves"
    )
    r = cliente.patch(
        f"/v1/empresas/{emp}/configuracoes",
        headers=h,
        json={"porte": "grande", "atuacao": "servicos"},
    )
    assert r.status_code == 200 and r.json()["porte"] == "grande"
    cliente.patch(
        f"/v1/empresas/{emp}/configuracoes",
        headers=h,
        json={"porte": "media", "atuacao": "tecnologia"},
    )
    assert (
        cliente.patch(
            f"/v1/empresas/{emp}/configuracoes", headers=h, json={"porte": "gigante"}
        ).status_code
        == 422
    )
