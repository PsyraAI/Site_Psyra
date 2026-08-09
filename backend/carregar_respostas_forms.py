"""Carga de respostas do Google Forms no schema Psyra. Sprint: S6.

Lê o CSV exportado do Formulário Psyra (49 colunas), mapeia setor→GHE,
Likert texto→1-5 e texto livre via anonimizador. Grava origem_dados='teste'
(não é 'real' sem CEP).

Uso:
    python carregar_respostas_forms.py --csv ./respostas_forms.csv
    python carregar_respostas_forms.py --csv ./respostas_forms.csv \
        --empresa-email gestor@demo.psyra.ai --reset
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import secrets
import sys
import uuid
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from converter_formulario import SETORES  # noqa: E402

from app.anonimizador import FalhaAnonimizacao, anonimizar  # noqa: E402
from app.db import buscar_um, conectar, criar_schema, executar  # noqa: E402
from app.forms_integracao import codigo_ghe, normalizar_nota_forms  # noqa: E402
from app.instrumento import carregar_instrumento  # noqa: E402
from app.scoring import calcular_indice_likert  # noqa: E402
from app.security import gerar_hash_senha  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("carga-forms")

TOKEN_PADRAO = "forms-nr1-2026"
CNPJ_FORMS = "00.000.000/0004-00"
INSTRUMENTO = "psyra_form_v1"


def _mapa_colunas(instrumento: dict[str, Any]) -> dict[int, str]:
    """coluna_csv (índice) → id do item (A1, B2, …)."""
    mapa: dict[int, str] = {}
    for bloco in instrumento["blocos"]:
        for indice, item in enumerate(bloco["itens"], start=1):
            col = int(item["coluna_csv"])
            mapa[col] = f"{bloco['codigo']}{indice}"
    return mapa


def _garantir_empresa(conexao: Any, email_gestor: str | None) -> tuple[str, str]:
    """Resolve empresa alvo: por e-mail do gestor, ou cria empresa Forms."""
    if email_gestor:
        usuario = buscar_um(
            conexao,
            "SELECT empresa_id FROM usuario_empresa WHERE email = ? AND ativo = 1",
            (email_gestor.strip().lower(),),
        )
        if not usuario:
            raise SystemExit(f"gestor não encontrado: {email_gestor}")
        empresa = buscar_um(
            conexao,
            "SELECT id, razao_social FROM empresa WHERE id = ?",
            (usuario["empresa_id"],),
        )
        assert empresa is not None
        return empresa["id"], empresa["razao_social"]

    existente = buscar_um(
        conexao, "SELECT id, razao_social FROM empresa WHERE cnpj = ?", (CNPJ_FORMS,)
    )
    if existente:
        return existente["id"], existente["razao_social"]

    empresa_id = uuid.uuid4().hex
    razao = "Empresa Formulário Psyra (teste)"
    executar(
        conexao,
        "INSERT INTO empresa (id, razao_social, cnpj, plano) VALUES (?,?,?,?)",
        (empresa_id, razao, CNPJ_FORMS, "professional"),
    )
    executar(
        conexao,
        "INSERT INTO usuario_empresa (id, empresa_id, nome, email, senha_hash, "
        "papel) VALUES (?,?,?,?,?,?)",
        (
            uuid.uuid4().hex,
            empresa_id,
            "Gestor Forms",
            "gestor@forms.psyra.ai",
            gerar_hash_senha("psyra123"),
            "gestor",
        ),
    )
    return empresa_id, razao


def carregar(
    caminho_csv: Path,
    *,
    email_gestor: str | None = None,
    token: str = TOKEN_PADRAO,
    reset: bool = False,
    titulo: str = "Coleta Google Forms — Formulário Psyra",
) -> dict[str, Any]:
    """Importa o CSV do Forms e devolve resumo da carga."""
    conexao = conectar()
    criar_schema(conexao)
    instrumento = carregar_instrumento(INSTRUMENTO)
    colunas_item = _mapa_colunas(instrumento)

    if reset:
        antiga = buscar_um(
            conexao, "SELECT id FROM coleta WHERE token_publico = ?", (token,)
        )
        if antiga:
            executar(conexao, "DELETE FROM coleta WHERE id = ?", (antiga["id"],))

    empresa_id, razao = _garantir_empresa(conexao, email_gestor)

    with caminho_csv.open(encoding="utf-8-sig", newline="") as arquivo:
        leitor = csv.reader(arquivo)
        cabecalho = next(leitor)
        if len(cabecalho) < 49:
            raise SystemExit(
                f"CSV do Forms deve ter 49 colunas (Timestamp, setor, 46 Likert, texto); "
                f"vieram {len(cabecalho)}"
            )
        linhas = list(leitor)

    logger.info("CSV Forms: %d respostas | empresa=%s", len(linhas), razao)

    ghe_ids: dict[str, str] = {}
    for linha in linhas:
        setor = (linha[1] if len(linha) > 1 else "").strip() or "Outro"
        if setor not in SETORES:
            # Aceita setores livres do Forms; normaliza para "Outro" se vazio.
            pass
        codigo = codigo_ghe(setor)
        if codigo in ghe_ids:
            continue
        existente = buscar_um(
            conexao,
            "SELECT id FROM ghe WHERE empresa_id = ? AND codigo = ?",
            (empresa_id, codigo),
        )
        if existente:
            ghe_ids[codigo] = existente["id"]
            continue
        novo = uuid.uuid4().hex
        ghe_ids[codigo] = novo
        executar(
            conexao,
            "INSERT INTO ghe (id, empresa_id, codigo, nome, setor, efetivo) "
            "VALUES (?,?,?,?,?,0)",
            (novo, empresa_id, codigo, setor, setor),
        )

    coleta_id = uuid.uuid4().hex
    executar(
        conexao,
        "INSERT INTO coleta (id, empresa_id, titulo, instrumento, origem_dados, "
        "token_publico, status) VALUES (?,?,?,?, 'teste', ?, 'aberta')",
        (coleta_id, empresa_id, titulo, INSTRUMENTO, token),
    )

    carregadas = 0
    rejeitadas = 0
    sem_texto = 0
    for indice_linha, linha in enumerate(linhas, start=2):
        while len(linha) < 49:
            linha.append("")

        setor = (linha[1] or "").strip() or "Outro"
        codigo = codigo_ghe(setor)
        itens: dict[str, int] = {}
        incompleto = False
        for col, item_id in colunas_item.items():
            nota = normalizar_nota_forms(
                linha[col] if col < len(linha) else "",
                instrumento["escala"]["rotulos"],
            )
            if nota is None:
                incompleto = True
                break
            itens[item_id] = nota
        if incompleto or len(itens) < 46:
            logger.warning(
                "linha %d descartada: Likert incompleto/inválido", indice_linha
            )
            rejeitadas += 1
            continue

        try:
            calcular_indice_likert(itens, INSTRUMENTO)
        except ValueError as erro:
            logger.warning("linha %d descartada: %s", indice_linha, erro)
            rejeitadas += 1
            continue

        bruto = (linha[48] or "").strip() or None
        try:
            texto, motor = anonimizar(bruto)
        except FalhaAnonimizacao as erro:
            logger.warning("linha %d texto rejeitado: %s", indice_linha, erro)
            rejeitadas += 1
            continue
        if texto is None:
            sem_texto += 1

        executar(
            conexao,
            "INSERT INTO resposta (id, coleta_id, ghe_id, likert_json, "
            "texto_anonimizado, anonimizacao_ok, motor_anonimizacao, protocolo) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (
                uuid.uuid4().hex,
                coleta_id,
                ghe_ids[codigo],
                json.dumps(itens, separators=(",", ":")),
                texto,
                1 if texto else 0,
                motor,
                secrets.token_hex(4).upper(),
            ),
        )
        carregadas += 1

    executar(
        conexao,
        "UPDATE ghe SET efetivo = (SELECT COUNT(*) FROM resposta r WHERE r.ghe_id = "
        "ghe.id) WHERE empresa_id = ?",
        (empresa_id,),
    )
    conexao.close()

    resumo = {
        "empresa_id": empresa_id,
        "coleta_id": coleta_id,
        "token_publico": token,
        "instrumento": INSTRUMENTO,
        "carregadas": carregadas,
        "com_texto": carregadas - sem_texto,
        "rejeitadas": rejeitadas,
        "ghes": len(ghe_ids),
    }
    logger.info("carga Forms concluída: %s", resumo)
    return resumo


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Carga de respostas do Google Forms")
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument(
        "--empresa-email", default=None, help="E-mail do gestor da empresa alvo"
    )
    parser.add_argument("--token", default=TOKEN_PADRAO)
    parser.add_argument("--titulo", default="Coleta Google Forms — Formulário Psyra")
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    carregar(
        args.csv,
        email_gestor=args.empresa_email,
        token=args.token,
        reset=args.reset,
        titulo=args.titulo,
    )
