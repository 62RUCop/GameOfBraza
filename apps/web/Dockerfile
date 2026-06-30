# syntax=docker/dockerfile:1

# Multi-stage build для монорепо (pnpm + Turborepo + Next.js standalone + Prisma).
# Контекст сборки — КОРЕНЬ репозитория (см. docker-compose.yml: context: .).
#
# Стадии:
#   base     — node + pnpm + openssl (нужен Prisma)
#   deps     — установка всех workspace-зависимостей (кэшируется по манифестам)
#   builder  — prisma generate + next build → .next/standalone
#   migrator — полный набор инструментов (prisma CLI, tsx, сиды) для миграций/сидов
#   runner   — минимальный образ: только standalone-сервер

ARG NODE_IMAGE=node:20-bookworm-slim

# ─── base ──────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
# openssl + ca-certificates требуются Prisma engine'у в рантайме и при генерации.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9.15.4 --no-fund --no-audit
WORKDIR /app

# ─── deps: установка зависимостей (слой кэшируется, пока не менялись манифесты) ──
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/rules/package.json ./packages/rules/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ─── builder: сборка Next standalone ────────────────────────────────────────────
FROM deps AS builder
COPY . .
# Заглушки только для сборки — настоящие значения приходят из docker-compose в рантайме.
ENV NODE_ENV=production \
    DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    AUTH_SECRET="placeholder-build-secret"
# Prisma Client должен быть сгенерирован до next build (его импортирует @gob/db).
RUN pnpm --filter @gob/db generate
RUN pnpm --filter @gob/web build
# webpack бандлит Prisma в чанки, но нативный query-engine (.so.node) бандлер
# не копирует. Кладём движок рядом с бандлом (Prisma ищет его в .next/server).
# См. https://pris.ly/d/engine-not-found-nextjs
RUN set -eux; \
    engine="$(find node_modules/.pnpm -name 'libquery_engine-*.so.node' | head -n1)"; \
    test -n "$engine"; \
    mkdir -p /prisma-engine; \
    cp -L "$engine" /prisma-engine/

# ─── migrator: одноразовый контейнер миграций и сидов ───────────────────────────
# Содержит prisma CLI, tsx и сид-скрипты (которых нет в standalone-рантайме).
FROM deps AS migrator
COPY . .
RUN pnpm --filter @gob/db generate
WORKDIR /app
CMD ["sh", "-c", "pnpm --filter @gob/db migrate:deploy && pnpm --filter @gob/db seed"]

# ─── runner: минимальный production-образ ───────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
# Standalone-сервер + статика + public (трейсинг от корня → пути apps/web/*).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
# Нативный Prisma query-engine рядом с бандлом (см. стадию builder).
COPY --from=builder --chown=nextjs:nodejs /prisma-engine/ ./apps/web/.next/server/
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
