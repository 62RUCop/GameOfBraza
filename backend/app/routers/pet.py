from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_role
from app.core.compute import food_required_next
from app.core import rule_config
from app.database import get_db
from app.models.account import Account
from app.models.pet import Pet
from app.schemas.catalogs import FeedRequest, FeedResponse, PetCreate, PetOut, PetUpdate
from app.services import character_service
from app.services.pet_service import feed_pet

router = APIRouter(prefix="/characters/{character_id}/pet", tags=["pet"])


@router.get("", response_model=PetOut)
async def get_pet(
    character_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    res = await db.execute(select(Pet).where(Pet.character_id == character_id))
    pet = res.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="No pet found")
    cfg = rule_config.get_all()
    base_unit = cfg.get("base_pet_food_unit", 3)
    return {**{c.name: getattr(pet, c.name) for c in Pet.__table__.columns}, "food_required_next": food_required_next(pet.level, base_unit)}


@router.post("", response_model=PetOut, status_code=201)
async def create_pet(
    character_id: UUID,
    body: PetCreate,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Pet).where(Pet.character_id == character_id))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Character already has a pet")

    pet = Pet(character_id=character_id, **body.model_dump())
    db.add(pet)
    await db.flush()
    cfg = rule_config.get_all()
    base_unit = cfg.get("base_pet_food_unit", 3)
    return {**{c.name: getattr(pet, c.name) for c in Pet.__table__.columns}, "food_required_next": food_required_next(pet.level, base_unit)}


@router.patch("", response_model=PetOut)
async def update_pet(
    character_id: UUID,
    body: PetUpdate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    res = await db.execute(select(Pet).where(Pet.character_id == character_id))
    pet = res.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="No pet found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(pet, k, v)
    cfg = rule_config.get_all()
    base_unit = cfg.get("base_pet_food_unit", 3)
    return {**{c.name: getattr(pet, c.name) for c in Pet.__table__.columns}, "food_required_next": food_required_next(pet.level, base_unit)}


@router.post("/feed", response_model=FeedResponse)
async def feed(
    character_id: UUID,
    body: FeedRequest,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    return await feed_pet(db, character_id, body.hunger_points, current_user.id)
