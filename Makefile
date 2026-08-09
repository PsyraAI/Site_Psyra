# Psyra AI — atalhos do MVP (S6)
.PHONY: instalar seed rodar teste lint formatar limpar schema-pg superadmin backup smoke

instalar:  ## instala as dependências
	pip install -r requirements.txt

seed:  ## recria o banco com os dados SINTÉTICOS de demonstração
	cd backend && python seed.py --reset

rodar: front-build  ## gera o frontend e sobe o site completo em http://localhost:8000
	cd backend && python -m uvicorn app.main:app --reload --port 8000

teste:  ## roda a suíte pytest
	cd backend && python -m pytest -q

lint:  ## ruff + black em modo verificação
	ruff check --config pyproject.toml backend/app backend/tests backend/seed.py scripts
	black --check --line-length 90 backend/app backend/tests backend/seed.py scripts

formatar:  ## aplica black e correções automáticas do ruff
	black --line-length 90 backend/app backend/tests backend/seed.py scripts
	ruff check --fix --config pyproject.toml backend/app backend/tests backend/seed.py scripts

schema-pg:  ## aplica schema no Postgres/Supabase (PSYRA_DATABASE_URL)
	python backend/aplicar_schema_postgres.py

superadmin:  ## cria o primeiro superadmin (variáveis PSYRA_BOOTSTRAP_ADMIN_*)
	python backend/criar_superadmin.py

backup:  ## dump lógico do Postgres
	python scripts/backup_postgres.py

smoke:  ## smoke test contra PSYRA_SMOKE_BASE_URL
	python scripts/smoke_producao.py

limpar:  ## remove banco e caches
	rm -f backend/psyra.db
	find . -name __pycache__ -type d -exec rm -rf {} +

# --- frontend React (Vite) ---
.PHONY: front-instalar front-dev front-build

front-instalar:  ## instala as dependências do React
	cd frontend-react && npm ci

front-dev:  ## Vite em http://localhost:5173 com proxy para a API na 8000
	cd frontend-react && npm run dev

front-build:  ## gera o bundle em backend/static-react/ (servido pelo FastAPI)
	cd frontend-react && npm run build
