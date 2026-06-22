---
name: test-writer
description: >
  Vitest and Playwright conventions for GameOfBraza. Use this skill when
  writing or reviewing any test: unit tests for packages/rules (highest
  priority — every formula boundary must be covered), integration tests for
  the API layer, and E2E tests for critical UI flows. Covers test structure,
  naming, what to assert, and what NOT to mock.
---

# GameOfBraza — Test Writing Conventions

## Priority order

1. **`packages/rules` unit tests** — exhaustive. Formulas are subtle (two tier systems,
   Bubble D100, class bonuses with random rolls, hit formula). Every boundary must have
   a test case. This is the most important test suite in the project.
2. **API integration tests** — RBAC (player can only see their own characters, GM can see all),
   equipment equip logic, currency transaction audit trail.
3. **E2E (Playwright)** — happy path of character creation, stat allocation, equipping an item.

---

## packages/rules — unit test requirements

All tests in `packages/rules/src/__tests__/`.

### attribute_power_tier

Must cover every boundary and at least one value in each range:

```ts
// tiers.test.ts
describe('attribute_power_tier', () => {
  test.each([
    [0,   0], [1,  0], [2,  0],   // below 3
    [3,   1], [4,  1], [5,  1],   // 3–5
    [6,   2], [7,  2], [8,  2],   // 6–8
    [9,   3], [10, 3], [11, 3],   // 9–11
    [12,  4], [20, 4], [255, 4],  // 12+ → capped at 4
  ])('value %i → tier %i', (value, expected) => {
    expect(attribute_power_tier(value)).toBe(expected)
  })
})
```

### Class index lookup

```ts
describe('class_index_for', () => {
  test.each([
    [5,  null],  // below threshold
    [6,  0],
    [8,  0],     // between thresholds, stays at 0
    [9,  1],
    [11, 1],
    [12, 2],
    [19, 2],     // 13–19 stays at class 2
    [20, 3],
    [255, 3],    // cap at 3
  ])('value %i → class_index %s', (value, expected) => {
    expect(class_index_for(value)).toBe(expected)
  })
})
```

**Critical**: 13–19 → class_index 2 (NOT 3). Test this range explicitly.

### Bubble persistence

```ts
describe('bubble_persist_check', () => {
  it('always drops on roll 100', () => {
    expect(bubble_persist_check({ charges: 10, roll: 100 })).toEqual({ persists: false })
  })
  it('persists when roll <= persist_chance', () => {
    // 3 charges → persist_chance = 30
    expect(bubble_persist_check({ charges: 3, roll: 30 })).toEqual({ persists: true, new_persist_chance: 20 })
  })
  it('drops when roll > persist_chance', () => {
    expect(bubble_persist_check({ charges: 3, roll: 31 })).toEqual({ persists: false })
  })
  it('caps persist_chance at 100 for large charge counts', () => {
    // 15 charges → min(100, 150) = 100 → only roll 100 drops it
    expect(bubble_persist_check({ charges: 15, roll: 99 })).toEqual({ persists: true, new_persist_chance: 90 })
    expect(bubble_persist_check({ charges: 15, roll: 100 })).toEqual({ persists: false })
  })
})
```

### Hit check

```ts
describe('hit_check', () => {
  it('succeeds when roll >= max_face - 1 - DEX', () => {
    // d20 (max_face=20), DEX=3: threshold = 20-1-3 = 16
    expect(hit_check({ die_faces: 20, dex: 3, roll: 16 })).toEqual({ success: true, is_crit: false })
    expect(hit_check({ die_faces: 20, dex: 3, roll: 15 })).toEqual({ success: false, is_crit: false })
  })
  it('natural max → critical hit', () => {
    expect(hit_check({ die_faces: 20, dex: 3, roll: 20 })).toEqual({ success: true, is_crit: true })
  })
  it('natural 1 → critical failure', () => {
    expect(hit_check({ die_faces: 20, dex: 3, roll: 1 })).toEqual({ success: false, is_crit_fail: true })
  })
})
```

### Damage formula

```ts
describe('calculate_damage', () => {
  it('normal: floor(stat × coeff) + dice sum', () => {
    expect(calculate_damage({ scaling_stat: 10, coefficient: 0.5, dice_rolls: [3, 4], is_crit: false }))
      .toBe(Math.floor(10 * 0.5) + 7)  // 5 + 7 = 12
  })
  it('crit: multiplies dice, adds bonus_crit_dice', () => {
    // crit_multiplier=2, bonus_crit_dice roll=[2]
    expect(calculate_damage({ scaling_stat: 10, coefficient: 0.5, dice_rolls: [3, 4], is_crit: true, crit_multiplier: 2, bonus_crit_rolls: [2] }))
      .toBe(5 + (3 + 4) * 2 + 2)  // 5 + 14 + 2 = 21
  })
})
```

---

## Test file structure

```
packages/rules/src/__tests__/
  tiers.test.ts          ← attribute_power_tier + class_index_for
  combat.test.ts         ← hit_check + calculate_damage + crit logic
  derived.test.ts        ← hp_max, mana_max, ap_max, slots
  bubble.test.ts         ← bubble_persist_check
  class-bonus.test.ts    ← class bonus per stat, dice formula selection
  currency.test.ts       ← parsePriceToBronze, formatBronze display
  satiety.test.ts        ← satiety range, damage trigger threshold
```

---

## Vitest conventions

```ts
import { describe, it, expect, test } from 'vitest'

// Prefer test.each for boundary tables — readable and exhaustive
test.each([...])('description %i → %i', (input, expected) => {
  expect(fn(input)).toBe(expected)
})

// Group related assertions in describe blocks
describe('class_bonus_dice', () => {
  it('STR class 0 → 1d6 formula', ...)
  it('STR class 3 → 4d6 formula', ...)
})
```

**Do NOT mock `RuleConfig`** in rules unit tests — pass config values as function arguments instead.
Functions in `packages/rules` should accept config as a parameter, not import it globally:

```ts
// Good
export function hp_max(str: number, config: Pick<RuleConfig, 'str_hp_coefficient'>): number {
  return str * config.str_hp_coefficient
}

// Bad — makes tests dependent on DB/config module
export function hp_max(str: number): number {
  return str * getRuleConfig().str_hp_coefficient
}
```

---

## API integration tests

Use a real test database (not mocked). Reason: mocks have missed real migration failures before.

Setup in `apps/web/tests/setup.ts`:
- `beforeAll`: run `prisma migrate deploy` against test DB
- `afterEach`: reset changed rows (use transactions that roll back)

Key scenarios to cover:
- Player A cannot read Player B's character → 403
- GM can read all characters in their campaign
- Equip item where `attribute_power_tier < item.tier` → 422 with `code: 'TIER_TOO_LOW'`
- Currency transaction without `money_target` → 400
- `manual_override = true` field is not recalculated after stat change

---

## Playwright E2E

Tests in `apps/web/tests/e2e/`.

Happy paths to cover (MVP):
1. Create character → point-buy stat allocation → confirm → verify derived values shown
2. Add item to backpack → move to equipment slot (where tier allows) → verify bonuses shown
3. GM edits a character's HP directly → pin icon appears → reset to auto → HP recalculates

```ts
// e2e/character-create.spec.ts
test('point-buy allocates correctly', async ({ page }) => {
  await page.goto('/characters/new')
  // lower STR 3→1 (frees 2 pts), raise DEX 3→5 (costs 1+2=3 pts)
  await page.getByTestId('stat-str').getByRole('button', { name: '-' }).click()
  await page.getByTestId('stat-str').getByRole('button', { name: '-' }).click()
  await page.getByTestId('stat-dex').getByRole('button', { name: '+' }).click()
  await page.getByTestId('stat-dex').getByRole('button', { name: '+' }).click()
  await expect(page.getByTestId('points-remaining')).toHaveText('0')
  await page.getByRole('button', { name: /confirm/i }).click()
  await expect(page.getByTestId('stat-dex-value')).toHaveText('5')
})
```

**Selector convention**: use `data-testid` for game-specific interactive elements, `role` for standard UI controls.

---

## What NOT to test

- Don't test that Prisma returns data (trust the ORM)
- Don't test shadcn/ui component rendering (trust the library)
- Don't write tests that assert `suggestedValue === value` — the whole point is they can differ
- Don't mock `packages/rules` functions in API tests — use real formulas
