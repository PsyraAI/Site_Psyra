"""Smoke test ponta a ponta contra uma URL local ou HTTPS do Render.

Cobre readiness, login de gestor e painel. Não imprime tokens nem senhas.
"""

from __future__ import annotations

import argparse
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _requisitar(
    base: str,
    caminho: str,
    *,
    metodo: str = "GET",
    corpo: bytes | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict | list | None]:
    requisicao = Request(
        base.rstrip("/") + caminho,
        data=corpo,
        method=metodo,
        headers=headers or {},
    )
    try:
        with urlopen(requisicao, timeout=30) as resposta:
            bruto = resposta.read()
            status = resposta.status
    except HTTPError as erro:
        bruto = erro.read()
        status = erro.code
    except URLError as erro:
        raise SystemExit(f"falha de rede em {caminho}: {erro}") from erro
    if not bruto:
        return status, None
    try:
        return status, json.loads(bruto.decode("utf-8"))
    except json.JSONDecodeError:
        return status, None


def _assert(condicao: bool, mensagem: str) -> None:
    if not condicao:
        raise SystemExit(f"FALHA: {mensagem}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.getenv("PSYRA_SMOKE_BASE_URL", "http://127.0.0.1:8000"),
    )
    parser.add_argument(
        "--email",
        default=os.getenv("PSYRA_SMOKE_EMAIL", "gestor@demo.psyra.ai"),
    )
    parser.add_argument(
        "--senha",
        default=os.getenv("PSYRA_SMOKE_PASSWORD", "psyra123"),
    )
    args = parser.parse_args()
    base = args.base_url.rstrip("/")

    status, ready = _requisitar(base, "/health/ready")
    _assert(status == 200 and isinstance(ready, dict), "readiness deve responder 200")
    _assert(ready.get("status") == "ok", "readiness status != ok")
    print("OK readiness")

    corpo_login = json.dumps(
        {"email": args.email, "senha": args.senha}, separators=(",", ":")
    ).encode()
    status, login = _requisitar(
        base,
        "/v1/auth/login",
        metodo="POST",
        corpo=corpo_login,
        headers={"Content-Type": "application/json"},
    )
    _assert(status == 200 and isinstance(login, dict), "login deve responder 200")
    token = str(login["access_token"])
    empresa_id = str(login["empresa_id"])
    auth = {"Authorization": f"Bearer {token}"}
    print("OK login")

    status, coletas = _requisitar(
        base, f"/v1/empresas/{empresa_id}/coletas", headers=auth
    )
    _assert(status == 200 and isinstance(coletas, list) and coletas, "lista coletas")
    coleta = next((c for c in coletas if c.get("status") == "aberta"), coletas[0])
    coleta_id = str(coleta["id"])
    status, painel = _requisitar(
        base,
        f"/v1/empresas/{empresa_id}/coletas/{coleta_id}/painel",
        headers=auth,
    )
    _assert(status == 200 and isinstance(painel, dict), "painel deve responder 200")
    _assert(painel.get("selo", {}).get("provisorio") is True, "selo provisório ausente")
    print("OK painel")

    print("SMOKE OK")


if __name__ == "__main__":
    main()
