# MOBILE-APP.md — план PWA (мобильное приложение)

Роадмап превращения веб-анкеты в устанавливаемое мобильное приложение через **PWA**.
Дополняет `TODO.md` (п.7 «PWA и офлайн») и `CLAUDE.md` (правила).

> **Статус: первая итерация («установка + офлайн-оболочка») реализована** ✅.
> Манифест, иконки, service worker (Serwist), офлайн-фолбэк и iOS-мета на месте; собрано
> и проверено отдачей роутов на production-сервере. Полная установка на устройство и
> Lighthouse-проверка — на Ubuntu-VM / реальном телефоне (см. «Верификация»).

Легенда: ✅ готово · 🚧 частично / в работе · ⬜ запланировано

---

## Контекст

Веб-приложение — адаптивный Next.js 15 (App Router) — уже хорошо открывается на телефоне.
Чтобы оно ставилось «как приложение» (иконка на экране, запуск в standalone, терпимость
к плохой сети), достаточно слоя **PWA**: web app manifest + service worker + иконки.
Переписывать UI не нужно. Это самый дешёвый путь к «мобильному приложению»; нативная
обёртка (Capacitor) и отдельный React Native/Expo-клиент — более тяжёлые треки и здесь
не рассматриваются (см. `TODO.md` п.2).

**Бонус архитектуры:** `packages/rules` — чистые функции игровых формул без зависимостей
от веба и БД. В любом будущем клиенте (Capacitor, React Native) вся математика (HP, мана,
ОД, тиры, бабл, классы) переиспользуется как есть.

### Текущее состояние
- ✅ `viewport` + `themeColor: "#0f172a"` заданы в `apps/web/src/app/layout.tsx`.
- ✅ Манифест отдаётся через `apps/web/src/app/manifest.ts` (`/manifest.webmanifest`);
  битая ручная ссылка `manifest: "/manifest.json"` убрана.
- ✅ `serwist` + `@serwist/next` подключены; service worker — `apps/web/src/app/sw.ts`
  (собирается в `public/sw.js`, в dev отключён). PWA-иконки сгенерированы из `icon_src.png`
  скриптом `apps/web/scripts/generate-icons.mjs` (`sharp`): `public/icons/*`, плюс favicon и
  apple-touch через файловые конвенции App Router (`src/app/icon.png`, `src/app/apple-icon.png`).
- ✅ Service worker **скомпонован** с `output: "standalone"` через `withSerwist` в
  `apps/web/next.config.ts` — существующие `outputFileTracingRoot` и `transpilePackages`
  сохранены. Генерируемый `public/sw.js` в `.gitignore`.

---

## Объём (scope)

Выбранный объём первой итерации — **«установка + офлайн-оболочка»**, данные онлайн.

### В объёме
- Устанавливаемость: иконка, `display: standalone`, theme/background, splash.
- Service worker (через **Serwist**) для кэширования статики и UI-оболочки.
- Офлайн-фолбэк (страница-заглушка при недоступной сети).
- Корректный web app manifest + iOS-мета.

### Вне объёма (будущие итерации)
- Офлайн-**чтение** данных персонажа и справочников.
- Офлайн-**правки** с очередью мутаций и синхронизацией при возврате сети.
- Push-уведомления.
- Нативная обёртка (Capacitor) и публикация в App Store / Google Play.
- Отдельный нативный клиент (React Native / Expo) — это трек `TODO.md` п.2,
  он требует публичного API и токен-авторизации.

> **Принцип данных:** данные персонажа и любые мутации — **только онлайн** (network-first,
> без кэша). Не отдаём устаревшие игровые значения из service worker (см. золотое правило 1
> в `CLAUDE.md`: расчёты — рекомендации, а сохранённые значения должны быть свежими).

---

## Этапы реализации

### 1. Web App Manifest ✅
- Создать `apps/web/src/app/manifest.ts` — типизированный `MetadataRoute.Manifest`
  (идиоматично для App Router; отдаётся как `/manifest.webmanifest`, `<link rel="manifest">`
  Next добавляет автоматически).
- Поля: `name`, `short_name`, `description`, `start_url: "/"`, `scope: "/"`,
  `display: "standalone"`, `background_color`, `theme_color: "#0f172a"` (синхронно с
  `viewport.themeColor`), `lang: "ru"`, массив `icons`.
- **Убрать** ручную строку `manifest: "/manifest.json"` из `layout.tsx`, чтобы не было
  дубля и битой ссылки на несуществующий файл.

### 2. Иконки ✅
> Способ генерации зафиксирован: скрипт `apps/web/scripts/generate-icons.mjs` на `sharp`
> (`pnpm --filter @gob/web icons`). Источник — `public/icon_src.png`. maskable кладётся на
> белый фон с логотипом в safe-zone (80%); apple-touch — full-bleed на белом (iOS не уважает
> прозрачность). Исходник `sharp` уже был в воркспейсе (транзитивно от Next), добавлен явно.
- Сгенерировать из `apps/web/public/character-silhouette.svg` (или простого брендового знака):
  `192×192`, `512×512`, maskable-`512×512`, `apple-touch-icon 180×180`, favicon.
- Сложить в `apps/web/public/icons/`, прописать в манифесте (с `purpose: "maskable"` для
  maskable-варианта).
- Под-шаг: способ генерации PNG. В репо нет инструмента ресайза — либо одноразовый скрипт
  на `sharp`, либо ручной экспорт из SVG. Зафиксировать выбранный способ.

### 3. Service Worker (Serwist) ✅
- Добавить зависимости `serwist` + `@serwist/next`.
- Обернуть `apps/web/next.config.ts` в `withSerwist`, **сохранив** существующие
  `output: "standalone"`, `outputFileTracingRoot`, `transpilePackages`.
- SW-исходник `apps/web/src/app/sw.ts`: precache манифеста сборки + офлайн-фолбэк.
- Отключать SW в dev (`disable: process.env.NODE_ENV === "development"`), чтобы не мешал
  HMR и не кэшировал на лету.
- Проверить, что сгенерированный `public/sw.js` попадает в standalone-сборку
  (file tracing копирует `public/`); при необходимости убедиться, что путь SW корректен
  за пределами dev.

### 4. iOS / мета установки ✅ (splash — отложен)
- Добавить в `layout.tsx` метадату `appleWebApp` (`capable`, `statusBarStyle`, `title`)
  и `apple-touch-icon`.
- Splash-экраны iOS — опционально (nice-to-have, можно отложить).

### 5. Стратегия кэширования (только оболочка) ✅
- **Precache:** ассеты сборки + офлайн-фолбэк-страница (`/~offline` попала в прекэш — проверено).
- **Статика** (`/_next/static`) → `CacheFirst`; картинки/шрифты/стили → `StaleWhileRevalidate`.
- **Навигации, RSC, данные, Server Actions** → `NetworkOnly`. **Отклонение от плана осознанное:**
  вместо `NetworkFirst` для навигаций выбран `NetworkOnly` + офлайн-фолбэк, чтобы **никогда** не
  отдавать устаревшие игровые значения из кэша (принцип данных ниже + золотое правило 1). Офлайн-
  чтение данных персонажа вне объёма этой итерации, поэтому кэшировать страницы незачем.

### 6. Офлайн-фолбэк ✅
- `apps/web/src/app/~offline/page.tsx` — статическая заглушка, занесена в precache, отдаётся
  при навигации без сети. **Отклонение:** строки захардкожены по-русски (как `sign-in/page.tsx`
  и прочие страницы — `useTranslation` в проекте пока не используется нигде), а не через i18next.
- `middleware.ts`: `/~offline` добавлен в `PUBLIC_PATHS`, а статика PWA (`/sw.js`,
  `/manifest.webmanifest`, иконки) исключена из `matcher` — иначе неавторизованный запрос к
  ним редиректило на `/sign-in`, ломая установку/регистрацию SW.

### 7. Обновление документации (по факту реализации) ✅
- `TODO.md` п.7 «PWA и офлайн» → 🚧 (первая итерация готова, офлайн-чтение — впереди).
- `CLAUDE.md` (строка про «ещё не реализовано») — упоминание про отсутствие PWA снято.
- Пункты этого файла отмечены соответствующими статусами.

---

## Верификация

> **Выполнено на Windows-dev:** `pnpm lint`/`typecheck`/`test` — зелёные; `pnpm build`
> компилирует и генерирует все статические страницы, Serwist собирает `public/sw.js`
> (`/~offline` в прекэше — проверено); production-сервер отдаёт `/manifest.webmanifest`
> (`application/manifest+json`), `/sw.js`, `/~offline`, иконки (200), а `/characters`
> по-прежнему редиректит на `/sign-in` (auth не сломан). `<head>` содержит `rel="manifest"`,
> `theme-color`, apple-touch-icon, `mobile-web-app-capable`.
> **Caveat Windows:** шаг `output: "standalone"` падает на `EPERM: symlink` (Windows требует
> прав на symlink) — это не связано с PWA и не воспроизводится в Docker/на Ubuntu-VM.
> **Осталось проверить вне Windows-dev:**

1. `pnpm lint` и `pnpm typecheck` (типы Serwist) — зелёные.
2. `pnpm build`, затем `pnpm --filter @gob/web start`; открыть `http://localhost:3000`.
3. DevTools → Application → **Manifest**: без ошибок, иконки подхвачены.
4. DevTools → Application → **Service Workers**: SW в статусе activated.
5. Lighthouse → категория PWA / «Installable» — проходит.
6. DevTools → Network → **Offline** → reload: грузится оболочка + офлайн-фолбэк.
7. Свежесть данных: правка онлайн отражается сразу (данные не из кэша).
8. Реальный телефон: «Добавить на главный экран», запуск в standalone, корректные иконка/тема.
9. Деплой-проверка по `CLAUDE.md` (золотое правило 9): на Ubuntu-VM через `sudo ./start.sh`,
   что standalone-сборка корректно отдаёт SW и манифест.

---

## Связь с дорожной картой

- `TODO.md` **п.7 «PWA и офлайн»** — этот документ детализирует его первую итерацию.
- `TODO.md` **п.2 «Публичный API + мобильное приложение»** — другой, более тяжёлый трек
  (REST/tRPC + токен-авторизация + нативный клиент). PWA его **не отменяет и не требует**:
  это независимый и более дешёвый способ дать «приложение на телефоне».

## Будущие итерации

- **Офлайн-чтение:** SWR-кэш листа персонажа и справочников для просмотра без сети.
- **Офлайн-правки:** очередь мутаций + синхронизация при возврате сети + разрешение
  конфликтов (большой блок).
- **Capacitor:** обёртка PWA для публикации в App Store / Google Play.
