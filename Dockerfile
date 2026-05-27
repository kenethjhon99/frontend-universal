# =========================================================================
# Frontend SaaS — Dockerfile multi-stage
# - Stage `build`: instala deps, ejecuta `vite build`.
# - Stage `runtime`: nginx alpine sirve /dist con SPA fallback.
# =========================================================================

# ----- Stage 1: build -----
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Manifests del monorepo
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared-schemas/package.json packages/shared-schemas/
COPY backend/puntoventa/package.json backend/puntoventa/
COPY frontend/frontend_punto_venta/package.json frontend/frontend_punto_venta/
COPY pnpm-lock.yaml* ./

RUN pnpm install --filter "frontend..." --frozen-lockfile || \
    pnpm install --filter "frontend..."

# Codigo
COPY packages/shared-schemas ./packages/shared-schemas
COPY frontend/frontend_punto_venta ./frontend/frontend_punto_venta

# Build-time env. En docker-compose pasarlo como ARG/build-arg:
#   build:
#     args:
#       VITE_SAAS_API_URL: https://api.tu-dominio.com/api/saas
ARG VITE_SAAS_API_URL=http://localhost:4000/api/saas
ARG VITE_SENTRY_DSN=
ARG VITE_SENTRY_ENVIRONMENT=
ARG VITE_SENTRY_RELEASE=
ENV VITE_SAAS_API_URL=${VITE_SAAS_API_URL} \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN} \
    VITE_SENTRY_ENVIRONMENT=${VITE_SENTRY_ENVIRONMENT} \
    VITE_SENTRY_RELEASE=${VITE_SENTRY_RELEASE}

WORKDIR /app/frontend/frontend_punto_venta
RUN pnpm run build

# ----- Stage 2: runtime -----
FROM nginx:1.27-alpine AS runtime

# Config nginx con SPA fallback (todas las rutas → index.html)
COPY frontend/frontend_punto_venta/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/frontend/frontend_punto_venta/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
