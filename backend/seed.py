"""Popula o banco de demonstração. Sprint: S6 | Risco: R1.

⚠️ TODOS os dados gerados aqui são SINTÉTICOS, criados por regra com semente
fixa. Servem para demonstrar o produto funcionando ponta a ponta. Não são dado
de pessoa real, não passaram por CEP/TCLE e NUNCA podem treinar modelo nem
aparecer como resultado de pesquisa.

Uso:  python seed.py [--reset]
"""

from __future__ import annotations

import argparse
import json
import logging
import random
import secrets
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import config  # noqa: E402
from app.db import conectar, criar_schema, executar  # noqa: E402
from app.instrumento import carregar_instrumento  # noqa: E402
from app.security import gerar_hash_senha  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("seed")
SEMENTE = 42

GHES_DEMO = [
    ("GHE-01", "Atendimento ao cliente", "Operações", 24, "alto", "alinhado"),
    ("GHE-02", "Logística e expedição", "Operações", 18, "moderado", "alinhado"),
    ("GHE-03", "Desenvolvimento de produto", "Tecnologia", 15, "baixo", "revelador"),
    ("GHE-04", "Administrativo e financeiro", "Corporativo", 11, "moderado", "alinhado"),
    ("GHE-05", "Diretoria", "Corporativo", 4, "baixo", "alinhado"),
]

TEXTOS = {
    "alto": [
        "A rotina esta pesada, termino o dia exausto e ainda recebo cobranca fora do "
        "horario. Tem semana que nao durmo direito pensando na meta.",
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
    # Caso "Revelador": nota Likert boa, texto revelando exposicao.
    "revelador": [
        "No papel esta tudo certo, mas ando esgotado. Nao consigo desconectar e tenho "
        "dificuldade para dormir. Prefiro nao falar disso nas reunioes.",
        "Respondi o formulario com calma, so que a verdade e que estou no limite. "
        "Sobrecarga silenciosa, ninguem percebe.",
        "Time bom, processo bom, mas o cansaco nao passa e a ansiedade aumentou.",
    ],
}

FAIXAS_LIKERT = {"alto": (4, 5), "moderado": (2, 4), "baixo": (1, 3)}


def _gerar_likert(perfil: str, aleatorio: random.Random) -> dict[str, int]:
    """Gera um vetor Likert sintético coerente com o perfil de risco."""
    instrumento = carregar_instrumento()
    minimo, maximo = FAIXAS_LIKERT["baixo" if perfil == "revelador" else perfil]
    respostas: dict[str, int] = {}
    for bloco in instrumento["blocos"]:
        for indice, _ in enumerate(bloco["itens"], start=1):
            bruto = aleatorio.randint(minimo, maximo)
            # blocos reversos: nota alta = protecao, entao inverte a intencao
            valor = 6 - bruto if bloco["reverso"] else bruto
            respostas[f"{bloco['codigo']}{indice}"] = max(1, min(5, valor))
    return respostas


def popular(reset: bool = False) -> None:
    """Cria empresa, usuários, GHEs, coleta e respostas sintéticas."""
    caminho = Path(config.BANCO_URL)
    if reset and caminho.exists():
        caminho.unlink()
        logger.info("banco anterior removido: %s", caminho)

    conexao = conectar()
    criar_schema(conexao)
    aleatorio = random.Random(SEMENTE)

    if conexao.execute("SELECT COUNT(*) FROM empresa").fetchone()[0] > 0:
        logger.warning("banco ja populado — use --reset para recriar")
        conexao.close()
        return

    empresa_id = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO empresa (id, razao_social, cnpj, plano) VALUES (?,?,?,?)",
        (empresa_id, "Empresa Demonstração Ltda", "00.000.000/0001-00", "professional"),
    )

    usuarios = [
        ("gestor@demo.psyra.ai", "Gestora de RH (demo)", "gestor", "psyra123"),
        ("admin@demo.psyra.ai", "Administrador (demo)", "admin", "psyra123"),
    ]
    for email, nome, papel, senha in usuarios:
        executar(
            conexao,
            "INSERT INTO usuario_empresa (id, empresa_id, nome, email, senha_hash, papel)"
            " VALUES (?,?,?,?,?,?)",
            (uuid.uuid4().hex, empresa_id, nome, email, gerar_hash_senha(senha), papel),
        )

    ghe_ids: dict[str, str] = {}
    for codigo, nome, setor, efetivo, _, _ in GHES_DEMO:
        ghe_id = uuid.uuid4().hex
        ghe_ids[codigo] = ghe_id
        executar(
            conexao,
            "INSERT INTO ghe (id, empresa_id, codigo, nome, setor, efetivo) "
            "VALUES (?,?,?,?,?,?)",
            (ghe_id, empresa_id, codigo, nome, setor, efetivo),
        )

    coleta_id = uuid.uuid4().hex
    token = "demo-nr1-2026"
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
            token,
        ),
    )

    total = 0
    for codigo, _, _, efetivo, perfil, variante in GHES_DEMO:
        # GHE-05 fica com 3 respostas de propósito, para demonstrar a máscara n<5.
        quantidade = 3 if codigo == "GHE-05" else max(6, int(efetivo * 0.6))
        for _ in range(quantidade):
            texto_perfil = variante if variante == "revelador" else perfil
            texto = aleatorio.choice(TEXTOS[texto_perfil])
            executar(
                conexao,
                "INSERT INTO resposta (id, coleta_id, ghe_id, likert_json, "
                "texto_anonimizado, anonimizacao_ok, motor_anonimizacao, protocolo) "
                "VALUES (?,?,?,?,?,1,?,?)",
                (
                    uuid.uuid4().hex,
                    coleta_id,
                    ghe_ids[codigo],
                    json.dumps(_gerar_likert(perfil, aleatorio), separators=(",", ":")),
                    texto,
                    "seed-sintetico",
                    secrets.token_hex(4).upper(),
                ),
            )
            total += 1

    conexao.close()
    logger.info("empresa demo criada (id=%s)", empresa_id)
    logger.info("respostas sintéticas inseridas: %d", total)
    logger.info("login: gestor@demo.psyra.ai / psyra123")
    logger.info("formulário público: /responder/%s", token)


if __name__ == "__main__":
    if config.em_producao:
        raise SystemExit(
            "Seed de demonstração bloqueado em PSYRA_ENV=production. "
            "Use o superadmin para criar empresas e usuários reais."
        )
    parser = argparse.ArgumentParser(description="Seed de demonstração da Psyra AI")
    parser.add_argument("--reset", action="store_true", help="apaga o banco antes")
    popular(reset=parser.parse_args().reset)
