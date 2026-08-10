"""Popula a empresa demo de produção com coleta + respostas sintéticas."""

from __future__ import annotations

import json
import random
import secrets
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.db import buscar_um, conectar, criar_schema, executar  # noqa: E402
from app.instrumento import carregar_instrumento  # noqa: E402

SEMENTE = 42
EMAIL_GESTOR = "gestor@demo.psyra.ai"
TOKEN = "demo-nr1-2026"

GHES_DEMO = [
    ("GHE-01", "Atendimento ao cliente", "Operações", 24, "alto", "alinhado"),
    ("GHE-02", "Logística e expedição", "Operações", 18, "moderado", "alinhado"),
    ("GHE-03", "Desenvolvimento de produto", "Tecnologia", 15, "baixo", "revelador"),
    ("GHE-04", "Administrativo e financeiro", "Corporativo", 11, "moderado", "alinhado"),
    ("GHE-05", "Diretoria", "Corporativo", 4, "baixo", "alinhado"),
]

TEXTOS = {
    "alto": [
        "A rotina esta pesada, termino o dia exausto e ainda recebo cobranca fora do horario.",
        "Sobrecarga constante, sem apoio da lideranca. Ja pensei em pedir demissao.",
        "Muita pressao por prazo, clima tenso, ninguem escuta a equipe.",
    ],
    "moderado": [
        "Tem dias bem corridos e outros tranquilos. O acumulo aparece no fim do mes.",
        "O time se ajuda, mas o volume de demanda cresceu e falta gente.",
        "Sinto cansaco no fim da semana, nada fora do normal.",
    ],
    "baixo": [
        "Ambiente tranquilo, tenho apoio do time e consigo organizar meu tempo.",
        "Gosto do que faco, ha respeito e equilibrio entre trabalho e vida pessoal.",
        "Rotina previsivel e lideranca acessivel.",
    ],
    "revelador": [
        "No papel esta tudo certo, mas ando esgotado. Nao consigo desconectar.",
        "Respondi com calma, so que a verdade e que estou no limite.",
        "Time bom, processo bom, mas o cansaco nao passa e a ansiedade aumentou.",
    ],
}

FAIXAS = {"alto": (4, 5), "moderado": (2, 4), "baixo": (1, 3)}


def _likert(perfil: str, aleatorio: random.Random) -> dict[str, int]:
    instrumento = carregar_instrumento("nr1_v2_demo")
    minimo, maximo = FAIXAS["baixo" if perfil == "revelador" else perfil]
    respostas: dict[str, int] = {}
    for bloco in instrumento["blocos"]:
        for indice, _ in enumerate(bloco["itens"], start=1):
            bruto = aleatorio.randint(minimo, maximo)
            valor = 6 - bruto if bloco["reverso"] else bruto
            respostas[f"{bloco['codigo']}{indice}"] = max(1, min(5, valor))
    return respostas


def main() -> None:
    conexao = conectar()
    criar_schema(conexao)
    aleatorio = random.Random(SEMENTE)

    gestor = buscar_um(
        conexao,
        "SELECT empresa_id FROM usuario_empresa WHERE email = ?",
        (EMAIL_GESTOR,),
    )
    if not gestor:
        raise SystemExit(f"gestor {EMAIL_GESTOR} nao encontrado")
    empresa_id = gestor["empresa_id"]

    executar(
        conexao,
        "UPDATE empresa SET plano = 'professional', porte = 'media', "
        "atuacao = 'tecnologia', ativo = 1 WHERE id = ?",
        (empresa_id,),
    )

    # Limpa ciclo demo anterior para recriar limpo
    antiga = buscar_um(
        conexao, "SELECT id FROM coleta WHERE token_publico = ?", (TOKEN,)
    )
    if antiga:
        executar(conexao, "DELETE FROM coleta WHERE id = ?", (antiga["id"],))

    ghe_ids: dict[str, str] = {}
    for codigo, nome, setor, efetivo, _, _ in GHES_DEMO:
        existente = buscar_um(
            conexao,
            "SELECT id FROM ghe WHERE empresa_id = ? AND codigo = ?",
            (empresa_id, codigo),
        )
        if existente:
            ghe_ids[codigo] = existente["id"]
            executar(
                conexao,
                "UPDATE ghe SET nome = ?, setor = ?, efetivo = ? WHERE id = ?",
                (nome, setor, efetivo, existente["id"]),
            )
        else:
            ghe_id = uuid.uuid4().hex
            ghe_ids[codigo] = ghe_id
            executar(
                conexao,
                "INSERT INTO ghe (id, empresa_id, codigo, nome, setor, efetivo) "
                "VALUES (?,?,?,?,?,?)",
                (ghe_id, empresa_id, codigo, nome, setor, efetivo),
            )

    # Schema legado no Supabase exige FK em instrumento(codigo).
    if buscar_um(
        conexao, "SELECT codigo FROM instrumento WHERE codigo = ?", ("nr1_v2_demo",)
    ) is None:
        try:
            executar(
                conexao,
                "INSERT INTO instrumento (codigo, nome, descricao) VALUES (?,?,?)",
                (
                    "nr1_v2_demo",
                    "NR-1 demo",
                    "Instrumento demonstrativo provisório",
                ),
            )
        except Exception:
            # tabela pode não existir em SQLite local
            pass
    if buscar_um(
        conexao, "SELECT codigo FROM instrumento WHERE codigo = ?", ("psyra_form_v1",)
    ) is None:
        try:
            executar(
                conexao,
                "INSERT INTO instrumento (codigo, nome, descricao) VALUES (?,?,?)",
                ("psyra_form_v1", "Psyra Form v1", "Instrumento Google Forms"),
            )
        except Exception:
            pass

    coleta_id = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO coleta (id, empresa_id, titulo, instrumento, origem_dados, "
        "token_publico, status) VALUES (?,?,?,?,?,?, 'aberta')",
        (
            coleta_id,
            empresa_id,
            "Mapeamento NR-1 — ciclo demonstrativo",
            "nr1_v2_demo",
            "sintetico",
            TOKEN,
        ),
    )

    total = 0
    for codigo, _, _, efetivo, perfil, variante in GHES_DEMO:
        quantidade = 3 if codigo == "GHE-05" else max(6, int(efetivo * 0.6))
        for _ in range(quantidade):
            texto_perfil = variante if variante == "revelador" else perfil
            executar(
                conexao,
                "INSERT INTO resposta (id, coleta_id, ghe_id, likert_json, "
                "texto_anonimizado, anonimizacao_ok, motor_anonimizacao, protocolo) "
                "VALUES (?,?,?,?,?,TRUE,?,?)",
                (
                    str(uuid.uuid4()),
                    coleta_id,
                    ghe_ids[codigo],
                    json.dumps(_likert(perfil, aleatorio), separators=(",", ":")),
                    aleatorio.choice(TEXTOS[texto_perfil]),
                    "seed-sintetico",
                    secrets.token_hex(4).upper(),
                ),
            )
            total += 1

    print(
        {
            "empresa_id": empresa_id,
            "coleta_id": coleta_id,
            "respostas": total,
            "login": EMAIL_GESTOR,
            "token_publico": TOKEN,
        }
    )
    conexao.close()


if __name__ == "__main__":
    main()
