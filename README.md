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

## Деплой одной командой (Docker)

Единственное требование к серверу — **Docker + `docker compose` (v2)**. Весь стек
(PostgreSQL, миграции, идемпотентный сид, веб-сервер) поднимается одним скриптом.
Ни Node, ни pnpm, ни Postgres ставить на хост не нужно — всё внутри контейнеров.

### Первый запуск (чистый сервер)

```bash
git clone <repo-url> && cd GameOfBraza
./start.sh                 # или: make up
```

Больше ничего делать не нужно. `start.sh` при первом запуске сам:

1. создаёт `.env` из `.env.production.example`, если его нет;
2. генерирует `AUTH_SECRET` (`openssl rand -hex 32`), если он пуст;
3. генерирует `ADMIN_PASSWORD`, если задан `ADMIN_EMAIL`, но пароль пуст;
4. собирает образы и поднимает контейнеры (`docker compose up -d --build --wait`);
5. дожидается готовности и печатает URL + учётку администратора.

> ⚠️ **Запиши учётку администратора** — её печатает `start.sh` в конце вывода, и
> она сохраняется в `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Это единственный
> способ войти в свежую систему; пароль потом можно сменить в самом приложении.

**Хочешь задать значения вручную** (свой пароль БД, e-mail админа, публичный
домен, порт) — перед запуском отредактируй `.env.production.example` или
скопируй его в `.env` и поправь там. Пустые `AUTH_SECRET` и `ADMIN_PASSWORD`
оставь пустыми — их сгенерирует скрипт. Минимум для прода: смени
`POSTGRES_PASSWORD` и задай свой `ADMIN_EMAIL`.

### Последующие запуски и обновление версии

Тот же `start.sh` запускают и для обновления — он идемпотентен. Секреты в `.env`
уже есть и повторно не генерируются.

```bash
git pull                   # подтянуть новую версию кода
./start.sh                 # пересобрать, применить новые миграции, перезапустить
```

Что происходит при повторном запуске:

- образы пересобираются (слои кэшируются — быстро, если зависимости не менялись);
- сервис `migrate` применяет **только новые** миграции (`prisma migrate deploy`) и
  заново прогоняет идемпотентный сид (`upsert`: существующие данные и уже
  изменённый пароль админа **не затираются**);
- `web` перезапускается на новой сборке.

Данные БД переживают перезапуски и пересборки — они лежат в Docker volume
`db_data`. Если правок в зависимостях и миграциях не было, можно перезапустить
только веб без полной пересборки стека:

```bash
docker compose up -d --build web
```

### Управление работающим стеком

```bash
make logs        # хвост логов web   (docker compose logs -f web)
make ps          # статус контейнеров
make down        # остановить (данные БД в volume сохраняются)
make up          # снова поднять (= ./start.sh)
make migrate     # применить миграции отдельным прогоном
make seed-demo   # досеять демо-данные (персонаж «Михалыч»)
make reset       # ⚠️ ПОЛНЫЙ сброс: удалить контейнеры И volume БД (все данные!)
```

### Под капотом (`docker-compose.yml`)

| Сервис | Назначение |
|---|---|
| `db` | PostgreSQL 16 с volume `db_data` и healthcheck |
| `migrate` | одноразовый контейнер: `prisma migrate deploy` + идемпотентный сид, ждёт `db` healthy |
| `web` | Next.js standalone-сервер, стартует после успешного `migrate` |

Веб-образ — multi-stage `apps/web/Dockerfile` с `output: "standalone"` (минимальный
рантайм без dev-зависимостей). Миграции и сид выполняет отдельный образ `migrator`,
где есть Prisma CLI, `tsx` и сид-скрипты.

### Переменные окружения (`.env`)

| Переменная | Назначение |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | параметры БД (из них собирается `DATABASE_URL`) |
| `DATABASE_URL` | задай вручную только для внешней БД |
| `AUTH_SECRET` | секрет NextAuth; пусто → сгенерируется `start.sh` |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | публичный URL приложения |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | первичный admin (создаётся сидом, идемпотентно) |
| `WEB_PORT` | порт на хосте (по умолчанию `3000`) |
| `SEED_DEMO` | `true` → демо-данные (персонаж «Михалыч» + dev-пользователи) |

> При смене публичного URL за прокси/доменом задай `AUTH_URL` и `NEXT_PUBLIC_APP_URL`;
> `AUTH_TRUST_HOST=true` уже выставлен для self-host.

> 🛠 **Запускаешь Docker-деплой на dev-машине**, где уже есть свой `.env` (для
> `pnpm dev`, с `DATABASE_URL` на `localhost`)? Этот `.env` подхватит и compose,
> и контейнеры пойдут на `localhost` вместо сервиса `db`. Для деплоя используй
> отдельный файл: `docker compose --env-file .env.deploy up -d --build`.

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

Первичный admin создаётся сидом из `ADMIN_EMAIL` / `ADMIN_PASSWORD` (см. деплой выше,
`packages/db/src/seed/initial-admin.ts`). В dev-режиме вход обеспечивают тестовые
аккаунты из `packages/db/src/seed/users-dev.ts` (`admin@gob.local` и др.).
