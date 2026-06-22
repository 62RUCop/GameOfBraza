# BACKEND.md — GameOfBraza Backend Developer Plan

REST API for the custom TRPG character sheet system.  
Full domain spec: [TZ_TRPG_Character_App.md](TZ_TRPG_Character_App.md)  
Codebase guide: [CLAUDE.md](CLAUDE.md)

---

## Guiding principle

> Backend is the single source of truth for all game math. It computes derived values (HP_max, attribute_power_tier, class bonuses, bubble persist chance) from RuleConfig on every relevant write — except when `manual_override = true`, in which case the stored value is returned verbatim without recalculation.  
> This is a **data storage and support tool, not an anti-cheat engine**. Tier enforcement is default-flow behaviour, not adversarial validation. GM overrides are a first-class feature.

---

## Stack

| Concern | Choice |
|---|---|
| Language | Python 3.12 |
| Framework | FastAPI (async) |
| ORM | SQLAlchemy 2.x (async engine) |
| Migrations | Alembic |
| Database | PostgreSQL 16 |
| Auth | python-jose (JWT RS256) + passlib (bcrypt) |
| Serialization | Pydantic v2 |
| File storage | S3-compatible (MinIO local dev / AWS S3 prod) |
| Testing | pytest + pytest-asyncio + httpx (async test client) |
| Containerization | Docker + docker-compose (local dev) |

---

## Project structure

```
app/
  main.py                    # FastAPI app factory, router registration
  config.py                  # Settings (pydantic-settings, env-based)
  database.py                # Async engine, session factory, Base
  core/
    auth.py                  # JWT encode/decode, get_current_user, role guards
    compute.py               # attribute_power_tier, derived value recalc, tier dice map
    rule_config.py           # In-memory RuleConfig cache (invalidated on PATCH)
    s3.py                    # S3 client wrapper
  models/                    # SQLAlchemy ORM table definitions
    account.py
    character.py             # Character + Attributes + RuntimeState
    items.py                 # ItemTemplate + ItemInstance
    skills.py                # Skill + CharacterSkill + CharacterSkillTag
    backpack.py
    currency.py              # Currency + CurrencyTransaction
    reputation.py
    pet.py
    campaign.py
    class_bonus.py           # ClassBonusRecord + WildMagicDraw
    audit.py
    rule_config_model.py
    catalogs.py              # Race, Faction, WildMagicCard, SkillCategory
  schemas/                   # Pydantic request/response models (one file per domain)
  routers/                   # FastAPI APIRouter, one file per domain
    auth.py
    characters.py
    attributes.py
    equipment.py
    skills.py
    backpack.py
    currency.py
    reputation.py
    pet.py
    class_bonus.py
    dice.py
    images.py
    campaigns.py
    admin.py
  services/                  # Business logic, no HTTP concerns
    character_service.py
    equipment_service.py
    skill_service.py
    class_bonus_service.py
    currency_service.py
    pet_service.py
    runtime_service.py
    audit_service.py
  migrations/                # Alembic env.py + version files
  scripts/
    seed.py                  # Dev seed data
```

---

## SMART Milestones

Each milestone is **Specific** (named deliverables), **Measurable** (acceptance criteria), **Achievable** (scoped to one concern), **Relevant** (tied to spec §), **Time-bound** (week offset from project start, assuming 1 developer).

---

### B1 — Foundation: project scaffold + auth (Week 1)

**Deliverables**
- FastAPI app factory in `app/main.py` with health endpoint `GET /health`
- `docker-compose.yml`: `api` + `postgres` + `minio` services; `alembic upgrade head` runs on startup
- Pydantic-settings `Config` loading from `.env` (DATABASE_URL, SECRET_KEY, S3_*)
- `Account` model + migration: `id (UUID)`, `email`, `hashed_password`, `role (enum: player, gm, admin)`, `gm_skip_confirmation (bool, default false)`, `created_at`
- `POST /auth/login` → `{ access_token, refresh_token }` (JWT RS256, 15-min/7-day TTL)
- `POST /auth/refresh` → new access token
- `GET /auth/me` → current account
- `PATCH /accounts/{id}/profile` → `gm_skip_confirmation` toggle (own profile only)
- `get_current_user` dependency + `require_role(*roles)` guard used on all protected routes

**Acceptance criteria**
- `docker-compose up` starts with zero errors; `GET /health` returns `{"status": "ok"}`
- Login with wrong password → 401; login with correct credentials → valid JWT pair
- `GET /auth/me` with expired token → 401
- `PATCH /accounts/{id}/profile` for a different account → 403
- `pytest tests/test_auth.py` passes (login, refresh, me, profile update, role guard)

**Spec refs:** §5.1, §6, §8

---

### B2 — Core domain models + migrations (Week 2)

**Deliverables**
- Alembic migrations for all core tables (created here, populated in B3+):
  - `character`: `id, owner_id (FK Account), name, race_id (FK Race), is_npc, campaign_id (nullable), appearance_image_url, quenta (text), main_quest (text), quest_progress_stage (int), player_notes (text), unallocated_points (int default 0), created_at, deleted_at`
  - `character_attributes`: `character_id (FK 1:1)`, `strength, dexterity, intelligence, spirit, endurance, luck` (all `smallint default 3`)
  - `derived_value`: `character_id, key (enum: hp_max|mana_max|ap_max|dodge|armor|slots|bubble_charges|luck_class_crit_bonus)`, `computed_value`, `override_value (nullable)`, `manual_override (bool)`, `override_author (FK Account nullable)`, `override_at (nullable)`
  - `runtime_state`: `character_id (1:1)`, `current_hp, current_mana, current_ap, satiety_current (int)`, `bubble_active (bool)`, `bubble_persist_chance_current (int)`, `active_effects (JSONB)`, `updated_at`
  - `race`: `id, name, description, icon_url, deleted_at`
  - `rule_config`: `key (string PK)`, `value (JSONB)`, `updated_at`, `updated_by (FK Account)`
- Admin CRUD: `GET /admin/races`, `POST /admin/races`, `PATCH /admin/races/{id}`, `DELETE /admin/races/{id}` (soft-delete, admin only)
- `GET /rule-config` (all roles); `PATCH /rule-config` (admin only, bulk key-value update)
- In-memory RuleConfig cache in `core/rule_config.py`; invalidated on every `PATCH /rule-config`

**Acceptance criteria**
- `alembic upgrade head` runs idempotently from a clean DB
- `alembic downgrade -1` + `alembic upgrade head` round-trips without data loss on empty tables
- `GET /rule-config` returns seed values for `hp_per_str`, `mana_per_spi`, `ap_per_end`, `class_thresholds`, `base_pet_food_unit`, `reputation_price_curves`, `point_buy_base_points`
- `DELETE /admin/races/{id}` sets `deleted_at`; subsequent `GET /admin/races` omits it
- `pytest tests/test_models.py` passes (ORM round-trip for all tables in this milestone)

**Spec refs:** §3.8, §5.1, §5.2, §5.11

---

### B3 — Character creation + point-buy (Week 2–3)

**Deliverables**
- `GET /accounts/{id}/characters` — list own characters (player) or campaign characters (gm); `?is_npc=` filter
- `POST /characters` — create character:
  - Player payload: `{ name, race_id, attributes: { strength, dexterity, intelligence, spirit, endurance, luck } }`; server validates zero-sum budget: `Σ cost(v − 3)` must equal 0, using `cost(v) = 1 if v < 4 else v − 2`; budget deviation → 422
  - GM payload: same plus `is_npc: true` flag; no budget validation
  - On success: creates `character_attributes`, populates `derived_value` rows, creates empty `runtime_state`
- `GET /characters/{id}` — full character read: description fields + `derived_values` block (all keys with `manual_override` flags) + `runtime_state` + `unallocated_points`
- `PATCH /characters/{id}/description` — update `name, race_id, quenta, main_quest, quest_progress_stage, player_notes, appearance_image_url`
- `POST /characters/{id}/attributes/allocate` — spend unallocated points:
  - Payload: `{ attribute: "strength", delta: 2, confirmed: bool }`
  - `confirmed: false` → dry-run: return `{ cost, new_value, remaining_points }`; no DB write
  - `confirmed: true` → validate `cost(delta) ≤ unallocated_points`, write attribute, decrement `unallocated_points`, call `recompute_derived_values`, write audit log
  - Player cannot pass negative `delta` (only GM can lower attributes)
- `POST /characters/{id}/attributes/grant-points` (GM only) — `{ points: int }` → increments `unallocated_points`; writes audit log

**Acceptance criteria**
- `POST /characters` with budget mismatch (e.g. all stats at 3 but STR=5 without balancing) → 422 with `"Point-buy budget must be zero-sum"`
- Valid point-buy payload → character created with `derived_values.hp_max.computed_value = strength × hp_per_str`
- `POST .../allocate { confirmed: false }` → 200 with preview; attribute unchanged in DB
- `POST .../allocate` with `delta` exceeding unallocated balance → 422
- Player calling `POST .../allocate` with negative `delta` → 403
- GM creating NPC with `is_npc: true` → no budget validation applied
- `pytest tests/test_characters.py` covers all above

**Spec refs:** §5.1, §5.2, §5.3, §6

---

### B4 — Derived value computation engine + manual_override (Week 3)

**Deliverables**
- `core/compute.py` — pure functions, no DB calls:
  - `attribute_power_tier(value: int) → int` — `0` if value < 3; else `min(4, floor((value−3)/3)+1)`
  - `hp_max(str_value, hp_class_bonus, rule_config) → int` — `str_value × rule_config["hp_per_str"] + hp_class_bonus`
  - `mana_max(spi_value, mana_class_bonus, rule_config) → int`
  - `ap_max(end_value, ap_class_bonus, rule_config) → int`
  - `slots(int_value: int) → int` — `int_value` (no base offset)
  - `satiety_bounds(str, end, hp_max) → (min: int, max: int)` — `(−hp_max, str+end)`
  - `bubble_persist_chance(charges: int) → int` — `min(100, charges × 10)`
  - `class_threshold_index(attr_value, thresholds: list[int]) → int` — highest crossed index, −1 if none
  - `tier_to_dice(tier: int) → str` — `{0:"d4", 1:"d6", 2:"d12", 3:"d20", 4:"d60", 5:"d100"}`
- `services/character_service.py` — `recompute_derived_values(character_id, session)`:
  - Reads current attributes + all `ClassBonusRecord` totals + equipped item `stat_bonuses`
  - For each derived key: if `manual_override = false`, writes new `computed_value`; if `manual_override = true`, leaves unchanged
  - Called after: attribute allocation, equipment change, class bonus applied, `manual_override` reset
- `PATCH /characters/{id}/stats/{key}/override` (GM only):
  - `{ value: int }` → sets `override_value`, `manual_override = true`, `override_author`, `override_at`; does NOT trigger recompute for this key; writes audit log
  - `{ reset: true }` → clears `override_value`, sets `manual_override = false`; triggers `recompute_derived_values`; writes audit log
- `PATCH /characters/{id}/runtime` — update any subset of `current_hp, current_mana, current_ap, satiety_current, bubble_active, bubble_persist_chance_current`; clamps HP to `[0, hp_max]` and satiety to `[satiety_min, satiety_max]`

**Acceptance criteria**
- `attribute_power_tier` unit tests: `(0)→0, (2)→0, (3)→1, (5)→1, (6)→2, (8)→2, (9)→3, (11)→3, (12)→4, (255)→4`
- After allocating STR 3→5, `derived_values.hp_max.computed_value` increases by `2 × hp_per_str`
- After `PATCH .../override { value: 100 }` on `hp_max`, subsequent STR change does NOT update `hp_max`
- After `PATCH .../override { reset: true }`, `hp_max` recomputed from current STR
- `PATCH .../runtime { satiety_current: -9999 }` → clamped to `satiety_min`, not rejected with 422
- `pytest tests/test_compute.py` covers all formula edge cases including tier boundary values

**Spec refs:** §3.1, §3.3, §5.3, §5.11

---

### B5 — Class bonus system (Week 4)

**Deliverables**
- `class_bonus_record` table: `id, character_id, attribute (enum: str/dex/int/spi/end/luc), class_index (0–3), dice_formula, rolled_values (JSONB[]), rolled_sum, resulting_effect (JSONB), applied_at, wild_magic_draw_id (FK nullable)`
- `wild_magic_draw` table: `id, character_id, drawn_card_ids (JSONB[FK]), chosen_card_id (FK WildMagicCard nullable), drawn_at`
- `wild_magic_card` catalog table: `id, name, description, effect_json, deleted_at` (admin-managed, full CRUD in B13)
- `POST /characters/{id}/class-bonus/{attribute}/roll`:
  - Validates `class_index` is the next unclaimed index for that attribute; cannot skip or replay → 409 if violated
  - **STR**: server rolls `(class_index+1)` × D6; saves `ClassBonusRecord`; `resulting_effect = { "hp_bonus": rolled_sum }`; triggers `recompute_derived_values`
  - **DEX**: server rolls `(class_index+1)` × D4; `resulting_effect = { "dodge_bonus": rolled_sum }`; triggers recompute
  - **INT**: draws `2 × class_index + 4` random `WildMagicCard` IDs (no duplicates within a draw); saves `WildMagicDraw` with `chosen_card_id = null`; returns drawn cards; awaits client choice
  - **END**: server rolls 1 die of type `tier_to_dice(class_index)` (d4/d6/d12/d20 for index 0/1/2/3); `resulting_effect = { "armor_bonus": rolled_value }`; triggers recompute
  - **SPI**: deterministic; `resulting_effect = { "bubble_charges": 1 }`; `bubble_charges += 1`; triggers recompute
  - **LUC**: deterministic; `resulting_effect = { "luck_class_crit_bonus": 1 }`; triggers recompute
- `POST /characters/{id}/class-bonus/int/choose` — `{ draw_id, chosen_card_id }`: validates `chosen_card_id` is in the draw; creates `CharacterSkill` for the card's associated skill; sets `WildMagicDraw.chosen_card_id`; writes `ClassBonusRecord`
- `GET /characters/{id}/class-bonus` — list all records

**Acceptance criteria**
- Claiming class bonus at index 1 without index 0 recorded → 409
- Replaying same attribute + index → 409
- STR class_index=2 roll → `dice_formula = "3D6"`, `rolled_values` has exactly 3 ints, `rolled_sum = Σ rolled_values`
- INT draw at class_index=0 → returns exactly 4 card objects, no duplicate IDs
- `POST .../int/choose` with `chosen_card_id` not in the draw → 422
- After SPI bonus → `derived_values.bubble_charges.computed_value` incremented by 1
- `pytest tests/test_class_bonus.py`

**Spec refs:** §3.5, §5.10

---

### B6 — ItemTemplate catalog (Week 4–5)

**Deliverables**
- `item_template` table: `id, name, slot_type (enum: head/body/legs/vambraces/weapon_left/weapon_right/ring/amulet/pet), weapon_family, is_two_handed (bool), tier (0–5), required_attribute (enum nullable), damage_dice (string nullable), bonus_crit_dice (string nullable), scaling_attribute (enum nullable), scaling_coefficient (decimal nullable), stat_bonuses (JSONB nullable), granted_ability_ids (JSONB[] nullable), hunger_restored (int nullable), reference_price (decimal), description, icon_url, deleted_at`
- Admin CRUD:
  - `POST /admin/item-templates` (admin only) — validates `granted_ability_ids` exist in `skill` table
  - `PATCH /admin/item-templates/{id}` (admin only)
  - `DELETE /admin/item-templates/{id}` (admin only, soft-delete)
- Public read: `GET /item-templates?slot=&tier=&weapon_family=&search=` (all authenticated roles; excludes soft-deleted)
- `stat_bonuses` stored as free JSONB; no schema enforcement on keys (supports unknown future keys, graceful)

**Acceptance criteria**
- `POST /admin/item-templates` with `granted_ability_ids` containing non-existent skill → 422
- `DELETE /admin/item-templates/{id}` → sets `deleted_at`; subsequent `GET /item-templates` omits it
- `GET /item-templates?slot=weapon_left&tier=2` → returns only items matching both filters
- `stat_bonuses: { "shield_block_pct": 15 }` (unknown key) → stored and returned verbatim, no 422
- Player calling `POST /admin/item-templates` → 403
- `pytest tests/test_item_templates.py`

**Spec refs:** §5.4, §6

---

### B7 — ItemInstance + equipment slot management (Week 5–6)

**Deliverables**
- `item_instance` table: `id, character_id, template_id (FK nullable), overrides (JSONB nullable), acquired_price (decimal nullable), location (string: "backpack" or "equipped:{slot}"), created_at`
- `POST /characters/{id}/items` — create ItemInstance:
  - From template: `{ template_id, overrides?, acquired_price? }`
  - Template-free (GM only): `{ name, slot_type, tier, stat_bonuses?, acquired_price? }` without `template_id` → stored as ItemInstance with `template_id = null` and overrides holding all fields
- `PATCH /characters/{id}/items/{item_id}` — update `overrides` or `acquired_price`
- `GET /characters/{id}/items?location=` — list all character items with optional location filter
- `POST /characters/{id}/equipment/{slot}` — equip item:
  - Validates `item_instance.character_id` matches path `character_id`
  - Resolves effective item values: `template fields` merged with `overrides`
  - Tier check: if `required_attribute != null` AND `attribute_power_tier(effective_value[required_attribute]) < item.tier` → 422 `"Item tier exceeds your attribute tier"` (default-flow block; GM bypasses via direct item write or override endpoint)
  - Two-handed weapon (`is_two_handed = true`): sets `location = equipped:weapon_left` AND `equipped:weapon_right`; any item currently in either slot moves to `backpack`
  - Updates `item_instance.location`; triggers `recompute_derived_values`
- `DELETE /characters/{id}/equipment/{slot}` — unequip: sets `location = backpack`; triggers recompute

**Acceptance criteria**
- Player equipping item where `tier > attribute_power_tier(required_attribute)` → 422
- Two-handed weapon equip with both weapon slots occupied → both previous items moved to backpack; new item in both slots
- GM creates template-free item → `template_id = null`; item returned via `GET .../items`
- After equipping item with `stat_bonuses: { "hp": 6 }`, `derived_values.hp_max.computed_value` increases by 6 (if not manually overridden)
- Unequipping reverts bonus: `hp_max` recalculated without it
- `pytest tests/test_equipment.py`

**Spec refs:** §5.4, §6

---

### B8 — Skills system (Week 6)

**Deliverables**
- `skill` table: `id, name, description, skill_type (enum: innate/acquired), occupies_slot (bool), tier (0–5), guild_id (FK nullable), tied_attribute (enum nullable), mana_cost (int nullable), ap_cost (int nullable), icon_url, deleted_at`
- `character_skill` table: `character_id, skill_id, acquired_at`
- `character_skill_tag` table: `character_id, skill_id, category_id (FK skill_category)` (unique on `character_id + skill_id`)
- `skill_category` table: `id, name, icon_url, deleted_at`
- Admin CRUD: `GET/POST/PATCH/DELETE /admin/skills` and `GET/POST/PATCH/DELETE /admin/skill-categories`
- `POST /characters/{id}/skills` — add skill to character:
  - Validates `attribute_power_tier(effective_intelligence) >= skill.tier` → 422 if not; same hard-block pattern as equipment
  - If `skill.occupies_slot = true`: validates `count(CharacterSkill where occupies_slot=true) < effective_intelligence` → 422 `"No skill slots available"`
  - Inserts `CharacterSkill`
- `DELETE /characters/{id}/skills/{skill_id}` — remove skill + its `CharacterSkillTag`
- `PATCH /characters/{id}/skills/{skill_id}/category` — `{ category_id }` → upsert `CharacterSkillTag`
- `GET /characters/{id}/skills` — list with `is_locked: bool` (based on current INT tier), category, tier, `occupies_slot`

**Acceptance criteria**
- Adding skill with `skill.tier > attribute_power_tier(INT)` → 422
- Adding `occupies_slot=true` skill when slot count at limit → 422
- `occupies_slot=false` skill (innate/guild) never triggers slot validation
- After INT allocation raises `attribute_power_tier` → previously blocked skill can be added
- Same skill assigned to different categories on two different characters (per-character `CharacterSkillTag`)
- `GET .../skills` response includes `is_locked: true` for skills above current INT tier
- `pytest tests/test_skills.py`

**Spec refs:** §3.3, §5.5

---

### B9 — Backpack + Currency + Transactions (Week 7)

**Deliverables**
- `backpack_slot` table: `character_id, slot_index (1–6 PK pair), item_name (string), item_type (enum: food/scroll/herb/potion/misc/quest/other), description (text), quantity (int), icon_url (nullable)`
- `currency` table: `character_id (PK)`, `balance_bronze (decimal default 0)`
- `currency_transaction` table: `id, character_id, amount_bronze (decimal ±), money_target (string NOT NULL), related_item_instance_id (FK nullable), created_by (FK Account), created_at`
- `POST /characters/{id}/backpack/{slot_index}` — create or replace slot (PUT semantics: full slot payload required); slot_index must be 1–6 → 422 otherwise
- `DELETE /characters/{id}/backpack/{slot_index}` — clear slot (row deleted)
- `GET /characters/{id}/backpack` — returns array of 6 entries; empty slots returned as `null`
- `POST /characters/{id}/currency/transaction` — `{ amount_bronze, money_target, related_item_instance_id? }`:
  - `money_target` empty or missing → 422 `"money_target is required"`
  - `balance_bronze += amount_bronze`; balance can go negative (no floor validation)
  - Writes `CurrencyTransaction` record
- `GET /characters/{id}/currency` — `{ balance_bronze, transactions: [...] }` (last 50 by default; `?limit=&offset=` for pagination)

**Acceptance criteria**
- `POST .../currency/transaction` without `money_target` → 422
- Balance after two transactions: `balance_bronze = initial + Σ amount_bronze`
- `POST .../backpack/7` → 422 `"slot_index must be between 1 and 6"`
- `POST .../backpack/1` twice → second call overwrites; no duplicate rows
- `GET .../backpack` always returns exactly 6 entries; empty slots are `null`
- `pytest tests/test_backpack.py` and `tests/test_currency.py`

**Spec refs:** §3.8, §5.6, §5.7

---

### B10 — Reputation system (Week 7)

**Deliverables**
- `faction` table: `id, name, description, icon_url, deleted_at`
- `reputation` table: `character_id, faction_id (composite PK), value (int)`
- Admin CRUD: `GET/POST/PATCH/DELETE /admin/factions` (soft-delete)
- `GET /characters/{id}/reputation` — list all factions with current `value` (0 if no record), computed `range_label` (from §3.9 table in `core/compute.py`), and `price_multiplier` for query param `?item_category=`
- `PATCH /characters/{id}/reputation/{faction_id}` (GM only) — `{ value: int }`:
  - Validates `value ∈ [−10, +10]` → 422 if outside
  - Upserts `Reputation` record; writes audit log

**Acceptance criteria**
- `PATCH .../reputation/{id}` with `value = 11` → 422
- `GET .../reputation` returns `range_label = "Незнакомец"` for `value = 0`
- `GET .../reputation?item_category=ranged_weapon` → `price_multiplier` from RuleConfig curve for that category at current reputation value
- Player calling `PATCH .../reputation/{id}` → 403
- Character with no reputation record for a faction → faction still appears in list with `value = 0`
- `pytest tests/test_reputation.py`

**Spec refs:** §3.9, §5.8

---

### B11 — Pet system (Week 8)

**Deliverables**
- `pet` table: `id, character_id (unique), name, species, icon_url, level (int default 1), food_progress (int default 0), stat_bonuses (JSONB), ability_skill_id (FK Skill nullable), created_at`
- `food_required_next` is never stored — always computed on read: `base_pet_food_unit × 2^(level−1)` where `base_pet_food_unit` comes from RuleConfig
- `GET /characters/{id}/pet` — pet data + computed `food_required_next`
- `POST /characters/{id}/pet` (GM only) — create pet: `{ name, species, stat_bonuses?, ability_skill_id? }`
- `PATCH /characters/{id}/pet` — update `name, species, icon_url` (player and GM)
- `POST /characters/{id}/pet/feed` — `{ hunger_points: int }`:
  - Increments `food_progress += hunger_points`
  - While `food_progress >= food_required_next`: `level += 1`, `food_progress -= food_required_next`, recompute threshold
  - Multiple level-ups in one call are possible
  - Triggers `recompute_derived_values` (pet `stat_bonuses` apply to character derived values)
  - Returns `{ level, food_progress, food_required_next, leveled_up: bool, levels_gained: int }`

**Acceptance criteria**
- `food_required_next` at level 1 with `base_pet_food_unit = 3` → 3; feeding 3 → level 2, `food_progress = 0`, new `food_required_next = 6`
- Feeding 10 at level 1 with `base_pet_food_unit = 3` → level 3 (`food_progress = 1`), `levels_gained = 2`
- `food_required_next` not in DB; confirmed by checking `pet` table has no such column
- Player calling `POST /characters/{id}/pet` → 403
- `pytest tests/test_pet.py` with parameterised level-up cases

**Spec refs:** §3.6, §5.9

---

### B12 — RuntimeState: Bubble + Satiety mechanics (Week 8)

**Deliverables**
- `PATCH /characters/{id}/runtime` (stubbed in B4) — fully implemented with clamping:
  - `satiety_current` clamped to `[satiety_min, satiety_max]` = `[−hp_max, str+end]`
  - `current_hp` clamped to `[0, hp_max]`, `current_mana` to `[0, mana_max]`, `current_ap` to `[0, ap_max]`
- `POST /characters/{id}/runtime/location-transition`:
  - If `satiety_current < 0`: `current_hp = max(0, current_hp − abs(satiety_current))`; writes audit log `"Location transition: satiety damage {abs(satiety)}"`
  - Returns full updated `RuntimeState`
- `POST /characters/{id}/runtime/bubble-hit`:
  - `bubble_active = false` → `{ blocked: false }`, no roll
  - Server rolls D100 (`random.randint(1, 100)`)
  - If `roll == 100` OR `roll > bubble_persist_chance_current` → `bubble_active = false`; return `{ blocked: true, bubble_dropped: true, roll }`
  - Else → `bubble_persist_chance_current = max(0, bubble_persist_chance_current − 10)`; return `{ blocked: true, bubble_dropped: false, roll, new_persist_chance }`
  - All changes persisted to `runtime_state`

**Acceptance criteria**
- Location transition with `satiety = −5`, `current_hp = 10` → `current_hp = 5`; audit log row written
- Location transition with `satiety = 2` → HP unchanged, 200 returned
- Bubble hit when `bubble_persist_chance = 100` and `roll = 100` → bubble drops (always)
- Bubble hit when `bubble_persist_chance = 50` and `roll = 40` → bubble persists; `new_persist_chance = 40`
- Bubble hit when `bubble_active = false` → `{ blocked: false }`; no D100 rolled
- `pytest tests/test_runtime.py` monkeypatches `random.randint` for deterministic assertions

**Spec refs:** §3.6, §3.7, §5.11

---

### B13 — RuleConfig editor + all Admin catalogs (Week 9)

**Deliverables**
- `PATCH /rule-config` (admin only) — bulk update with type validation per known key:
  - `hp_per_str, mana_per_spi, ap_per_end, point_buy_base_points, base_pet_food_unit` → `int`
  - `class_thresholds` → `list[int]` of length 4, strictly ascending
  - `reputation_price_curves` → `dict[str, list[float]]`; each list must have exactly 4 values
  - Unknown key → 422 `"Unknown RuleConfig key: {key}"`
  - On success: invalidates in-memory cache; schedules background `recompute_derived_values` for ALL characters via `asyncio.create_task` (non-blocking)
- `GET /rule-config/history` (admin only) — paginated log of config changes with `updated_by` and `updated_at`
- Full admin CRUD for remaining catalogs:
  - `GET/POST/PATCH/DELETE /admin/wild-magic-cards`
  - `GET/POST/PATCH/DELETE /admin/skill-categories`

**Acceptance criteria**
- `PATCH /rule-config { "unknown_key": 5 }` → 422
- `PATCH /rule-config { "class_thresholds": [6, 9, 12, 20] }` → 200; `GET /rule-config` reflects new value
- `PATCH /rule-config { "hp_per_str": 5 }` → response is 200 immediately; background task recomputes all characters (verified via `GET /characters/{id}` after task completes in integration test)
- Player calling `PATCH /rule-config` → 403
- `pytest tests/test_rule_config.py`

**Spec refs:** §1, §3.1, §3.9, §5.1

---

### B14 — Campaign + GM Panel APIs (Week 9–10)

**Deliverables**
- `campaign` table: `id, gm_id (FK Account), name, created_at`
- `campaign_member` table: `campaign_id, character_id (composite PK)` (normalized instead of JSONB array)
- `GET /campaigns` (GM: own campaigns; admin: all)
- `POST /campaigns` (GM only): `{ name }`
- `PATCH /campaigns/{id}/members` (GM only): `{ add?: [character_id], remove?: [character_id] }`; validates GM owns the campaign
- `GET /campaigns/{id}/party-summary` (GM only): single JOIN query returns all member characters with `{ id, name, current_hp, hp_max, current_mana, mana_max, current_ap, ap_max, bubble_active }`; enforced ≤ 2 DB round-trips
- `POST /campaigns/{id}/grant-points` (GM only): `{ character_ids: [...], points: int }`:
  - Validates all `character_ids` are members of this campaign → 422 for any that are not
  - Increments `unallocated_points` for each; writes audit log per character
- `audit_log` table: `id, character_id, action_type (enum), actor_id (FK Account), payload (JSONB), created_at`
  - Action types: `attribute_allocated`, `attribute_overridden`, `override_reset`, `points_granted`, `equipment_changed`, `skill_added`, `skill_removed`, `currency_transaction`, `reputation_changed`, `class_bonus_applied`, `pet_fed`
- `GET /characters/{id}/audit-log` (GM/admin only): paginated; `?action_type=&since=`

**Acceptance criteria**
- `GET /campaigns/{id}/party-summary` verified via query count assertion: ≤ 2 DB queries (no N+1)
- `POST /campaigns/{id}/grant-points` with character not in campaign → 422
- Every action type listed above produces an `audit_log` row (verified in integration tests)
- `GET .../audit-log?action_type=attribute_allocated` filters to only that type
- Player calling `GET /campaigns/{id}/party-summary` → 403
- `pytest tests/test_campaign.py` and `tests/test_audit.py`

**Spec refs:** §5.14, §6, §8

---

### B15 — Dice, Images, API surface completion (Week 10)

**Deliverables**
- `POST /dice/roll` — `{ faces: int }` where `faces ∈ {4, 6, 8, 10, 12, 20, 60, 100}` → `{ result: int, faces }`; any authenticated role; any other value → 422
- `POST /characters/{id}/images` — multipart/form-data portrait upload:
  - Validates `Content-Type ∈ {image/jpeg, image/png}`
  - Validates size ≤ 5 MB → 422 `"Image exceeds 5 MB limit"` if larger
  - Uploads original to S3: `characters/{character_id}/portrait_{timestamp}.{ext}`
  - Generates 256×256 thumbnail (cover crop) via Pillow; uploads to same prefix with `_thumb` suffix
  - Updates `character.appearance_image_url` to thumbnail URL
  - Returns `{ image_url, thumb_url }`
- `DELETE /characters/{id}` (GM/admin only): soft-delete sets `deleted_at`; all character-scoped endpoints return 404 for soft-deleted characters
- `GET /characters/{id}/currency/transactions?limit=&offset=` — pagination (already functional from B9; confirm schema and pagination headers)
- API docs available at `GET /docs` (Swagger UI) and `GET /openapi.json`

**Acceptance criteria**
- `POST /dice/roll { faces: 100 }` run 20 times → all results in `[1, 100]`
- `POST /dice/roll { faces: 7 }` → 422
- Image upload > 5 MB → 422
- Valid 2 MB PNG upload → thumbnail dimensions ≤ 256×256; both URLs returned
- `GET /characters/{soft-deleted-id}` → 404
- `GET /docs` returns 200 with Swagger HTML
- `pytest tests/test_dice.py` and `tests/test_images.py`

**Spec refs:** §3.4, §5.2, §7.8

---

### B16 — QA, Security, Performance (Week 11)

**Deliverables**
- Rate limiting via `slowapi` middleware:
  - Write endpoints (`POST/PATCH/DELETE`) → 60 req/min per authenticated user
  - `POST /auth/login` → 10 req/min per IP
- DB indexes added (if not already created via FK constraints): `character.owner_id`, `item_instance.character_id`, `audit_log.(character_id, created_at)`, `currency_transaction.(character_id, created_at)`
- Ownership guard audit: player cannot read or write another player's character; returns 404 (not 403) to avoid existence leakage
- Integration test suite (`tests/test_integration.py`): full journey from account creation → character creation → point allocation → equipment → skill → currency transaction → pet feed → party summary; runs against real test PostgreSQL container (no mocks)
- Soft-delete consistency: `active_only` filter helper applied in all list queries via SQLAlchemy `where(Model.deleted_at.is_(None))`
- Daily backup: `pg_dump` cron job in `docker-compose.yml` `backup` service; output stored in S3 `backups/` prefix; 30 recent dumps retained

**Acceptance criteria**
- `pytest tests/` — zero failures across unit + integration
- Full integration journey test completes in < 10 seconds (baseline performance check)
- 70 write requests in 60 seconds from one user → at least 10 receive 429
- Player accessing another player's character → 404, not 403 or 200
- `GET /characters/{soft-deleted-id}` → 404
- `pytest --collect-only -q` reports ≥ 60 test cases
- `EXPLAIN ANALYZE` on `GET /campaigns/{id}/party-summary` shows index scan on `campaign_member.campaign_id` for table with > 1000 member rows

**Spec refs:** §6, §8

---

## Cross-cutting rules for every endpoint

1. **Ownership before content** — always verify `character.owner_id == current_user.id` (player) or character is in GM's campaign before processing business logic. Return 404, not 403, to avoid leaking resource existence.

2. **`manual_override` respected on every write** — any service function that writes a derived value MUST check the `manual_override` flag first. Writing over a manually-set value without an explicit reset is a bug.

3. **Audit log on every write** — every mutation to `Attributes`, `DerivedValue`, `ItemInstance.location`, `CharacterSkill`, `Currency`, `Reputation`, and `ClassBonusRecord` writes an `AuditLog` row via `services/audit_service.py:log(session, action_type, character_id, actor_id, payload)`.

4. **RuleConfig reads go through cache only** — never query the `rule_config` table directly in a service; always call `rule_config.get(key)` from `core/rule_config.py` so the invalidation-on-write contract holds.

5. **`derived_values` always in GET /characters/{id} response** — never return a partial character object that omits the derived values block. Stale derived values on the frontend are a data integrity issue.

6. **No hardcoded numeric constants in the service layer** — HP per STR, mana per SPI, class thresholds, bubble formula constants must all come from RuleConfig. Exceptions: definitionally fixed values that cannot meaningfully change (e.g., reputation scale −10..+10, number of equipment slots = 9, attribute value range 0–255).

7. **Soft-delete everywhere** — physical row deletes are never used. All catalog tables (`Race`, `Faction`, `Skill`, `ItemTemplate`, `WildMagicCard`, `SkillCategory`) and `Character` have `deleted_at`. Apply `active_only` filter in every list query.

---

## Local development workflow

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec api alembic upgrade head

# Seed dev data
docker-compose exec api python -m app.scripts.seed

# Run all tests (spins up isolated test DB)
docker-compose --profile test run --rm test pytest

# View auto-generated API docs
open http://localhost:8000/docs
```

Seed data (`app/scripts/seed.py`) creates:
- 1 admin account (`admin@gameofbraza.local` / `admin`)
- 1 GM account + 1 campaign (`gm@gameofbraza.local` / `gm`)
- 1 player account + 1 character (`player@gameofbraza.local` / `player`)
- Default RuleConfig: `hp_per_str=4, mana_per_spi=10, ap_per_end=10, class_thresholds=[6,9,12,20], base_pet_food_unit=3, point_buy_base_points=3, reputation_price_curves={ "default": [1.5, 1.0, 0.5, 0.25], "ranged_weapon": [1.5, 1.0, 0.75, 0.5] }`
- 3 races, 2 factions, 5 skill categories, 10 wild magic cards
