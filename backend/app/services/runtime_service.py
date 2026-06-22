import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.character import DerivedValue, RuntimeState
from app.services import audit_service


async def _get_runtime(session: AsyncSession, character_id: uuid.UUID) -> RuntimeState:
    from fastapi import HTTPException
    res = await session.execute(select(RuntimeState).where(RuntimeState.character_id == character_id))
    rs = res.scalar_one_or_none()
    if not rs:
        raise HTTPException(status_code=404, detail="Runtime state not found")
    return rs


async def _get_derived(session: AsyncSession, character_id: uuid.UUID, key: str) -> int:
    res = await session.execute(
        select(DerivedValue).where(DerivedValue.character_id == character_id, DerivedValue.key == key)
    )
    dv = res.scalar_one_or_none()
    if dv:
        return dv.effective_value
    return 0


async def update_runtime(session: AsyncSession, character_id: uuid.UUID, updates: dict) -> RuntimeState:
    rs = await _get_runtime(session, character_id)

    hp_max = await _get_derived(session, character_id, "hp_max")
    mana_max = await _get_derived(session, character_id, "mana_max")
    ap_max = await _get_derived(session, character_id, "ap_max")

    from app.models.character import CharacterAttributes
    attrs_res = await session.execute(select(CharacterAttributes).where(CharacterAttributes.character_id == character_id))
    attrs = attrs_res.scalar_one_or_none()
    str_val = attrs.strength if attrs else 0
    end_val = attrs.endurance if attrs else 0
    satiety_min = -hp_max
    satiety_max = str_val + end_val

    if "current_hp" in updates:
        rs.current_hp = max(0, min(hp_max, updates["current_hp"]))
    if "current_mana" in updates:
        rs.current_mana = max(0, min(mana_max, updates["current_mana"]))
    if "current_ap" in updates:
        rs.current_ap = max(0, min(ap_max, updates["current_ap"]))
    if "satiety_current" in updates:
        rs.satiety_current = max(satiety_min, min(satiety_max, updates["satiety_current"]))
    if "bubble_active" in updates:
        rs.bubble_active = updates["bubble_active"]
    if "bubble_persist_chance_current" in updates:
        rs.bubble_persist_chance_current = max(0, min(100, updates["bubble_persist_chance_current"]))

    rs.updated_at = datetime.now(timezone.utc)
    return rs


async def location_transition(session: AsyncSession, character_id: uuid.UUID, actor_id: uuid.UUID) -> RuntimeState:
    rs = await _get_runtime(session, character_id)
    if rs.satiety_current < 0:
        damage = abs(rs.satiety_current)
        rs.current_hp = max(0, rs.current_hp - damage)
        rs.updated_at = datetime.now(timezone.utc)
        await audit_service.log(session, "location_transition", character_id, actor_id, {"satiety_damage": damage})
    return rs


async def bubble_hit(session: AsyncSession, character_id: uuid.UUID, actor_id: uuid.UUID) -> dict:
    rs = await _get_runtime(session, character_id)

    if not rs.bubble_active:
        return {"blocked": False}

    roll = random.randint(1, 100)
    persist_chance = rs.bubble_persist_chance_current

    if roll == 100 or roll > persist_chance:
        rs.bubble_active = False
        rs.updated_at = datetime.now(timezone.utc)
        await audit_service.log(session, "bubble_hit", character_id, actor_id, {"roll": roll, "dropped": True})
        return {"blocked": True, "bubble_dropped": True, "roll": roll}
    else:
        rs.bubble_persist_chance_current = max(0, persist_chance - 10)
        rs.updated_at = datetime.now(timezone.utc)
        await audit_service.log(session, "bubble_hit", character_id, actor_id, {"roll": roll, "dropped": False, "new_persist_chance": rs.bubble_persist_chance_current})
        return {"blocked": True, "bubble_dropped": False, "roll": roll, "new_persist_chance": rs.bubble_persist_chance_current}
