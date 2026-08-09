"""Configuração da API Psyra. Sprint: S6 | Risco: R2 (segredos fora do código)."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR: Path = Path(__file__).resolve().parent.parent  # backend/
DIR_REACT: Path = BASE_DIR / "static-react"  # build do Vite (npm run build)
DIR_DADOS: Path = BASE_DIR / "data"
RAIZ_PROJETO: Path = BASE_DIR.parent

# Carrega .env da raiz do projeto (e de backend/) se python-dotenv estiver presente.
try:
    from dotenv import load_dotenv

    load_dotenv(RAIZ_PROJETO / ".env")
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass


class Config:
    """Parâmetros de execução lidos do ambiente, com padrão seguro para demo."""

    APP_NOME: str = "Psyra AI — API"
    APP_VERSAO: str = "0.1.0-mvp"
    AMBIENTE: str = os.getenv("PSYRA_ENV", "development").strip().lower()
    PUBLIC_URL: str = os.getenv("PSYRA_PUBLIC_URL", "").strip().rstrip("/")
    SENTRY_DSN: str = os.getenv("PSYRA_SENTRY_DSN", "").strip()
    DOCS_ATIVOS: bool = os.getenv("PSYRA_DOCS", "true").lower() == "true"

    # Banco: SQLite por padrão. Com PSYRA_DATABASE_URL → Postgres/Supabase.
    BANCO_URL: str = os.getenv("PSYRA_DB", str(BASE_DIR / "psyra.db"))
    DATABASE_URL: str = (
        os.getenv("PSYRA_DATABASE_URL") or os.getenv("DATABASE_URL") or ""
    ).strip()

    @property
    def usa_postgres(self) -> bool:
        url = self.DATABASE_URL.lower()
        return url.startswith("postgres://") or url.startswith("postgresql://")

    # JWT (HS256 implementado com hmac da stdlib — sem dependência externa).
    JWT_SEGREDO: str = os.getenv("PSYRA_JWT_SECRET", "dev-somente-local-trocar-em-prod")
    JWT_EXPIRA_MIN: int = int(os.getenv("PSYRA_JWT_EXP_MIN", "480"))
    FORMS_WEBHOOK_SEGREDO: str = os.getenv(
        "PSYRA_FORMS_WEBHOOK_SECRET",
        "dev-forms-somente-local-trocar-em-prod",
    )
    RATE_LOGIN: str = os.getenv("PSYRA_RATE_LOGIN", "5/minute")
    RATE_COLETA: str = os.getenv("PSYRA_RATE_COLETA", "30/minute")
    RATE_WEBHOOK: str = os.getenv("PSYRA_RATE_WEBHOOK", "60/minute")

    # Conformidade (inegociável — ver SKILL Psyra, restrições absolutas).
    N_MINIMO_GHE: int = int(os.getenv("PSYRA_N_MINIMO", "5"))  # k-anonimato
    ORIGEM_DADOS_PADRAO: str = os.getenv("PSYRA_ORIGEM_DADOS", "sintetico")
    CEP_APROVADO: bool = os.getenv("PSYRA_CEP_APROVADO", "false").lower() == "true"

    # Motor de score (regra determinística — placeholder do MentalBERT-PT).
    MOTOR_VERSAO: str = "regra-v0.1-PROVISORIO"

    CORS_ORIGENS: list[str] = [
        o.strip()
        for o in os.getenv(
            "PSYRA_CORS", "http://localhost:8000,http://127.0.0.1:8000"
        ).split(",")
        if o.strip()
    ]
    HOSTS_PERMITIDOS: list[str] = [
        host.strip()
        for host in os.getenv(
            "PSYRA_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver"
        ).split(",")
        if host.strip()
    ]

    def __init__(self) -> None:
        hosts = list(self.HOSTS_PERMITIDOS)
        # Render injeta RENDER_EXTERNAL_HOSTNAME automaticamente.
        for candidato in (
            os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip(),
            os.getenv("RENDER_EXTERNAL_URL", "").strip(),
            self.PUBLIC_URL,
        ):
            if not candidato:
                continue
            host = candidato
            if "://" in host:
                host = host.split("://", 1)[1].split("/", 1)[0]
            host = host.split(":", 1)[0].strip().lower()
            if host and host not in hosts:
                hosts.append(host)
        if any(h.endswith(".onrender.com") for h in hosts) or os.getenv("RENDER"):
            if "*.onrender.com" not in hosts:
                hosts.append("*.onrender.com")
            if "site-psyra.onrender.com" not in hosts:
                hosts.append("site-psyra.onrender.com")
        self.HOSTS_PERMITIDOS = hosts
        if not self.PUBLIC_URL and os.getenv("RENDER_EXTERNAL_URL"):
            self.PUBLIC_URL = os.getenv("RENDER_EXTERNAL_URL", "").rstrip("/")

    @property
    def em_producao(self) -> bool:
        return self.AMBIENTE == "production"

    def validar_producao(self) -> None:
        """Recusa iniciar produção com banco local ou segredos de demonstração."""
        if not self.em_producao:
            return
        erros: list[str] = []
        if not self.usa_postgres:
            erros.append("PSYRA_DATABASE_URL Postgres é obrigatória")
        if len(self.JWT_SEGREDO) < 32 or self.JWT_SEGREDO.startswith("dev-"):
            erros.append("PSYRA_JWT_SECRET deve ter ao menos 32 caracteres aleatórios")
        if len(self.FORMS_WEBHOOK_SEGREDO) < 32 or self.FORMS_WEBHOOK_SEGREDO.startswith(
            "dev-"
        ):
            erros.append(
                "PSYRA_FORMS_WEBHOOK_SECRET deve ter ao menos 32 caracteres aleatórios"
            )
        if not self.PUBLIC_URL.startswith("https://"):
            erros.append("PSYRA_PUBLIC_URL deve usar HTTPS")
        if not self.CORS_ORIGENS or any(
            "localhost" in origem or "127.0.0.1" in origem for origem in self.CORS_ORIGENS
        ):
            erros.append("PSYRA_CORS deve conter apenas origens públicas")
        if not self.HOSTS_PERMITIDOS:
            erros.append("PSYRA_ALLOWED_HOSTS não pode ficar vazio")
        if erros:
            raise RuntimeError("configuração de produção inválida: " + "; ".join(erros))


config = Config()
