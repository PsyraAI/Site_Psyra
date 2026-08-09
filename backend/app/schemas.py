"""Contratos de entrada/saída da API (Pydantic v2). Sprint: S6 | Risco: R2."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import AnyHttpUrl, BaseModel, EmailStr, Field, field_validator


class LoginEntrada(BaseModel):
    """Credenciais de gestor/RH. Colaborador respondente NUNCA faz login."""

    email: EmailStr
    senha: str = Field(min_length=6, max_length=128)


class LoginSaida(BaseModel):
    access_token: str
    token_type: str = "bearer"
    nome: str
    papel: str
    empresa_id: str
    empresa_nome: str


class SuperadminLoginSaida(BaseModel):
    access_token: str
    token_type: str = "bearer"
    nome: str
    escopo: str = "superadmin"


class EmpresaAdminEntrada(BaseModel):
    razao_social: str = Field(min_length=2, max_length=180)
    cnpj: str = Field(pattern=r"^\d{14}$")
    plano: str = Field(default="starter", pattern="^(starter|professional|enterprise)$")


class EmpresaAdminSaida(BaseModel):
    id: str
    razao_social: str
    cnpj: str
    plano: str
    ativo: bool
    criado_em: str | datetime
    total_usuarios: int = 0


class UsuarioAdminEntrada(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=12, max_length=128)
    papel: str = Field(default="admin", pattern="^(gestor|admin|crp)$")


class UsuarioAdminSaida(BaseModel):
    id: str
    empresa_id: str
    nome: str
    email: str
    papel: str
    ativo: bool
    criado_em: str | datetime


class AtivacaoAdminEntrada(BaseModel):
    ativo: bool


class RedefinirSenhaAdminEntrada(BaseModel):
    senha: str = Field(min_length=12, max_length=128)


class GHESaida(BaseModel):
    id: str
    codigo: str
    nome: str
    setor: str | None = None
    efetivo: int


class ColetaEntrada(BaseModel):
    """Abertura de ciclo. O instrumento deixa de ser fixo no código: com mais de
    um instrumento disponível, quem abre a coleta escolhe qual aplicar."""

    titulo: str = Field(min_length=3, max_length=120)
    origem_dados: str = Field(default="sintetico", pattern="^(sintetico|teste|real)$")
    instrumento: str = Field(default="psyra_form_v1", pattern=r"^[a-z0-9_]+$")


class ColetaSaida(BaseModel):
    id: str
    titulo: str
    status: str
    origem_dados: str
    instrumento: str
    token_publico: str
    aberta_em: str
    total_respostas: int = 0


class GoogleFormConfigEntrada(BaseModel):
    url: AnyHttpUrl
    ativo: bool = True


class GoogleFormConfigSaida(BaseModel):
    coleta_id: str
    google_form_id: str | None = None
    google_form_url: str | None = None
    ativo: bool = False
    atualizado_em: str | None = None
    ultima_resposta_em: str | None = None
    webhook_path: str
    webhook_secret: str


class GoogleFormsRespostaItem(BaseModel):
    item_id: str | None = None
    titulo: str = Field(min_length=1, max_length=1000)
    valor: str | list[str] | int | float | bool | None = None


class GoogleFormsWebhookEntrada(BaseModel):
    response_id: str = Field(min_length=3, max_length=255)
    submitted_at: str | None = Field(default=None, max_length=80)
    answers: list[GoogleFormsRespostaItem] = Field(min_length=1, max_length=100)


class RespostaEntrada(BaseModel):
    """Payload público do questionário. Sem qualquer campo identificador."""

    token_coleta: str = Field(min_length=8, max_length=64)
    ghe_codigo: str = Field(min_length=1, max_length=32)
    likert: dict[str, int]
    texto_livre: str | None = Field(default=None, max_length=4000)
    consentimento: bool

    @field_validator("likert")
    @classmethod
    def validar_escala(cls, valor: dict[str, int]) -> dict[str, int]:
        """Recusa nota fora de 1-5 (mesma trava do CHECK no banco)."""
        if not valor:
            raise ValueError("nenhuma resposta Likert enviada")
        fora = {k: v for k, v in valor.items() if not 1 <= int(v) <= 5}
        if fora:
            raise ValueError(f"itens fora da escala 1-5: {sorted(fora)}")
        return {k: int(v) for k, v in valor.items()}

    @field_validator("consentimento")
    @classmethod
    def exigir_consentimento(cls, valor: bool) -> bool:
        """Sem consentimento não há coleta (TCLE)."""
        if not valor:
            raise ValueError("consentimento obrigatorio")
        return valor


class RespostaSaida(BaseModel):
    protocolo: str
    mensagem: str
    anonimizacao: dict[str, Any]


class PainelSaida(BaseModel):
    """Contrato consumido por fetchPainel() no frontend."""

    empresa: dict[str, Any]
    coleta: dict[str, Any]
    resumo: dict[str, Any]
    ghes: list[dict[str, Any]]
    revelador: list[dict[str, Any]]
    conformidade: dict[str, Any]
    plano_acao: list[dict[str, Any]]
    selo: dict[str, Any]
