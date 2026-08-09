# Frontend React — Psyra AI

Fluxo único: **entrada → login real → painel**, mais a rota pública do questionário.

```
/                        tela de entrada (boas-vindas → login)
/painel                  painel do gestor (rota protegida)
/responder/:token        questionário anônimo (rota pública)
```

## Rodar

```bash
npm ci
npm run dev      # http://localhost:5173, com proxy para a API na 8000
```

Para servir tudo pelo FastAPI em um processo só:

```bash
npm run build    # gera backend/static-react/
cd ../backend
python -m uvicorn app.main:app --port 8000
```

O `main.py` detecta `static-react/` e passa a servir o SPA na raiz, com fallback de
rota — `/painel` e `/responder/{token}` funcionam em recarga direta de página.

## Integração

Este é o único frontend do MVP. Toda chamada HTTP passa por `src/lib/api.js`; toda
tradução de campos do painel acontece em `src/lib/adaptadores.js`, sem espalhar o
contrato do backend pelos componentes.

`recharts` e `lucide-react` já estão instalados, que são as dependências que o
`psyra_dashboard.jsx` usa.

## Guardrail que não pode ser removido na troca

Grupo com `mascarado: true` chega do servidor **sem número nenhum** (`indiceLikert`,
`indiceTexto`, `divergencia` e `nivelRisco` vêm `null`). A interface não pode inventar
valor nesses casos — nem `0`, nem barra vazia sugerindo risco baixo. É k-anonimato, e
`tests/test_privacidade.py` garante o lado do servidor.
