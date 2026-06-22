# FRONTEND.md — GameOfBraza Frontend Developer Plan

Flutter web character sheet for a custom TRPG system.  
Full domain spec: [TZ_TRPG_Character_App.md](TZ_TRPG_Character_App.md)  
Codebase guide: [CLAUDE.md](CLAUDE.md)

---

## Guiding principle

> Frontend displays what the API returns. It does **not** duplicate game math.  
> All derived values (HP_max, tiers, class bonuses) come from the server.  
> Manual-override state is shown prominently and resettable from every screen where it appears.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Flutter 3.x, target `web` |
| State | Riverpod (providers per domain entity) |
| Routing | go_router (declarative, URL-addressable for web) |
| HTTP | dio + retrofit codegen |
| Serialization | json_serializable / freezed |
| Rich text | flutter_quill |
| Icons | material_symbols_rounded |
| i18n | flutter_localizations, ARB files (UI in Russian for MVP) |
| Testing | flutter_test + mocktail for widget tests |

---

## Project structure

```
lib/
  main.dart
  app.dart                  # MaterialApp + router setup
  core/
    api/                    # dio client, interceptors, retrofit interfaces
    models/                 # freezed data classes (generated)
    providers/              # global Riverpod providers (auth, rule_config)
    theme/                  # AppTheme, colors, typography
    widgets/                # reusable: DiceWidget, OverrideLabel, TierBadge, ...
  features/
    auth/                   # login, session, RBAC
    characters/             # list + create (point-buy screen)
    description/            # Tab: Description
    stats/                  # Tab: Characteristics (attribute ribbon, derived values)
    equipment/              # Tab: Equipment (paperdoll, item cards)
    skills/                 # Tab: Skills (category tabs, slot counter)
    backpack/               # Tab: Backpack + Currency
    reputation/             # Tab: Reputation
    notes/                  # Tab: Notes
    gm_panel/               # GM overlay panel
    admin_panel/            # Admin catalogs + RuleConfig
  l10n/
    app_ru.arb
```

---

## SMART Milestones

Each milestone is **Specific** (named deliverables), **Measurable** (acceptance criteria), **Achievable** (scoped to one concern), **Relevant** (tied to spec §), **Time-bound** (week offset from project start, assuming 1 developer).

---

### M1 — Foundation: project scaffold + auth (Week 1)

**Deliverables**
- `flutter create` web project with the folder structure above
- Riverpod + go_router + dio wired up
- Login screen (email/password) → JWT stored in `localStorage`
- `AuthProvider` exposing `currentUser` with `role: player | gm | admin`
- Route guard: unauthenticated → `/login`
- Empty shell routes for all 7 tabs + GM panel + Admin panel

**Acceptance criteria**
- `flutter run -d chrome` launches; login flow navigates to character list shell
- `flutter analyze` passes with zero errors
- RBAC role is readable in any widget via `ref.watch(authProvider).role`

**Spec refs:** §5.1, §6 (RBAC), §8

---

### M2 — Character list + point-buy creation (Week 2)

**Deliverables**
- `GET /accounts/{id}/characters` → character list screen with avatar + name + race
- Character switcher widget (persistent top bar when >1 character)
- "New character" flow: point-buy screen (§5.3)
  - 6 attribute rows, start at 3 each
  - Live cost counter: `cost(v) = 1 if v<4, else v−2`; balance must stay ≥ 0
  - Confirm button posts `POST /characters`
- `POST /characters` on server creates character; client navigates to Description tab

**Acceptance criteria**
- Cannot confirm if budget is negative (button disabled)
- Budget recalculates instantly on every increment/decrement
- At least one widget test covers the cost formula edge cases (v=3, v=4, v=12)

**Spec refs:** §5.1, §5.2, §5.3

---

### M3 — Description tab (Week 3)

**Deliverables**
- Race picker (dropdown from `GET /races`, not free text)
- Portrait upload → `POST /characters/{id}/images`
- Quenta + main quest fields: flutter_quill rich text editor, auto-save on blur
- Innate ability card: name, description, "next rank" preview (locked behind `quest_progress_stage`)
- Player notes: full-width rich text area, separate save button

**Acceptance criteria**
- Race dropdown shows all entries from the catalog; no free-text fallback
- Uploading an image over the size limit shows an inline error (not a crash)
- Notes field (`player_notes`) is completely separate from `quenta`

**Spec refs:** §5.2, §5.12, §7.1

---

### M4 — Stats tab: attribute ribbon + derived values (Week 4)

**Deliverables**
- Attribute ribbon component: 20-cell row per attribute; values >20 render a second layer with a visually distinct style (different fill/outline)
- Derived values block: HP_max, Mana_max, AP_max, Dodge, Armor, Slots — all read from API
- `OverrideLabel` widget: if `manual_override = true`, show a pin icon + "вернуть авторасчёт" button that calls `PATCH /characters/{id}/stats/{key}/override` with reset payload
- Current HP / Mana / AP / Satiety editable inline (RuntimeState patch on change)

**Acceptance criteria**
- Ribbon renders correctly at value=1, value=20, value=21, value=40 (two layers), value=255 (ten+ layers, scrollable or visually compressed)
- Pinned values show the pin icon on every screen where they appear (Stats tab)
- Reset button calls the correct endpoint and refreshes derived display

**Spec refs:** §3.1, §3.3, §5.3, §5.11, §7.2

---

### M5 — Stats tab: point allocation + class bonus modal (Week 4–5)

**Deliverables**
- "Distribute points" button visible when `unallocated_points > 0`
- Allocation screen: same cost formula as creation (§5.3); diff shows pending changes before confirm; confirm calls `POST /characters/{id}/attributes/allocate`
- Explicit confirmation dialog before applying: "Apply N points to [Stat]?" — cannot skip (player role)
- GM role: direct stat edit without point-buy restriction; respects `gm_skip_confirmation` setting (skip dialog if enabled)
- Class bonus modal: triggered when a new class threshold is reached (`{6, 9, 12, 20}`)
  - STR/DEX/END: show dice formula, roll button, display result → save to `ClassBonusRecord`
  - INT: show wild magic card draw (`2×class_index+4` cards), player picks one → save
  - SPI/LUC: deterministic, just confirm the `+1` effect
  - Modal cannot be dismissed without completing the action

**Acceptance criteria**
- Player cannot edit stats without going through the allocation + confirm flow
- GM with `gm_skip_confirmation = true` sees no confirmation dialogs
- Class bonus modal shows the correct dice formula for each attribute per §3.5 table
- INT class modal presents exactly `2×class_index+4` card options

**Spec refs:** §3.5, §5.3, §5.10, §7.2

---

### M6 — Equipment tab: paperdoll + item cards (Week 5–6)

**Deliverables**
- 9-slot paperdoll layout: `head, body, legs, vambraces, weapon_left, weapon_right, ring, amulet, pet`; visual silhouette with slot zones
- Item catalog browser: `GET /item-templates?slot=&tier=&weapon_family=` with filters
- Equip flow: `POST /characters/{id}/equipment/{slot}` — if item tier > `attribute_power_tier(required_attribute)`, show lock icon + tooltip "нужно N очков [Характеристика]"; button is disabled (not hidden)
- Item card: name, tier badge, stat bonuses JSON rendered as key-value list, granted abilities listed, `acquired_price` vs `reference_price` displayed separately
- `ItemInstance` overrides shown with a visual diff from template values
- GM mode: "Добавить предмет вручную" button → form without template_id

**Acceptance criteria**
- Items above accessible tier show lock tooltip and cannot be equipped via normal UI
- Two-handed weapon equipping occupies both weapon slots simultaneously
- `stat_bonuses` JSON renders all known keys (hp, dodge, armor, bubble_chance_pct); unknown keys render as `key: value` (graceful unknown-field handling)
- Item with `granted_ability_ids` shows ability names, not raw UUIDs

**Spec refs:** §3.3, §5.4, §7.3

---

### M7 — Equipment tab: pet card + feed flow (Week 6)

**Deliverables**
- Pet sub-card inside the pet slot: name, species, level, `food_progress / food_required_next` progress bar
- "Покормить" button: opens dialog with hunger_points input → `POST /characters/{id}/pet/feed`
- On level-up response: animate progress bar reset + increment level display
- Pet stat bonuses and ability shown on card

**Acceptance criteria**
- `food_required_next` formula (`base_pet_food_unit × 2^(level−1)`) is NOT computed on frontend — value comes from API; frontend only displays it
- Level-up animation plays when response `level` is higher than the previous value

**Spec refs:** §3.6, §5.9, §7.3

---

### M8 — Skills tab (Week 7)

**Deliverables**
- Up to 10 personal skill categories, rendered as horizontal tab bar (HoMM spellbook style); `GET /skill-categories`, `PATCH /characters/{id}/skills/{id}/category`
- Each category: vertical list of skill cards with name, tier badge, mana/AP cost
- Blocked skill: grayed card + lock icon when `attribute_power_tier(INT) < skill.tier`
- `occupies_slot = false` skills: badge "не занимает ячейку"
- Slot counter header: "Занято X из INT" — X = count of equipped skills where `occupies_slot = true`
- Add skill from catalog: search/filter + blocked state shown before selection

**Acceptance criteria**
- Slot counter matches `count(skills where occupies_slot=true)`; innate/guild skills do not increment it
- Blocked skills are visible but cannot be activated; tooltip explains requirement
- Category assignment is per-character (same skill can sit in different categories for different characters)

**Spec refs:** §3.3, §5.5, §7.4

---

### M9 — Backpack tab + Currency block (Week 7)

**Deliverables**
- Currency block (top of tab): gold / silver / bronze display, computed from `balance_bronze` using `1g=10s=100b` conversion
- "Изменить баланс" dialog: amount input + mandatory `money_target` text field → `POST /characters/{id}/currency/transaction`; submit disabled while `money_target` is empty
- 6 manual backpack slots: each shows name, type enum selector, quantity, description; `POST /characters/{id}/backpack/{slot_index}` on save
- If all 6 slots are filled: no overflow warning, but adding a 7th requires clearing one first (UI enforces max 6 rows, not server)

**Acceptance criteria**
- Balance displays in 3 denominations; 150 bronze → "1 сер. 50 бр."
- `money_target` field is required — empty submission is blocked client-side
- Backpack slot types match the enum: `food, scroll, herb, potion, misc, quest, other`

**Spec refs:** §3.8, §5.6, §5.7, §7.5

---

### M10 — Reputation tab (Week 8)

**Deliverables**
- List of factions with current `value` on a −10…+10 scale
- Segmented bar or slider showing current position; range label from §3.9 table shown as chip
- Price multiplier badge per faction (read from `RuleConfig` category curves; category selector if API exposes it)
- GM only: inline value editor → `PATCH /characters/{id}/reputation/{faction_id}`

**Acceptance criteria**
- Range labels match §3.9 exactly (7 ranges, including asymmetric names)
- Price multiplier shows the correct tier for the current reputation value
- Player cannot edit reputation values (edit controls hidden for player role)

**Spec refs:** §3.9, §5.8, §7.6

---

### M11 — Notes tab (Week 8)

**Deliverables**
- Full-screen flutter_quill editor bound to `player_notes` field
- Auto-save on 2-second debounce after last keystroke + manual "Сохранить" button
- Save indicator: "сохранено" / "сохраняется..." / "ошибка сохранения" status chip

**Acceptance criteria**
- Content persists across page refresh (read on mount from API)
- Rich text formatting (bold, italic, lists) works

**Spec refs:** §5.2, §5.12, §7.7

---

### M12 — Dice widget (Week 8–9)

**Deliverables**
- Persistent `DiceWidget` (FAB or bottom sheet): face selector (d4, d6, d8, d10, d12, d20, d60, d100); tap "Бросить" → calls `POST /dice/roll`
- Result is shown in an editable field: user can replace the API-generated value with a physical dice result
- Quick roll shortcut on Stats tab: auto-fills hit/damage formula from equipped weapon and DEX/STR per §3.4 (reads weapon data from equipped state, constructs the roll request)

**Acceptance criteria**
- Result field is always editable regardless of how the roll was initiated
- Quick roll uses `scaling_attribute_value × weapon_coefficient` from current equipped weapon; it does NOT compute this on the client beyond constructing the API request parameters

**Spec refs:** §3.4, §7.8

---

### M13 — GM Panel (Week 9–10)

**Deliverables**
- GM navigation entry (role-gated): opens side panel / overlay
- Party summary view: all characters in the campaign, each showing current HP / Mana / AP bars
- NPC creation: same form as player character creation but with `is_npc: true` flag
- Direct stat editor: any stat / derived value on any character, bypasses point-buy; confirmation dialog by default
- `gm_skip_confirmation` toggle in GM profile settings: when on, edits apply immediately with no modal
- Manual override via the stat editor: sets `manual_override = true`; pin icon appears everywhere that stat is shown

**Acceptance criteria**
- Party view polls or refreshes RuntimeState; HP bars reflect live values
- `gm_skip_confirmation` state is stored server-side in GM's profile; toggling it persists across sessions
- GM can set any stat to any value in [0, 255]; no client-side min/max blocking

**Spec refs:** §5.1, §5.11, §6, §7.9

---

### M14 — Admin Panel (Week 10)

**Deliverables**
- Catalog manager tables for: `ItemTemplate`, `Skill`, `Race`, `Faction`, `WildMagicCard`, `SkillCategory`
- Each table: list view + create/edit form + soft-delete (no hard delete)
- `RuleConfig` editor: key-value table for all numeric constants; category reputation curve editor (4 values per category as per §3.9); save calls `PATCH /rule-config`

**Acceptance criteria**
- Adding a new `Race` appears in the character creation dropdown without a code release
- `RuleConfig` changes are reflected in subsequent API-computed values (no client-side caching of rule values beyond session)

**Spec refs:** §1, §5.1, §5.9

---

### M15 — PWA + offline resilience (Week 11)

**Deliverables**
- `flutter build web` produces a PWA-ready artifact: `manifest.json`, service worker (via `flutter_service_worker`)
- Static assets (fonts, icons, catalogs) cached for offline read
- Write operations (stat edits, dice rolls) queue locally and retry on reconnect using a simple pending-actions queue
- "Нет соединения" banner shown when offline; queued writes shown as "ожидает синхронизации"

**Acceptance criteria**
- App loads and character sheet is readable with network disabled (after first load)
- Queued writes do not duplicate on reconnect
- `flutter build web --release` produces zero analyzer warnings

**Spec refs:** §6 (offline/sync), §8

---

### M16 — QA + localization finalization (Week 12)

**Deliverables**
- All UI strings moved to `app_ru.arb`; no hardcoded Russian strings in widget code
- Widget test coverage for: cost formula (M2), ribbon edge cases (M4), slot counter (M8), currency conversion (M9)
- Manual test pass on Chrome (desktop) + Chrome mobile emulation for all 7 tabs
- Lighthouse PWA score ≥ 90

**Acceptance criteria**
- `flutter test` runs with zero failures
- No UI string is outside `l10n/app_ru.arb`
- Character sheet tab bar is usable on a 375px wide viewport without horizontal scroll

**Spec refs:** §7.9, §8

---

## Cross-cutting rules for every screen

1. **`manual_override` display** — whenever a derived value is shown, check the override flag in the API response. If `true`, render the `OverrideLabel` widget (pin icon + reset button). Never show a plain number without this check.

2. **Role gates** — use `ref.watch(authProvider).role` before rendering edit controls. Pattern: `if (role == Role.gm || role == Role.admin) ...`. Players see read-only views of GM-only fields.

3. **No client-side game math** — tier checks, slot counts, currency conversion formatting, and reputation label lookups are the only calculations permitted on the client. Everything else (HP_max, attribute_power_tier, class bonus results) is API data.

4. **Tier badge component** — `TierBadge(tier: int)` renders a consistent chip (d4/d6/d12/d20/d60/d100 label). Reuse everywhere: item cards, skill cards, equipment slot tooltips.

5. **Error handling** — API errors surface as `SnackBar` with the server message. Never swallow errors silently. 4xx validation errors show inline under the relevant field when a field path is identifiable.

6. **Loading states** — all async data uses `AsyncValue` from Riverpod; show `CircularProgressIndicator` on loading, error widget on error, data widget on data. No blank screens.

---

## API mock strategy (before backend is ready)

Create `lib/core/api/mock_client.dart` implementing the same retrofit interfaces. Seed with enough data to exercise all 7 tabs:
- 2 characters (one player, one NPC)
- 3 item templates per slot type
- 5 skills across 3 categories
- 2 factions with reputation −5 and +7
- RuntimeState with current HP < HP_max

Switch between real and mock client via a Riverpod override in `main.dart` based on a `--dart-define=MOCK=true` flag.
