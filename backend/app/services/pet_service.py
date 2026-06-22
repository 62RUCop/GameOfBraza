import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rule_config
from app.core.compute import food_required_next
from app.models.pet import Pet
from app.services import audit_service, character_service


async def feed_pet(session: AsyncSession, character_id: uuid.UUID, hunger_points: int, actor_id: uuid.UUID) -> dict:
    res = await session.execute(select(Pet).where(Pet.character_id == character_id))
    pet = res.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    cfg = rule_config.get_all()
    base_unit = cfg.get("base_pet_food_unit", 3)

    initial_level = pet.level
    pet.food_progress += hunger_points

    levels_gained = 0
    while True:
        threshold = food_required_next(pet.level, base_unit)
        if pet.food_progress >= threshold:
            pet.level += 1
            pet.food_progress -= threshold
            levels_gained += 1
        else:
            break

    next_threshold = food_required_next(pet.level, base_unit)
    await audit_service.log(session, "pet_fed", character_id, actor_id, {"hunger_points": hunger_points, "levels_gained": levels_gained})
    if levels_gained > 0:
        await character_service.recompute_derived_values(character_id, session)

    return {
        "level": pet.level,
        "food_progress": pet.food_progress,
        "food_required_next": next_threshold,
        "leveled_up": levels_gained > 0,
        "levels_gained": levels_gained,
    }
