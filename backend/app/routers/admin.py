from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_role
from app.core import rule_config as rule_config_cache
from app.database import get_db
from app.models.account import Account
from app.models.catalogs import Faction, Race, SkillCategory, WildMagicCard
from app.models.items import ItemTemplate
from app.models.rule_config_model import RuleConfigEntry
from app.models.skills import Skill
from app.schemas.catalogs import FactionCreate, FactionOut, RaceCreate, RaceOut, WildMagicCardCreate, WildMagicCardOut
from app.schemas.items import ItemTemplateCreate, ItemTemplateOut, ItemTemplateUpdate
from app.schemas.skills import SkillCategoryCreate, SkillCategoryOut, SkillCreate, SkillOut, SkillUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


def _soft_delete(obj):
    obj.deleted_at = datetime.now(timezone.utc)


# ---- RACES ----

@router.get("/races", response_model=list[RaceOut])
async def list_races(db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "gm", "player"))):
    result = await db.execute(select(Race).where(Race.deleted_at.is_(None)))
    return result.scalars().all()


@router.post("/races", response_model=RaceOut, status_code=201)
async def create_race(body: RaceCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    race = Race(**body.model_dump())
    db.add(race)
    await db.flush()
    return race


@router.patch("/races/{race_id}", response_model=RaceOut)
async def update_race(race_id: UUID, body: RaceCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(Race).where(Race.id == race_id))
    race = res.scalar_one_or_none()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(race, k, v)
    return race


@router.delete("/races/{race_id}", status_code=204)
async def delete_race(race_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(Race).where(Race.id == race_id))
    race = res.scalar_one_or_none()
    if race:
        _soft_delete(race)


# ---- FACTIONS ----

@router.get("/factions", response_model=list[FactionOut])
async def list_factions(db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "gm", "player"))):
    result = await db.execute(select(Faction).where(Faction.deleted_at.is_(None)))
    return result.scalars().all()


@router.post("/factions", response_model=FactionOut, status_code=201)
async def create_faction(body: FactionCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    faction = Faction(**body.model_dump())
    db.add(faction)
    await db.flush()
    return faction


@router.patch("/factions/{faction_id}", response_model=FactionOut)
async def update_faction(faction_id: UUID, body: FactionCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(Faction).where(Faction.id == faction_id))
    obj = res.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Faction not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(obj, k, v)
    return obj


@router.delete("/factions/{faction_id}", status_code=204)
async def delete_faction(faction_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(Faction).where(Faction.id == faction_id))
    obj = res.scalar_one_or_none()
    if obj:
        _soft_delete(obj)


# ---- ITEM TEMPLATES ----

@router.get("/item-templates", response_model=list[ItemTemplateOut])
async def list_item_templates(
    slot: str | None = None,
    tier: int | None = None,
    weapon_family: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "gm", "player")),
):
    q = select(ItemTemplate).where(ItemTemplate.deleted_at.is_(None))
    if slot:
        q = q.where(ItemTemplate.slot_type == slot)
    if tier is not None:
        q = q.where(ItemTemplate.tier == tier)
    if weapon_family:
        q = q.where(ItemTemplate.weapon_family == weapon_family)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/item-templates", response_model=ItemTemplateOut, status_code=201)
async def create_item_template(body: ItemTemplateCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    if body.granted_ability_ids:
        for skill_id in body.granted_ability_ids:
            res = await db.execute(select(Skill).where(Skill.id == skill_id))
            if not res.scalar_one_or_none():
                raise HTTPException(status_code=422, detail=f"Skill {skill_id} not found")
    data = body.model_dump()
    if data.get("granted_ability_ids"):
        data["granted_ability_ids"] = [str(i) for i in data["granted_ability_ids"]]
    item = ItemTemplate(**data)
    db.add(item)
    await db.flush()
    return item


@router.patch("/item-templates/{item_id}", response_model=ItemTemplateOut)
async def update_item_template(item_id: UUID, body: ItemTemplateUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(ItemTemplate).where(ItemTemplate.id == item_id))
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item template not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    return item


@router.delete("/item-templates/{item_id}", status_code=204)
async def delete_item_template(item_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(ItemTemplate).where(ItemTemplate.id == item_id))
    obj = res.scalar_one_or_none()
    if obj:
        _soft_delete(obj)


# ---- SKILLS ----

@router.get("/skills", response_model=list[SkillOut])
async def list_skills(db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "gm", "player"))):
    result = await db.execute(select(Skill).where(Skill.deleted_at.is_(None)))
    return result.scalars().all()


@router.post("/skills", response_model=SkillOut, status_code=201)
async def create_skill(body: SkillCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    skill = Skill(**body.model_dump())
    db.add(skill)
    await db.flush()
    return skill


@router.patch("/skills/{skill_id}", response_model=SkillOut)
async def update_skill(skill_id: UUID, body: SkillUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = res.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(skill, k, v)
    return skill


@router.delete("/skills/{skill_id}", status_code=204)
async def delete_skill(skill_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(Skill).where(Skill.id == skill_id))
    obj = res.scalar_one_or_none()
    if obj:
        _soft_delete(obj)


# ---- SKILL CATEGORIES ----

@router.get("/skill-categories", response_model=list[SkillCategoryOut])
async def list_skill_categories(db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "gm", "player"))):
    result = await db.execute(select(SkillCategory).where(SkillCategory.deleted_at.is_(None)))
    return result.scalars().all()


@router.post("/skill-categories", response_model=SkillCategoryOut, status_code=201)
async def create_skill_category(body: SkillCategoryCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    cat = SkillCategory(**body.model_dump())
    db.add(cat)
    await db.flush()
    return cat


@router.patch("/skill-categories/{cat_id}", response_model=SkillCategoryOut)
async def update_skill_category(cat_id: UUID, body: SkillCategoryCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(SkillCategory).where(SkillCategory.id == cat_id))
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(cat, k, v)
    return cat


@router.delete("/skill-categories/{cat_id}", status_code=204)
async def delete_skill_category(cat_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(SkillCategory).where(SkillCategory.id == cat_id))
    obj = res.scalar_one_or_none()
    if obj:
        _soft_delete(obj)


# ---- WILD MAGIC CARDS ----

@router.get("/wild-magic-cards", response_model=list[WildMagicCardOut])
async def list_cards(db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "gm", "player"))):
    result = await db.execute(select(WildMagicCard).where(WildMagicCard.deleted_at.is_(None)))
    return result.scalars().all()


@router.post("/wild-magic-cards", response_model=WildMagicCardOut, status_code=201)
async def create_card(body: WildMagicCardCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    card = WildMagicCard(**body.model_dump())
    db.add(card)
    await db.flush()
    return card


@router.patch("/wild-magic-cards/{card_id}", response_model=WildMagicCardOut)
async def update_card(card_id: UUID, body: WildMagicCardCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(WildMagicCard).where(WildMagicCard.id == card_id))
    card = res.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(card, k, v)
    return card


@router.delete("/wild-magic-cards/{card_id}", status_code=204)
async def delete_card(card_id: UUID, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    res = await db.execute(select(WildMagicCard).where(WildMagicCard.id == card_id))
    obj = res.scalar_one_or_none()
    if obj:
        _soft_delete(obj)


# ---- RULE CONFIG ----

@router.get("/rule-config")
async def get_rule_config(db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "gm", "player"))):
    return rule_config_cache.get_all()


@router.patch("/rule-config")
async def update_rule_config(
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: Account = Depends(require_role("admin")),
):
    from app.core.rule_config import KNOWN_KEYS

    for key in body:
        if key not in KNOWN_KEYS:
            raise HTTPException(status_code=422, detail=f"Unknown RuleConfig key: {key}")

    if "class_thresholds" in body:
        v = body["class_thresholds"]
        if not isinstance(v, list) or len(v) != 4 or v != sorted(v):
            raise HTTPException(status_code=422, detail="class_thresholds must be a sorted list of 4 integers")

    if "reputation_price_curves" in body:
        for cat, curve in body["reputation_price_curves"].items():
            if not isinstance(curve, list) or len(curve) != 4:
                raise HTTPException(status_code=422, detail=f"Reputation curve for '{cat}' must have exactly 4 values")

    now = datetime.now(timezone.utc)
    for key, value in body.items():
        res = await db.execute(select(RuleConfigEntry).where(RuleConfigEntry.key == key))
        entry = res.scalar_one_or_none()
        if entry:
            entry.value = value
            entry.updated_at = now
            entry.updated_by_id = current_user.id
        else:
            entry = RuleConfigEntry(key=key, value=value, updated_at=now, updated_by_id=current_user.id)
            db.add(entry)

    rule_config_cache.set_all(body)
    return {"updated": list(body.keys())}


@router.get("/rule-config/history")
async def rule_config_history(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    result = await db.execute(
        select(RuleConfigEntry).order_by(RuleConfigEntry.updated_at.desc()).offset(offset).limit(limit)
    )
    return result.scalars().all()
