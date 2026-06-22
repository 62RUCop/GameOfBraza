import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import compute, rule_config
from app.models.character import Character, CharacterAttributes, DerivedValue, RuntimeState, DERIVED_VALUE_KEYS
from app.models.class_bonus import ClassBonusRecord
from app.models.items import ItemInstance


async def get_character_or_404(session: AsyncSession, character_id: uuid.UUID) -> Character:
    from fastapi import HTTPException

    result = await session.execute(
        select(Character)
        .options(
            selectinload(Character.attributes),
            selectinload(Character.derived_values),
            selectinload(Character.runtime_state),
            selectinload(Character.race),
        )
        .where(Character.id == character_id, Character.deleted_at.is_(None))
    )
    char = result.scalar_one_or_none()
    if char is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return char


async def recompute_derived_values(character_id: uuid.UUID, session: AsyncSession) -> None:
    result = await session.execute(
        select(Character)
        .options(
            selectinload(Character.attributes),
            selectinload(Character.derived_values),
            selectinload(Character.items).selectinload(ItemInstance.template),
        )
        .where(Character.id == character_id)
    )
    char = result.scalar_one_or_none()
    if not char or not char.attributes:
        return

    attrs = char.attributes
    cfg = rule_config.get_all()
    hp_per_str = cfg.get("hp_per_str", 4)
    mana_per_spi = cfg.get("mana_per_spi", 10)
    ap_per_end = cfg.get("ap_per_end", 10)

    bonus_result = await session.execute(
        select(ClassBonusRecord).where(ClassBonusRecord.character_id == character_id)
    )
    class_bonus_records = bonus_result.scalars().all()

    hp_bonus = sum(r.resulting_effect.get("hp_bonus", 0) for r in class_bonus_records if r.resulting_effect)
    dodge_bonus = sum(r.resulting_effect.get("dodge_bonus", 0) for r in class_bonus_records if r.resulting_effect)
    armor_bonus = sum(r.resulting_effect.get("armor_bonus", 0) for r in class_bonus_records if r.resulting_effect)
    bubble_bonus = sum(r.resulting_effect.get("bubble_charges", 0) for r in class_bonus_records if r.resulting_effect)
    luck_crit_bonus = sum(r.resulting_effect.get("luck_class_crit_bonus", 0) for r in class_bonus_records if r.resulting_effect)

    equipped_items = [i for i in char.items if i.location.startswith("equipped:")]
    item_hp = 0
    item_dodge = 0
    item_armor = 0
    for item in equipped_items:
        bonuses = {}
        if item.template and item.template.stat_bonuses:
            bonuses.update(item.template.stat_bonuses)
        if item.overrides and "stat_bonuses" in item.overrides:
            bonuses.update(item.overrides["stat_bonuses"])
        item_hp += bonuses.get("hp", 0)
        item_dodge += bonuses.get("dodge", 0)
        item_armor += bonuses.get("armor", 0)

    computed = {
        "hp_max": compute.hp_max(attrs.strength, hp_bonus + item_hp, hp_per_str),
        "mana_max": compute.mana_max(attrs.spirit, 0, mana_per_spi),
        "ap_max": compute.ap_max(attrs.endurance, 0, ap_per_end),
        "dodge": dodge_bonus + item_dodge,
        "armor": armor_bonus + item_armor,
        "slots": compute.slots(attrs.intelligence),
        "bubble_charges": bubble_bonus,
        "luck_class_crit_bonus": luck_crit_bonus,
    }

    dv_map = {dv.key: dv for dv in char.derived_values}

    for key, value in computed.items():
        if key in dv_map:
            dv = dv_map[key]
            if not dv.manual_override:
                dv.computed_value = value
        else:
            dv = DerivedValue(character_id=character_id, key=key, computed_value=value)
            session.add(dv)


async def initialize_character(session: AsyncSession, char: Character) -> None:
    attrs = CharacterAttributes(character_id=char.id)
    session.add(attrs)
    for key in DERIVED_VALUE_KEYS:
        session.add(DerivedValue(character_id=char.id, key=key, computed_value=0))
    runtime = RuntimeState(character_id=char.id)
    session.add(runtime)
    from app.models.currency import Currency
    session.add(Currency(character_id=char.id, balance_bronze=0))


def point_buy_cost(from_val: int, to_val: int) -> int:
    return compute.point_buy_cost(from_val, to_val)


def validate_point_buy(attrs_dict: dict) -> None:
    from fastapi import HTTPException

    base = 3
    total_cost = 0
    for v in attrs_dict.values():
        total_cost += point_buy_cost(base, v)
    if total_cost != 0:
        raise HTTPException(status_code=422, detail="Point-buy budget must be zero-sum")


async def check_character_access(session: AsyncSession, character_id: uuid.UUID, current_user) -> Character:
    from fastapi import HTTPException

    char = await get_character_or_404(session, character_id)
    if current_user.role == "admin":
        return char
    if current_user.role == "gm":
        return char
    if char.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Character not found")
    return char
