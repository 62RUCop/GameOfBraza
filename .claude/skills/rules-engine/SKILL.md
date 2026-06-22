---
name: rules-engine
description: >
  Reference for ALL game mechanics in GameOfBraza: the two-tier systems
  (attribute_power_tier vs class thresholds), Bubble D100 persistence,
  class bonuses at {6,9,12,20}, hit/damage formula, RuleConfig location,
  and the iron rule that computed values are suggestions not constraints.
  Use this skill whenever touching packages/rules, writing formulas,
  adding validation, or any question about "what does the spec say about X".
  Do NOT derive mechanics from memory — always consult this reference.
---

# GameOfBraza — Rules Engine Reference (§3 TZ.md)

## Iron law: computed ≠ enforced

`suggestedValue` is the server's default calculation.
`value` is what the user actually stored.
These are **different fields**. Never clamp, block, or overwrite `value` based on `suggestedValue`.
HP above max (overheal) is valid. Negative values are valid.
Out-of-range → neutral highlight only ("unusual value"), never an error that prevents saving.

`manual_override = true` on a derived field means: the user pinned this value — do NOT recalculate it when its base stat changes.

All game constants live in **`RuleConfig`** (DB row, editable by admin).
Never hardcode numbers like `4`, `10`, `3` for stat-to-derived ratios — read from `RuleConfig`.
Changing `RuleConfig` only affects future `suggestedValue`; stored `value` fields are never touched automatically.

---

## §3.1 — Stat → derived formulas

| Stat | Derived | Formula |
|------|---------|---------|
| STR | HP_max | `STR × 4 + bonuses` (coefficient from `RuleConfig`) |
| DEX | Hit chance | see §3.4 |
| INT | Ability slots | `Slots = effective_INT` (no base offset) |
| SPI | Mana_max | `SPI × 10 + bonuses` |
| END | AP_max | `END × 10 + bonuses` (AP = action points, physical-skill resource) |
| LUC | Crit threshold | every 2 LUC lowers the required crit roll by 1 |

Bonuses come from equipped items, class bonuses, and active effects — summed on read, NOT stored as a `*_bonus` column on Attributes.

---

## §3.2 — Dice ↔ Tier mapping

| Die | Tier |
|-----|------|
| d4  | 0    |
| d6  | 1    |
| d12 | 2    |
| d20 | 3    |
| d60 | 4    |
| d100 | 5 (not a difficulty tier — used in special mechanics like Bubble) |
| d8, d10 | not on the tier scale (bonus damage, arrow tiers) |

---

## §3.3 — Two separate tier systems (most common source of bugs)

### System A: `attribute_power_tier(value)` — equipment/skill access

```
attribute_power_tier(value):
  if value < 3:  return 0
  else:          return min(4, floor((value − 3) / 3) + 1)
```

| value | 0–2 | 3–5 | 6–8 | 9–11 | 12+ |
|-------|-----|-----|-----|------|-----|
| tier  |  0  |  1  |  2  |   3  |  4  |

Capped at **4** forever (value 255 → still tier 4).
Used for: what equipment tier a character can equip, what skill tier they can learn/use, settlement economy tier.

### System B: Class thresholds `{6, 9, 12, 20}` — class bonus triggers

These are **not derived from** `attribute_power_tier`. They are a separate, fixed sequence:

| Threshold | class_index |
|-----------|-------------|
| 6         | 0           |
| 9         | 1           |
| 12        | 2           |
| 20        | 3           |

Class index is **capped at 3** (index 3 = 4th class, threshold 20). A stat at 255 is still class_index 3.
Thresholds stored in `RuleConfig` as a configurable list (not hardcoded), in case the designer extends the scale.

**These two systems produce similar-looking numbers at low values but diverge — never conflate them.**
`attribute_power_tier(6) = 2` but `class_index(6) = 0`. Different concepts.

---

## §3.4 — Combat: hit and damage

### Hit check
```
success = (dice_roll ≥ max_die_face − 1 − DEX)
```
- Natural max → critical hit
- Natural 1 → critical failure (friendly fire possible)

### Damage
```
normal_damage = floor(scaling_stat × weapon_coefficient) + sum(roll(damage_dice))
crit_damage   = floor(scaling_stat × weapon_coefficient)
              + sum(roll(damage_dice)) × crit_multiplier   // default: ×2 (doubles dice count)
              + sum(roll(bonus_crit_dice))                  // extra dice from item field
```

`weapon_coefficient` and `scaling_attribute` come from the equipped weapon's `ItemTemplate`.
Examples:
- STR one-handed: `0.5 × STR`
- STR two-handed: `1.0 × STR`
- DEX one-handed: `0.25 × DEX`
- DEX two-handed: `0.5 × DEX`

`bonus_crit_dice` is an ItemTemplate field for agility weapons that triple their dice on crit (e.g. "1D4 + 1 crit die" in Gob_markets.csv).

---

## §3.5 — Class bonuses at `{6, 9, 12, 20}`

Each stat has its own effect when a class threshold is crossed:

| Stat | Effect at class_index i | Where result goes |
|------|-------------------------|-------------------|
| STR  | Roll `(i+1)×d6` (1d6 at 6, 2d6 at 9, 3d6 at 12, 4d6 at 20) | Added to HP_max bonus |
| DEX  | Roll `(i+1)×d4` | Added to Dodge flat damage reduction |
| INT  | Draw `2×i + 4` Wild Magic cards blind (4/6/8/10), player picks one to learn | → CharacterSkill |
| END  | Roll **1** die of tier `class_index` (d4/d6/d12/d20) | Added to Universal Armor |
| SPI  | +1 Bubble charge (no roll) | `bubble_charges += 1` |
| LUC  | +1 to crit range (stored separately from the 2-LUC modifier) | `luck_class_crit_bonus += 1` |

**Key**: results of STR/DEX/END rolls are **random and stored once** in `ClassBonusRecord`.
They are NOT recalculated from the stat value. Record the roll, not a formula.

`ClassBonusRecord` fields: `character_id, attribute, class_tier(0–3), roll_dice_formula, rolled_values: JSON[], rolled_sum, resulting_effect, applied_at`.

For INT: link to `WildMagicDraw` instead of rolled values.
For SPI/LUC: `rolled_values` empty, effect is deterministic.

---

## §3.7 — Bubble (Divine Shield analogue)

```
persist_chance = min(100, bubble_charges × 10)   // percent
```

On hit against a character with active Bubble (blocks 100% of that hit's damage):
1. Roll d100.
2. If result = 100 → Bubble drops unconditionally.
3. Else if result > persist_chance → Bubble drops.
4. Else → Bubble persists, `persist_chance -= 10` for next check.

---

## §3.8 — Currency

```
1 gold = 10 silver = 100 bronze
```
Store as a single `decimal` in bronze (prices can be fractional, e.g. 1.2 silver = 120 bronze).
Display (gold/silver/bronze split) is a formatting function, NOT separate DB columns.
Every balance change → `CurrencyTransaction` record with mandatory `money_target` field.

---

## §3.9 — Reputation scale

Range: **−10 to +10** per Faction.

| Range | Label |
|-------|-------|
| −10 | International warrant (kill on sight) |
| −9…−7 | Villain |
| −6…−4 | Known (negatively) |
| −3…+3 | Stranger |
| +4…+6 | Known (positively) |
| +7…+9 | Hero |
| +10 | Legend (absolute support) |

Price multiplier curve is **per item-category**, stored in `RuleConfig` as `{category → [4 values]}`.
Example: ranged weapons `[×1.5, ×1.0, ×0.75, ×0.5]`, most others `[×1.5, ×1.0, ×0.5, ×0.25]`.

---

## Where formulas live

All of the above lives **only** in `packages/rules/`.
- `packages/rules/src/tiers.ts` — `attribute_power_tier`, class threshold lookup
- `packages/rules/src/combat.ts` — hit check, damage formulas
- `packages/rules/src/derived.ts` — HP_max, Mana_max, AP_max, slots
- `packages/rules/src/bubble.ts` — Bubble persist logic
- `packages/rules/src/class-bonus.ts` — class bonus per stat
- `packages/rules/src/currency.ts` — formatting, conversion

`apps/web` and the API import from `packages/rules`. Zero duplication.
`RuleConfig` is the single source for all numeric constants — never hardcode them.

---

## Equipment equip rule (§5.4, changed in round 3)

```
can_equip = (item.required_attribute == null)
         OR (attribute_power_tier(character.effective_value[item.required_attribute]) >= item.tier)
```

- Condition met → equip, full bonuses apply.
- Condition NOT met → **cannot equip**. Item stays in backpack. Previous "soft downgrade by 1 tier" mechanic is **removed**.
- This is a default-flow UX block, not an anti-cheat fortress. GM override is always possible (§1 philosophy).
- Server does NOT need aggressive anti-fraud validation on every request.

Same logic applies to skills: `attribute_power_tier(effective_INT) >= skill.tier` to learn/use.
