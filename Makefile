# Деплой и эксплуатация GameOfBraza через Docker.
# Подробности — в README («Деплой одной командой»).

.PHONY: up down stop logs ps build migrate seed seed-demo reset

## up: деплой одной командой (генерит секреты, собирает, поднимает стек)
up:
	./start.sh

## down: остановить и удалить контейнеры (данные БД сохраняются в volume)
down:
	docker compose down

## stop: остановить контейнеры, не удаляя
stop:
	docker compose stop

## logs: хвост логов веб-сервера
logs:
	docker compose logs -f web

## ps: статус контейнеров
ps:
	docker compose ps

## build: пересобрать образы
build:
	docker compose build

## migrate: применить миграции (одноразовый контейнер)
migrate:
	docker compose run --rm migrate pnpm --filter @gob/db migrate:deploy

## seed: идемпотентный сид справочников
seed:
	docker compose run --rm migrate pnpm --filter @gob/db seed

## seed-demo: сид + демо-данные (Михалыч, dev-пользователи)
seed-demo:
	docker compose run --rm -e SEED_DEMO=true migrate pnpm --filter @gob/db seed

## reset: ПОЛНЫЙ сброс — удаляет контейнеры И данные БД (volume)
reset:
	docker compose down -v
