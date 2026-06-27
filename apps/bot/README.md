# @gob/bot — Telegram-бот

Ещё один потребитель игрового ядра (`@gob/rules` + `@gob/db` через `@gob/core`).
Ходит к той же БД напрямую (путь A, см. `TODO.md` п.9), без отдельного публичного API.
Технология — [grammY](https://grammy.dev), запуск через long-polling.

> Все инварианты движка обязательны (см. «Золотые правила» в `CLAUDE.md`): игровая
> математика только из `@gob/rules`, никакого clamp/блокирующей валидации, права по `ownerId`.

## Запуск (локально)

1. Создай `apps/bot/.env` (файл в `.gitignore`, в репозиторий не попадает):

   ```dotenv
   BOT_TOKEN="<токен от @BotFather>"
   BOT_HEALTHCHECK_PORT="3001"   # необязательно, по умолчанию 3001
   ```

2. Из корня монорепо:

   ```bash
   pnpm --filter @gob/bot dev    # tsx watch (автоперезапуск)
   # или
   pnpm --filter @gob/bot start  # однократный запуск
   ```

   `pnpm dev` в корне поднимает бота вместе с вебом (turbo).

## Healthcheck

long-polling не открывает свой HTTP-порт, поэтому отдельный лёгкий сервер отдаёт
`GET /health` → `200 {"status":"ok"}` (порт `BOT_HEALTHCHECK_PORT`). Используется
healthcheck'ом сервиса `bot` в `docker-compose.yml` (шаг «Деплой», TODO п.9).

## Состояние

Сейчас это **скелет**: команды `/start` и `/ping` (заглушки) + healthcheck. Дальше по плану
(`TODO.md` п.9) — привязка аккаунта (`/start <код>` → `TelegramLink`) и игровые команды
(`/me`, `/hp`, `/ap`, `/mana`, `/roll`, `/bag`, `/money`) через `@gob/core`.
