import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.compute import attribute_power_tier
from app.models.character import CharacterAttributes
from app.models.skills import CharacterSkill, CharacterSkillTag, Skill
from app.services import audit_service


async def add_skill(session: AsyncSession, character_id: uuid.UUID, skill_id: uuid.UUID, actor_id: uuid.UUID) -> CharacterSkill:
    skill_res = await session.execute(select(Skill).where(Skill.id == skill_id, Skill.deleted_at.is_(None)))
    skill = skill_res.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    attrs_res = await session.execute(select(CharacterAttributes).where(CharacterAttributes.character_id == character_id))
    attrs = attrs_res.scalar_one_or_none()
    if not attrs:
        raise HTTPException(status_code=404, detail="Character attributes not found")

    if attribute_power_tier(attrs.intelligence) < skill.tier:
        raise HTTPException(status_code=422, detail=f"Skill tier {skill.tier} requires higher INT power tier")

    if skill.occupies_slot:
        slot_count_res = await session.execute(
            select(func.count())
            .select_from(CharacterSkill)
            .join(Skill, CharacterSkill.skill_id == Skill.id)
            .where(CharacterSkill.character_id == character_id, Skill.occupies_slot == True)
        )
        used_slots = slot_count_res.scalar()
        if used_slots >= attrs.intelligence:
            raise HTTPException(status_code=422, detail="No skill slots available")

    existing = await session.execute(
        select(CharacterSkill).where(CharacterSkill.character_id == character_id, CharacterSkill.skill_id == skill_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Skill already added")

    cs = CharacterSkill(character_id=character_id, skill_id=skill_id)
    session.add(cs)
    await audit_service.log(session, "skill_added", character_id, actor_id, {"skill_id": str(skill_id)})
    return cs


async def remove_skill(session: AsyncSession, character_id: uuid.UUID, skill_id: uuid.UUID, actor_id: uuid.UUID) -> None:
    cs_res = await session.execute(
        select(CharacterSkill).where(CharacterSkill.character_id == character_id, CharacterSkill.skill_id == skill_id)
    )
    cs = cs_res.scalar_one_or_none()
    if not cs:
        raise HTTPException(status_code=404, detail="Skill not found on character")
    tag_res = await session.execute(
        select(CharacterSkillTag).where(CharacterSkillTag.character_id == character_id, CharacterSkillTag.skill_id == skill_id)
    )
    tag = tag_res.scalar_one_or_none()
    if tag:
        await session.delete(tag)
    await session.delete(cs)
    await audit_service.log(session, "skill_removed", character_id, actor_id, {"skill_id": str(skill_id)})
