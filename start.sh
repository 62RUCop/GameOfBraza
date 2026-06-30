#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Деплой одной командой: поднимает БД, применяет миграции, идемпотентно сеет
# справочники, стартует веб-сервер. Идемпотентно — можно запускать повторно.
#
#   ./start.sh
#
# Требуется: Docker + docker compose v2, openssl.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=".env"
EXAMPLE_FILE=".env.production.example"

info()  { printf '\033[36m→\033[0m %s\n' "$1"; }
ok()    { printf '\033[32m✓\033[0m %s\n' "$1"; }

# ─── 0. Проверки окружения ──────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { echo "Не найден docker. Установи Docker и повтори."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Не найден 'docker compose' (v2)."; exit 1; }

# ─── 1. .env: создать из примера при первом запуске ─────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  info "$ENV_FILE не найден — создаю из $EXAMPLE_FILE"
  cp "$EXAMPLE_FILE" "$ENV_FILE"
fi

# Помощники чтения/записи значения по ключу в .env
get_env() { grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -n1 | cut -d= -f2- | sed 's/^"//;s/"$//'; }
set_env() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    # | как разделитель: значения секретов не содержат |
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}

# ─── 2. AUTH_SECRET: сгенерировать, если пусто/плейсхолдер ───────────────────────
AUTH_SECRET_VAL="$(get_env AUTH_SECRET)"
case "$AUTH_SECRET_VAL" in
  ""|*change*|*generate*|*сгенерируй*|*placeholder*)
    if command -v openssl >/dev/null 2>&1; then
      set_env AUTH_SECRET "$(openssl rand -hex 32)"
    else
      set_env AUTH_SECRET "$(head -c32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    fi
    ok "Сгенерирован AUTH_SECRET"
    ;;
esac

# ─── 3. ADMIN_PASSWORD: сгенерировать, если задан email, но пуст пароль ──────────
ADMIN_EMAIL_VAL="$(get_env ADMIN_EMAIL)"
ADMIN_PASS_VAL="$(get_env ADMIN_PASSWORD)"
GENERATED_ADMIN_PASS=""
if [ -n "$ADMIN_EMAIL_VAL" ] && [ -z "$ADMIN_PASS_VAL" ]; then
  if command -v openssl >/dev/null 2>&1; then
    GENERATED_ADMIN_PASS="$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | cut -c1-16)"
  else
    GENERATED_ADMIN_PASS="$(head -c12 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  set_env ADMIN_PASSWORD "$GENERATED_ADMIN_PASS"
  ok "Сгенерирован ADMIN_PASSWORD для $ADMIN_EMAIL_VAL"
  echo
  echo "  ┌─ Учётка администратора (сохранена в ${ENV_FILE}) ─┐"
  echo "  │  email:    ${ADMIN_EMAIL_VAL}"
  echo "  │  password: ${GENERATED_ADMIN_PASS}"
  echo "  └────────────────────────────────────────────────────┘"
  echo
fi

# ─── 4. Сборка и запуск ─────────────────────────────────────────────────────────
info "Сборка образов и запуск контейнеров (это займёт время при первом запуске)…"
docker compose up -d --build --wait

# ─── 5. Итог ────────────────────────────────────────────────────────────────────
PORT="$(get_env WEB_PORT)"; PORT="${PORT:-3000}"
URL="$(get_env AUTH_URL)"
echo
if [ -n "$URL" ]; then
  ok "Готово! Приложение доступно на ${URL}"
else
  # AUTH_URL пуст — origin определяется из Host-заголовка (AUTH_TRUST_HOST=true),
  # поэтому работает по любому IP/домену сервера. Точный адрес зависит от того,
  # как ты заходишь; локально — http://localhost:${PORT}.
  ok "Готово! Приложение слушает порт ${PORT} — открывай http://<ip-или-домен-сервера>:${PORT}"
fi
if [ -n "$GENERATED_ADMIN_PASS" ]; then
  echo
  echo "  Учётка администратора (сохранена в ${ENV_FILE}):"
  echo "    email:    ${ADMIN_EMAIL_VAL}"
  echo "    password: ${GENERATED_ADMIN_PASS}"
fi
echo
echo "  Логи:   docker compose logs -f web"
echo "  Стоп:   docker compose down"
