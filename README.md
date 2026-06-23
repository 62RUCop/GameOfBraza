# GameOfBraza

Цифровая анкета персонажа для настольной RPG. Монорепо на Next.js (App Router) с пакетами для правил игры, БД и UI.

## Требования

- **Node.js** 20+
- **pnpm** 9+
- **PostgreSQL** 16+ (локально или через Docker)

## Быстрый старт

### 1. Клонировать и установить зависимости

```bash
git clone <repo-url>
cd GameOfBraza
pnpm install
```

### 2. Настроить переменные окружения

```bash
cp .env.example apps/web/.env.local
```

Открой `apps/web/.env.local` и заполни:

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `AUTH_SECRET` | Случайный hex 32 байта — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `AUTH_URL` | URL приложения, по умолчанию `http://localhost:3000` |
| `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` | S3-совместимое хранилище (Cloudflare R2 или любой S3), опционально |

### 3. Поднять PostgreSQL

Через Docker:

```bash
docker run -d \
  --name gob-postgres \
  -e POSTGRES_USER=gob_user \
  -e POSTGRES_PASSWORD=gob_password \
  -e POSTGRES_DB=gameofbraza \
  -p 5432:5432 \
  postgres:16
```

Или используй любой локально установленный PostgreSQL — главное, чтобы `DATABASE_URL` в `.env.local` совпадал.

### 4. Применить миграции и засеять БД

```bash
pnpm db:migrate   # применить все миграции
pnpm db:seed      # справочники: расы, группировки, типажи НПС, правила, предметы
```

Для сида предметов из маркета положи файл `Gob_markets.csv` в `packages/db/seed/data/` — без него шаг пропускается.

### 5. Запустить в dev-режиме

```bash
pnpm dev
```

Приложение будет доступно на [http://localhost:3000](http://localhost:3000).

---

## Команды

```bash
pnpm dev           # dev-сервер (Next.js + turbo watch)
pnpm build         # production-сборка
pnpm lint          # ESLint по всем пакетам
pnpm typecheck     # tsc --noEmit по всем пакетам
pnpm test          # юнит-тесты (Vitest)
pnpm test:e2e      # E2E тесты (Playwright)

pnpm db:migrate    # prisma migrate dev
pnpm db:seed       # сиды справочников
```

> Перед коммитом должны проходить: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

---

## Структура монорепо

```
apps/
  web/              Next.js (App Router): UI + Server Actions + API
packages/
  rules/            Чистые функции игровой механики — HP, мана, тиры, репутация, баббл
  db/               Prisma schema, миграции, seed-скрипты
  ui/               Общие компоненты (shadcn/ui + Radix)
  config/           Общие конфиги ESLint / TypeScript / Tailwind
docs/
  TZ.md             Полное техническое задание и игровые правила
```

---

## Стек

| Слой | Технологии |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, react-hook-form, Zod, i18next |
| Backend | Next.js App Router (Server Actions + Route Handlers) |
| БД | PostgreSQL + Prisma |
| Auth | Auth.js (NextAuth v5) |
| Файлы | S3-совместимое хранилище (Cloudflare R2), presigned URL |
| Тесты | Vitest (юниты), Playwright (E2E) |
| Монорепо | pnpm workspaces + Turborepo |

---

## Роли пользователей

| Роль | Доступ |
|---|---|
| `player` | Только свои персонажи |
| `gm` | Все персонажи кампании + управление NPC |
| `admin` | + справочники (расы, группировки, предметы, правила) |

Первого admin-пользователя нужно создать вручную через БД или seed (`packages/db/src/seed/users-dev.ts`).
