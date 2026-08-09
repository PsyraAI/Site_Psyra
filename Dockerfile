FROM node:22-alpine AS frontend

WORKDIR /app/frontend-react
COPY frontend-react/package.json frontend-react/package-lock.json ./
RUN npm ci
COPY frontend-react/ ./
RUN mkdir -p /app/backend && npm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend /app/backend/static-react/ ./backend/static-react/

RUN useradd --create-home --uid 10001 psyra \
    && chown -R psyra:psyra /app
USER psyra

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
