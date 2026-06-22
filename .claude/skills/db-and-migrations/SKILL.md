---
name: db-and-migrations
description: >
  Prisma schema conventions, JSONB field patterns, audit log rules,
  soft-delete policy, and seed strategy for GameOfBraza.
  Use this skill whenever writing or reviewing Prisma schema, migrations,
  seed scripts, or any DB-layer code (packages/db). Covers the
  ItemTemplate/ItemInstance split, ClassBonusRecord, RuntimeState with
  manual_override pairs, CurrencyTransaction, and seeding from Gob_markets.csv.
---

# GameOfBraza — DB & Migrations Reference

## Stack

- **ORM**: Prisma (schema in `packages/db/schema.prisma`)
- **DB**: PostgreSQL
- **Migrations**: `prisma migrate dev` — one migration file per schema change
- **Seeds**: `packages/db/seed/` — TypeScript, run via `pnpm db:seed`
- **No physical deletes** — all entities use soft-delete (`deleted_at: DateTime?`)

---

## Core schema overview

### Account / roles

```prisma
model Account {
  id        String   @id @default(uuid())
  email     String   @unique
  login     String   @unique
  role      Role     // enum: player | gm | admin
  characters Character[]
}
```

`owner_id` on `Character` points to Account. NPC characters also have `owner_id` pointing to the GM who created them.

### Character

Key fields not obvious from the spec:
- `is_npc: Boolean @default(false)`
- `owner_id: String` — FK to Account (changeable)
- `unallocated_points: Int @default(0)` — pool of stat points the player can spend
- `quest_progress_stage: Int @default(0)`

### Attributes (1:1 with Character)

Six stat columns only: `strength, dexterity, intelligence, spirit, endurance, luck` — all `Int` (0–255).
**No `*_bonus` columns** — bonuses are summed on read from equipment, class records, and active effects.

### RuntimeState (1:1 with Character)

Holds fast-changing combat values: `current_hp, current_mana, current_ap, satiety_current`.
Also: `bubble_active: Boolean`, `bubble_persist_chance_current: Int`.
`active_effects: Json` — typed via Zod as `ActiveEffect[]`.

### manual_override pattern

Every computed derived value is stored as a **pair** (not just a single column):

```prisma
// Example for HP_max override
hp_max_computed     Int
hp_max_override     Int?
hp_max_manual       Boolean @default(false)
hp_max_override_by  String?   // Account.id
hp_max_override_at  DateTime?
```

`manual_override = false` → use `hp_max_computed`, recalculate on stat/equipment changes.
`manual_override = true` → use `hp_max_override`, do NOT recalculate until flag is cleared.

Apply this pattern to: `hp_max`, `mana_max`, `ap_max`, `dodge_bonus`, `armor_bonus`, `ability_slots`.
UI shows a "pinned" icon and a "reset to auto" button on any field where `manual_override = true`.

---

## JSONB fields

JSONB columns are typed via **Zod schemas**, not free `Record<string, unknown>`.
Define the schema in `packages/rules/src/types.ts` (or `packages/db/src/zod/`), import in both web and API.

### `ItemTemplate.stat_bonuses`

```ts
// Zod schema
const StatBonusesSchema = z.object({
  hp: z.number().int().optional(),
  dodge: z.number().int().optional(),
  armor: z.number().int().optional(),
  bubble_chance_pct: z.number().int().optional(),
  // extend as new bonus types are discovered in Gob_markets.csv
}).strict()
```

### `ItemInstance.overrides`

Same shape as `stat_bonuses` plus optional weapon stats:
```ts
const ItemOverridesSchema = StatBonusesSchema.extend({
  damage_dice: z.string().optional(),       // e.g. "3D6"
  bonus_crit_dice: z.string().optional(),
  scaling_coefficient: z.number().optional(),
})
```

### `ClassBonusRecord.rolled_values`

```ts
const RolledValuesSchema = z.array(z.number().int())
// empty array for SPI and LUC (deterministic)
```

### `RuntimeState.active_effects`

```ts
const ActiveEffectSchema = z.object({
  effect_type: z.string(),
  value: z.number(),
  source: z.string(),        // "item:<id>" | "skill:<id>" | "class_bonus"
  expires_at: z.string().datetime().optional(),
})
const ActiveEffectsSchema = z.array(ActiveEffectSchema)
```

**Rule**: never add a JSONB column without a corresponding Zod schema.

---

## Audit log

Any change to: attributes, equipment, currency, reputation, class bonuses, manual overrides → write to `AuditLog`.

```prisma
model AuditLog {
  id           String   @id @default(uuid())
  character_id String
  account_id   String   // who made the change
  entity       String   // "attribute" | "equipment" | "currency" | "reputation" | "class_bonus" | "override"
  field        String?  // which field changed
  old_value    Json?
  new_value    Json?
  created_at   DateTime @default(now())
}
```

Write audit log entries inside the same Prisma transaction as the actual change.

---

## CurrencyTransaction

```prisma
model CurrencyTransaction {
  id                     String   @id @default(uuid())
  character_id           String
  amount_bronze          Decimal  // positive = credit, negative = debit
  money_target           String   // mandatory: "bought T2 armor from blacksmith"
  related_item_instance_id String? // FK to ItemInstance, nullable
  created_by             String   // Account.id
  created_at             DateTime @default(now())
}
```

`money_target` is **always required** — reject the transaction if empty.
Currency balance: `Currency.balance_bronze: Decimal` — single normalized value.

---

## ItemTemplate / ItemInstance split

### ItemTemplate (reference catalog, admin-managed, seeded from CSV)

```prisma
model ItemTemplate {
  id                   String   @id @default(uuid())
  name                 String
  slot_type            SlotType // enum: head|body|legs|vambraces|weapon_left|weapon_right|ring|amulet|pet
  weapon_family        String?  // "STR_one_hand" | "DEX_bow" | "plate" | "robes" | …
  is_two_handed        Boolean  @default(false)
  tier                 Int      // 0–5, typically 1–4
  required_attribute   StatKey? // nullable: null = anyone can equip
  damage_dice          String?  // "3D6"
  bonus_crit_dice      String?
  scaling_attribute    StatKey?
  scaling_coefficient  Decimal?
  stat_bonuses         Json?    // typed by StatBonusesSchema
  granted_ability_ids  String[] // FK list → Skill
  hunger_restored      Int?     // food items only
  reference_price      Decimal  // in bronze, informational only
  description          String?
  icon                 String?
  deleted_at           DateTime?
}
```

### ItemInstance (character's actual item)

```prisma
model ItemInstance {
  id           String   @id @default(uuid())
  character_id String
  template_id  String?  // nullable: GM can create items without a template
  overrides    Json?    // typed by ItemOverridesSchema
  acquired_price Decimal?
  location     String   // "equipped:weapon_left" | "equipped:body" | "backpack"
  deleted_at   DateTime?
}
```

---

## Seed strategy

### Source: `Gob_markets.csv`

The CSV contains multiple tabs (weapon families, armor, food, etc.). Seed process:

1. Parse CSV rows into `ItemTemplate` records (see `seed-from-spreadsheet` skill for parsing details).
2. Upsert by `name` — idempotent on re-run.
3. Map CSV columns to Prisma fields using the column-name mappings in `packages/db/seed/csv-mapping.ts`.

### Other seeds

- `Race` — small static list, seed inline as array
- `SkillCategory` — 10 categories, seed inline
- `RuleConfig` — seed default values for all constants; admin can change post-seed via admin UI
- `Faction` — seed with known faction names from the spec; extensible by admin

### Seed order (dependencies)

```
1. RuleConfig
2. Race, SkillCategory, Faction
3. Skill (WildMagicCard included)
4. ItemTemplate  ← depends on Skill for granted_ability_ids
5. Settlement / Market (optional, post-MVP)
```

### Running seeds

```bash
pnpm db:seed          # full seed (idempotent)
pnpm db:seed -- --only item-templates  # if you add incremental flags
```

---

## Migration conventions

- One `prisma migrate dev --name <description>` per logical schema change
- Migration names: `snake_case`, verb first — `add_manual_override_to_hp_max`, `create_currency_transaction`
- Never edit an existing migration file — create a new one
- After adding a nullable column, seed a backfill migration if needed
- Run `pnpm typecheck` after schema changes (Prisma client regenerates types)
