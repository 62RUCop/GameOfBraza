# CLAUDE.md

Цифровая анкета персонажа для настольной RPG-системы. Полное ТЗ — в `docs/TZ.md` (читай его при работе над любой игровой механикой). Дорожная карта (что сделано и векторы развития) — в `TODO.md`. Этот файл — правила, которые действуют всегда.

> Перед задачей сверяйся с `TODO.md`, а по факту выполнения/старта пункта — обновляй его статус (✅/🚧/⬜). Не дублируй в этот файл то, что место в `TODO.md`: здесь правила, там — план.

> Язык: общаемся и комментируем по-русски; код, имена, коммиты — по-английски.
> Стек — **Next.js 15 фуллстек-монорепо** (App Router, React 19). Vite не используется (его роль закрывает Next).

---

## 🔴 Золотые правила (инварианты движка — не нарушать)

Эти правила — суть приложения. Если задача подталкивает их нарушить, остановись и переспроси.

1. **Вычисляемые значения — рекомендации, а не ограничения.** Никогда не добавляй валидацию, которая *запрещает* пользователю сохранить значение, и никогда не «зажимай» (clamp) ввод. HP может быть больше максимума (оверхил), значения могут быть отрицательными. Выход за расчётные рамки — это **нейтральная подсветка** «вероятно, в игре произошло незапланированное событие», НЕ ошибка. (Допустима только проверка *типа данных*, напр. `0–255` для характеристик — это границы хранилища, а не игровое правило.)
2. **Вся игровая математика живёт ТОЛЬКО в `packages/rules`.** И веб, и серверные действия импортируют формулы оттуда (`@gob/rules`). Никогда не дублируй и не переписывай расчёты (HP, мана, ОД, тиры, попадание/урон, бабл, классы, репутация, валюта, сытость) в другом месте. Константы берутся из `RuleConfig`, не хардкодом.
3. **Расчёт ≠ хранимое значение.** Хранится то, что ввёл пользователь. В `RuntimeState` для каждого производного максимума есть пара `*Computed` (предложение формулы) и `*Override` + `*ManualOverride` (зафиксированное пользователем значение). Это разные поля, не путать; при ручном оверрайде формула пересчитывает только `*Computed`, не трогая `*Override`.
4. **Никаких жёстких блоков.** Тир снаряжения/скиллов, лимит ячеек способностей, распределение характеристик — это подсказки, а не запреты. Любой предмет можно надеть, любой скилл выучить, любую характеристику выставить (в пределах типа данных).
5. **Смена константы в `RuleConfig` не каскадит.** Меняется только `suggestedValue`/`*Computed`; сохранённые фактические значения персонажей не трогаем автоматически.
6. **Роли = область видимости, не набор прав на правку.** `player` видит и правит только свои персонажи (`ownerId`), `gm` — все персонажи кампании + владеет своими NPC, `admin` — плюс `RuleConfig` и справочники. Владелец правит базовые характеристики своего персонажа напрямую (не только ГМ). `ownerId` изменяем.
7. **Это инструмент-хранилище, а не строгий античит-движок.** Не строй серверную «крепость»: достаточно проверки роли/владения на запрос. Не относись к каждому запросу как к враждебному.
8. **При тестировании сначала проверяй `localhost:3000`.** Скорее всего dev-сервер уже запущен (`predev` сам убивает процесс на :3000 перед стартом) — проверить работающий сервер проще, чем поднимать новый.

---

## Структура монорепо

```
apps/
  web/                 Next.js 15 (App Router): UI + Server Actions + Route Handlers
    src/actions/       серверные действия: characters, gm, admin, profile
    src/app/           роуты: /characters, /gm, /admin, /settings, /sign-in, /api/*
    src/components/    character-sheet/* (вкладки, пикеры), app-shell, темизация
    src/lib/auth.ts    NextAuth v5 (Credentials + JWT + PrismaAdapter)
    src/middleware.ts  редирект неавторизованных на /sign-in
    src/i18n/          i18next, локаль ru
packages/
  rules/               ★ чистые функции игровых формул (§3 ТЗ) + типы. Сердце движка.
  db/                  Prisma schema, миграции, сиды (в т.ч. из Gob_markets.csv)
  ui/                  общие утилиты/компоненты (shadcn/ui, `cn`)
  config/              общие пресеты eslint / tsconfig (base|library|nextjs) / tailwind
docs/
  TZ.md                спецификация
```

`packages/rules` не зависит ни от веба, ни от БД — только чистые функции и типы. Это позволяет покрыть его тестами целиком и переиспользовать на обеих сторонах.

### Модули `packages/rules`

- `tiers.ts` — `TIER_TO_DIE` ({0:4,1:6,2:12,3:20,4:60,5:100}), `attributePowerTier` (cap 4), `classIndex` (пороги).
- `derived.ts` — `computeDerived`: hpMax=str·hpPerStr, manaMax=spi·manaPerSpi, apMax=end·apPerEnd, slots=int, critBonus=⌊luc/lucCritStep⌋.
- `combat.ts` — `checkHit` (порог = `dieFaces−1−dex`), `computeDamage`.
- `bubble.ts` — `bubblePersistChance`, `resolveBubbleHit` (D100).
- `reputation.ts` — `reputationLabel`, `reputationPriceMultiplier`.
- `currency.ts` — `formatCurrency`/`toBronze` (1 золото = 10 серебра = 100 бронзы).
- `satiety.ts` — `satietyMin`/`satietyMax`, `locationTransitionDamage`.
- `config.ts` — Zod-схема `RuleConfigSchema` + `DEFAULT_RULE_CONFIG`.

---

## Модель данных (Prisma → PostgreSQL)

Источник истины — `packages/db/prisma/schema.prisma`. Опорные сущности:

- **Auth**: `Account` (роль, пароль bcrypt, `gmSkipConfirmation`), `Session`, `AuthAccount`, `VerificationToken`.
- **Справочники**: `Race`, `NpcArchetype` (раса × типаж), `Group` (модификатор fixed/dice + текстовый `specialEffect`), `SkillCategory`, `Skill`, `WildMagicCard`, `ItemTemplate` (+ `ItemTemplateSkill`), `RuleConfig` (key/value JSON).
- **Кампании**: `Campaign`, `CampaignCharacter`.
- **Персонаж**: `Character` хранит и FK, и свободный текст для расы/группировки — `raceId`/`raceName`, `groupId`/`groupName` (free-text, как кастомное снаряжение). Плюс `CharacterAttributes` (str/dex/int/spi/end/luc, дефолт 3).
- **Рантайм**: `RuntimeState` — текущие значения + пары `*Computed`/`*Override`/`*ManualOverride`/`*Author`/`*At` для hpMax, manaMax, apMax, dodge, armor, slots, critBonus; `bubbleCharges`, `activeEffects` (JSON).
- **Инвентарь**: `ItemInstance` (`templateId?` + `overrides` JSON + `location`), `BackpackSlot` (свободные текстовые предметы).
- **Прочее**: `Currency` + `CurrencyTransaction` (обязательный `moneyTarget`), `CharacterSkill`/`CharacterSkillTag`, `ClassBonusRecord` (атрибут × classIndex), `Reputation` (по расе, −10..+10), `Pet`, `InnateAbility`, `WildMagicDraw`, `AuditLog`.

---

## Команды

```bash
pnpm install              # установка (ТОЛЬКО pnpm; не npm/yarn)
pnpm dev                  # запуск всего в dev (turbo; predev убивает процесс на :3000)
pnpm build                # сборка
pnpm test                 # юнит-тесты (Vitest)
pnpm test:e2e             # Playwright
pnpm lint                 # ESLint
pnpm typecheck            # tsc --noEmit по всем пакетам
pnpm db:migrate           # prisma migrate dev
pnpm db:seed              # сиды справочников (rule-config, расы, группы, типажи НПС, dev-users)
pnpm --filter @gob/db studio    # Prisma Studio
pnpm --filter @gob/db generate  # перегенерировать Prisma Client
```

**Перед коммитом** должны проходить: `pnpm lint`, `pnpm typecheck`, `pnpm test`. Не коммить с падающими проверками.

---

## Конвенции

- **TypeScript strict** везде. Никаких `any` без явной причины в комментарии.
- **Валидация — Zod**, схемы общие между клиентом и сервером. Zod проверяет *тип/формат*, но НЕ навязывает игровые правила (см. золотое правило 1).
- **Серверное состояние** — TanStack Query; **локальный UI-стейт** — Zustand; **формы** — react-hook-form + Zod. Мутации — через Server Actions в `src/actions/*`.
- **Триада редактируемого поля**: введённое значение + серая подсказка-расчёт рядом + нейтральная подсветка при расхождении. Так оформляются характеристики, производные максимумы и free-text-поля (раса/группировка/предметы). Подробности — в скилле `ui-conventions`.
- **JSONB-поля** (`statBonuses`, `overrides`, `activeEffects`, `rolledValues`, эффект бонуса класса) типизируй через Zod-схему, а не свободный `Record<string, unknown>`.
- **Деньги** — единое нормализованное число в бронзе; номиналы — функция форматирования из `@gob/rules`. Любое изменение баланса → запись в `CurrencyTransaction` с обязательным `moneyTarget`.
- **Аудит-лог** (`AuditLog`) на изменения характеристик, снаряжения, валюты, репутации, классовых бонусов: `action`, `field`, `oldValue`, `newValue`.
- **i18n** — все строки через i18next; русский первым, без хардкода текста в компонентах. Локали — `apps/web/src/i18n/locales`.
- **Тесты `packages/rules` — исчерпывающие** (цель). Формулы тонкие (двойная шкала тиров, бабл по D100, классы по порогам `{6,9,12,20}`) — каждая граница покрыта кейсом. Сейчас покрыты `bubble` и `tiers`; остальные модули — на очереди.
- **Soft-delete** через `deletedAt`; физически данные не удаляем.

### Скиллы проекта (`.claude/skills`)

Перед профильной работой загляни в соответствующий скилл — там детали и инварианты:
`rules-engine` (формулы/механики), `db-and-migrations` (схема, JSONB, аудит, soft-delete, сиды),
`ui-conventions` (триада поля, shadcn, i18n, «пин» оверрайда), `test-writer` (Vitest/Playwright),
`seed-from-spreadsheet` (парсинг `Gob_markets.csv` → ItemTemplate/Skill).

---

## Стек (версии — в `package.json`, не полагайся на память)

Frontend: Next.js 15 + React 19, Tailwind + shadcn/ui (Radix), TanStack Query, Zustand, react-hook-form, Zod, i18next, next-themes.
Backend: Next.js App Router — Server Actions (`src/actions/*`) + Route Handlers (`src/app/api/*`). БД: PostgreSQL + Prisma 6.
Auth: Auth.js / NextAuth v5 — Credentials (email+пароль, bcryptjs), JWT-сессии, роль в токене, защита через `middleware.ts`. Монорепо: pnpm workspaces + Turborepo.

**Ещё не реализовано (план, не выдавай за готовое):** PWA (есть только `manifest` в метаданных, без `serwist`/`next-pwa`); загрузка картинок в S3/R2 (`appearanceImage` пока просто строка, presigned-upload нет).

---

## Сиды (состояние)

`pnpm db:seed` (`packages/db/src/seed/index.ts`) сейчас прогоняет: `rule-config`, расы, группы, типажи НПС, dev-users.
Dev-пользователи (не в production): `admin@gob.local` / `gm@gob.local` / `player@gob.local`.
Скрипты для предметов из `Gob_markets.csv` (`parse-csv.ts`, `csv-mapping.ts`), скиллов и тестового персонажа (`character-mikhalych.ts`) уже есть, но **в дефолтный сид пока не подключены** — подключай явно, когда нужно.

---

## Чего НЕ делать

- Не использовать `npm`/`yarn` — только `pnpm`.
- Не редактировать файлы в `docs/` без явной просьбы.
- Не трогать `.env*` и не коммитить секреты; для новых переменных обновляй `.env.example`.
- Не добавлять блокирующую игровую валидацию (см. золотые правила 1 и 4).
- Не дублировать формулы вне `packages/rules`.
- Не удалять данные физически — soft-delete (`deletedAt`).
- Не коммитить без прохождения lint/typecheck/test.
