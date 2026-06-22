# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GameOfBraza** is a web-first (mobile-friendly) digital character sheet app for a custom tabletop RPG system. The full specification is in [TZ_TRPG_Character_App.md](TZ_TRPG_Character_App.md) (Russian). Key architectural principle: this is a **data storage and support tool, not a strict game engine with anti-cheat** — GM overrides are a first-class feature, not an exception.

Stack: **Flutter** (web priority, PWA/mobile wrapper later). Backend TBD (REST API assumed per spec).

## Flutter Commands

```bash
flutter pub get          # Install dependencies
flutter run -d chrome    # Run web app in Chrome (primary target)
flutter build web        # Build for production
flutter test             # Run all tests
flutter test test/path/to/test_file.dart  # Run single test
flutter analyze          # Lint / static analysis
```

## Domain Model

The spec defines these core entities (backend source of truth):

**Character** — central entity owned by an `Account` (player/gm/admin roles). One player can have multiple characters.

**Attributes** — 6 base stats (STR, DEX, INT, SPI, END, LUC), stored as raw values 0–255. No `*_bonus` fields — all bonuses are computed at read time into `effective_value`. Every computed/derived value has a `manual_override` flag: when set, the value is pinned and won't be recalculated when its base changes.

**Derived values** (computed by backend from config, never hardcoded):
- `HP_max = STR × 4`; `Mana_max = SPI × 10`; `AP_max = END × 10`; `Slots = INT`
- `attribute_power_tier(v)` → 0 if v<3, else `min(4, floor((v−3)/3)+1)` — caps at Tier 4

**Tier system** (fixed 6-level scale 0–5, mapped to dice d4/d6/d12/d20/d60/d100). Equipment/skill tier vs character attribute tier determines equip eligibility: hard block by default (item stays in backpack), GM can override.

**Class bonuses** — triggered at attribute thresholds `{6, 9, 12, 20}` (max class index 3, never grows beyond threshold 20). Results contain random rolls — stored once in `ClassBonusRecord`, not recalculated.

**ItemTemplate** (admin-managed catalog) + **ItemInstance** (per-character, can override template values or exist without a template). Reference price is informational only; actual price stored in `ItemInstance.acquired_price`. All money changes logged to `CurrencyTransaction` with mandatory `money_target` field. Currency stored normalized in bronze (1 gold = 10 silver = 100 bronze).

**Skills** (`CharacterSkill` links to `Skill` catalog): blocked if `attribute_power_tier(INT) < skill.tier`. Skills with `occupies_slot=false` (innate, guild) don't count against `Slots = INT`. Per-character skill categorization stored in `CharacterSkillTag`.

**RuntimeState** — separate table for frequently-changing values: current HP/mana/AP, satiety, bubble status.

## Key Business Rules

- **Point-buy at creation**: all stats start at 3, cost to raise from v: `1 if v<4, else v−2`. Symmetric on lowering.
- **Unallocated points**: GM grants pools; player allocates when they want (no forced timing). Spending into a stat requires explicit player confirmation.
- **Bubble mechanic**: `persist_chance = min(100, bubble_charges × 10)`. On hit: roll d100; if > persist_chance, bubble drops.
- **Satiety**: range `[−HP_max, +(STR+END)]`. On location transition with satiety < 0: take `|satiety|` damage.
- **Pet leveling**: `food_required_next = base_pet_food_unit × 2^(level−1)`, where `base_pet_food_unit` is in `RuleConfig`.
- **Reputation**: scale −10…+10 per faction; price multipliers are per item-category curves (not a global constant), stored in `RuleConfig`.
- **RuleConfig**: all numeric constants (HP per STR, mana per SPI, class thresholds, point costs, reputation curves) live here — editable by admin without a code release.

## UI Structure

Navigation: Character list → Character sheet (tabs: Description · Stats · Equipment · Skills · Backpack · Reputation · Notes) + GM Panel + Admin Panel.

- **Stats tab**: 20-cell ribbon per attribute; values >20 add a second visual layer. Manual-override values show a "pinned" icon with a reset button.
- **Equipment tab**: 9-slot paper doll (head/body/legs/vambraces/weapon_left/weapon_right/ring/amulet/pet). Items above accessible tier show a lock icon with "need N [stat]" tooltip.
- **Skills tab**: grouped by player's personal categories (up to 10, like HoMM spell books). Slot counter shows "X of INT used".
- **Backpack tab**: 6 free-text slots (no overflow validation). Currency block at top with gold/silver/bronze display.
- **Dice widget**: button to roll + manual result edit (supports physical dice use at the table).

## RBAC

- `player`: own characters only; point-buy allocation with confirmation
- `gm`: all characters in campaign, NPC creation, direct stat edits (with optional `gm_skip_confirmation` profile setting), manual value overrides
- `admin`: catalogs (`ItemTemplate`, `Skill`, `Race`, `Faction`, `WildMagicCard`, `SkillCategory`) and `RuleConfig`

## Out of Scope (MVP)

- Real-time multi-device sync at the table
- Inter-character item/currency transfers (handled manually by players)
- Full market simulation (§5.13)
- Native iOS/Android apps (Flutter web + PWA first)
