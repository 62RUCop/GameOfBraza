---
name: seed-from-spreadsheet
description: >
  How to parse Gob_markets.csv tabs and the client's item/skill spreadsheets
  into ItemTemplate and Skill seed records for GameOfBraza.
  Use this skill when writing or updating seed scripts that read the CSV,
  when mapping new spreadsheet columns to Prisma fields, or when the client
  sends a new export with additional item categories (rings, amulets, etc.).
---

# GameOfBraza — Seed from Spreadsheet

## Source file

`packages/db/seed/data/Gob_markets.csv` — multi-tab export from the client's Google Sheet.
Known tabs (as of TZ v0.4):
- Strength weapons (one-handed and two-handed)
- DEX weapons (bows, crossbows, etc.)
- Staves / bells / mantles / robes (caster gear)
- Plate armor
- Leather armor
- Food / consumables
- *(Rings and amulets not yet exported — no numeric stats, only granted abilities)*

## CSV structure conventions

Each tab has:
- A header row (row 1) with column names — **never assume column order, always read by name**
- Data rows with item definitions
- Possibly empty rows between sections — skip rows where `name` is blank
- Price columns in mixed denominations (e.g. "1.2 silver") — convert to bronze on import

## Column → Prisma field mapping

Keep the canonical mapping in `packages/db/seed/csv-mapping.ts`:

```ts
// Partial example — extend as new tabs are parsed
export const ITEM_TEMPLATE_COLUMN_MAP = {
  'Название': 'name',
  'Слот': 'slot_type',         // map to SlotType enum
  'Тир': 'tier',               // parse as int
  'Семейство': 'weapon_family',
  'Двуручное': 'is_two_handed', // "да"/"нет" or boolean-like
  'Требуемая хар.': 'required_attribute', // nullable, map to StatKey enum
  'Кубы урона': 'damage_dice', // "3D6" string, pass through
  'Куб крита': 'bonus_crit_dice', // e.g. "1D4"
  'Масштаб. хар.': 'scaling_attribute', // nullable
  'Коэфф. масштаба': 'scaling_coefficient', // decimal string
  'Бонус HP': 'stat_bonuses.hp',
  'Бонус уворота': 'stat_bonuses.dodge',
  'Бонус брони': 'stat_bonuses.armor',
  'Шанс бабла, %': 'stat_bonuses.bubble_chance_pct',
  'Восст. голода': 'hunger_restored', // nullable int
  'Цена (справ.)': 'reference_price', // convert to bronze
  'Описание': 'description',
} as const
```

## Parsing pipeline

```ts
// packages/db/seed/parse-csv.ts
import { parse } from 'csv-parse/sync'
import { ITEM_TEMPLATE_COLUMN_MAP } from './csv-mapping'

export function parseItemTemplates(csvContent: string): RawItemRow[] {
  const records = parse(csvContent, {
    columns: true,        // use header row as keys
    skip_empty_lines: true,
    trim: true,
  })
  return records.filter(r => r['Название']?.trim())  // skip blank rows
}
```

## Price parsing

Prices appear in formats like: `"15"`, `"1.2 silver"`, `"0.5 gold"`, `"120"`.

```ts
export function parsePriceToBronze(raw: string): Decimal {
  const s = raw.trim().toLowerCase()
  if (s.includes('gold'))   return new Decimal(parseFloat(s)).mul(100)
  if (s.includes('silver')) return new Decimal(parseFloat(s)).mul(10)
  return new Decimal(parseFloat(s))  // already in bronze or unitless
}
```

## stat_bonuses JSONB assembly

Collect all `stat_bonuses.*` columns into one object, omitting undefined/zero:

```ts
function buildStatBonuses(row: RawItemRow): StatBonuses | null {
  const b: StatBonuses = {}
  if (row['Бонус HP'])        b.hp = parseInt(row['Бонус HP'])
  if (row['Бонус уворота'])   b.dodge = parseInt(row['Бонус уворота'])
  if (row['Бонус брони'])     b.armor = parseInt(row['Бонус брони'])
  if (row['Шанс бабла, %'])   b.bubble_chance_pct = parseInt(row['Шанс бабла, %'])
  return Object.keys(b).length > 0 ? b : null
}
```

Always validate the assembled object through `StatBonusesSchema.parse(b)` before inserting.

## weapon_family values

Normalize to a consistent enum-like string set:
```
STR_one_hand | STR_two_hand | DEX_one_hand | DEX_bow | DEX_crossbow
staff | bell | mantle | robe | plate | leather | food | misc
```
Map CSV values case-insensitively; log a warning and skip if unknown.

## Upsert pattern (idempotent seed)

```ts
await prisma.itemTemplate.upsert({
  where: { name: row.name },   // name is the natural key from the spreadsheet
  create: row,
  update: row,
})
```

If the client changes a name between exports, the old template stays (soft-delete manually if needed).

## Skill templates from spreadsheet

If the client exports a Skills tab, the mapping is similar:

```ts
export const SKILL_COLUMN_MAP = {
  'Название': 'name',
  'Описание': 'description',
  'Тир': 'tier',
  'Тип': 'skill_type',           // "innate" | "acquired"
  'Занимает ячейку': 'occupies_slot',
  'Мана': 'mana_cost',
  'ОД': 'ap_cost',
  'Привязанная хар.': 'tied_attribute',
  'Гильдия': 'guild_id',         // resolve FK by guild name
} as const
```

WildMagicCard tab → `wildMagicCard.upsert({ where: { name } })` similarly.

## Running an incremental import

When the client sends a new export with extra tabs:
1. Add a new column map entry in `csv-mapping.ts`.
2. Add a new parsing function in `parse-csv.ts` or extend the existing one.
3. Run `pnpm db:seed` — upsert is idempotent.
4. Check the console output for "unknown weapon_family" warnings and add mappings if needed.
