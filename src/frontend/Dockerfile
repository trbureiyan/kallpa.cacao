# Imagen del frontend para docker compose (backend/docker-compose.yml, contexto ../src/frontend).
# Sin probar en esta máquina: el demonio de Docker no estaba en marcha al escribirla.
FROM node:24-alpine AS build
WORKDIR /web
# misma versión de pnpm que usa el CI y la que generó pnpm-lock.yaml
RUN npm install -g pnpm@11.20.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# docker-compose.yml pasa VITE_API_BASE_URL; el código lee VITE_API_URL
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=$VITE_API_BASE_URL
# el modo local queda apagado: en la evaluación todo debe venir del servidor
ENV VITE_PERMITIR_MODO_LOCAL=false
RUN pnpm build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /web/dist /usr/share/nginx/html
EXPOSE 80
