# Imagen de despliegue: un solo proceso. La API sirve el build de la PWA (backend/app/frontend.py).
# Contexto: raíz del repositorio. backend/Dockerfile y src/frontend/Dockerfile siguen siendo los de docker compose.

FROM node:24-alpine AS web
WORKDIR /web
# misma versión de pnpm que usa el CI y la que generó pnpm-lock.yaml
RUN npm install -g pnpm@11.20.0
COPY src/frontend/package.json src/frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY src/frontend/ ./
# ruta relativa: la PWA y la API comparten origen, así que no hay CORS ni URL pública que fijar al compilar
ENV VITE_API_URL=/api/v1
# en la evaluación todo debe venir del servidor
ENV VITE_PERMITIR_MODO_LOCAL=false
RUN pnpm build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY backend/migrations ./migrations
COPY backend/alembic.ini .
COPY --from=web /web/dist /app/dist
ENV FRONTEND_DIST=/app/dist
EXPOSE 8000
# Render define PORT; en local cae a 8000. --proxy-headers: detrás del proxy de Render la API ve https, no http
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
