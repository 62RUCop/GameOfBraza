from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.compute import attribute_power_tier
from app.database import get_db
from app.models.account import Account
from app.models.character import CharacterAttributes
from app.models.skills import CharacterSkill, CharacterSkillTag, Skill
from app.schemas.skills import AddSkillRequest, AssignCategoryRequest, CharacterSkillOut
from app.services import character_service
from app.services.skill_service import add_skill, remove_skill

router = APIRouter(prefix="/characters/{character_id}/skills", tags=["skills"])


@router.get("", response_model=list[dict])
async def list_character_skills(
    character_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)

    attrs_res = await db.execute(select(CharacterAttributes).where(CharacterAttributes.character_id == character_id))
    attrs = attrs_res.scalar_one_or_none()
    int_tier = attribute_power_tier(attrs.intelligence) if attrs else 0

    result = await db.execute(
        select(CharacterSkill)
        .options(selectinload(CharacterSkill.skill))
        .where(CharacterSkill.character_id == character_id)
    )
    char_skills = result.scalars().all()

    tag_result = await db.execute(
        select(CharacterSkillTag).where(CharacterSkillTag.character_id == character_id)
    )
    tag_map = {t.skill_id: t for t in tag_result.scalars().all()}

    out = []
    for cs in char_skills:
        tag = tag_map.get(cs.skill_id)
        out.append({
            "skill": {
                "id": str(cs.skill.id),
                "name": cs.skill.name,
                "description": cs.skill.description,
                "skill_type": cs.skill.skill_type,
                "occupies_slot": cs.skill.occupies_slot,
                "tier": cs.skill.tier,
                "mana_cost": cs.skill.mana_cost,
                "ap_cost": cs.skill.ap_cost,
                "icon_url": cs.skill.icon_url,
            },
            "acquired_at": cs.acquired_at.isoformat(),
            "category_id": str(tag.category_id) if tag and tag.category_id else None,
            "is_locked": cs.skill.tier > int_tier,
        })
    return out


@router.post("", status_code=201)
async def add_character_skill(
    character_id: UUID,
    body: AddSkillRequest,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    cs = await add_skill(db, character_id, body.skill_id, current_user.id)
    return {"skill_id": str(cs.skill_id), "acquired_at": cs.acquired_at.isoformat()}


@router.delete("/{skill_id}", status_code=204)
async def remove_character_skill(
    character_id: UUID,
    skill_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    await remove_skill(db, character_id, skill_id, current_user.id)


@router.patch("/{skill_id}/category")
async def assign_category(
    character_id: UUID,
    skill_id: UUID,
    body: AssignCategoryRequest,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)

    cs_res = await db.execute(
        select(CharacterSkill).where(CharacterSkill.character_id == character_id, CharacterSkill.skill_id == skill_id)
    )
    if not cs_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Skill not on character")

    tag_res = await db.execute(
        select(CharacterSkillTag).where(CharacterSkillTag.character_id == character_id, CharacterSkillTag.skill_id == skill_id)
    )
    tag = tag_res.scalar_one_or_none()
    if tag:
        tag.category_id = body.category_id
    else:
        tag = CharacterSkillTag(character_id=character_id, skill_id=skill_id, category_id=body.category_id)
        db.add(tag)

    return {"category_id": str(body.category_id) if body.category_id else None}
