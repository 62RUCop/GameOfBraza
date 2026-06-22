from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.database import get_db
from app.models.account import Account
from app.models.items import ItemInstance, SLOT_TYPES
from app.schemas.items import EquipRequest, ItemInstanceCreate, ItemInstanceOut, ItemInstanceUpdate
from app.services import character_service
from app.services.equipment_service import equip_item, unequip_item

router = APIRouter(prefix="/characters/{character_id}", tags=["equipment"])


@router.post("/items", response_model=ItemInstanceOut, status_code=201)
async def create_item_instance(
    character_id: UUID,
    body: ItemInstanceCreate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)

    if not body.template_id and current_user.role not in ("gm", "admin"):
        raise HTTPException(status_code=403, detail="Only GM/admin can create template-free items")

    overrides = body.overrides or {}
    if not body.template_id:
        overrides.update({k: v for k, v in {"name": body.name, "slot_type": body.slot_type, "tier": body.tier, "stat_bonuses": body.stat_bonuses}.items() if v is not None})

    item = ItemInstance(
        character_id=character_id,
        template_id=body.template_id,
        overrides=overrides or None,
        acquired_price=body.acquired_price,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item, ["template"])
    return item


@router.get("/items", response_model=list[ItemInstanceOut])
async def list_items(
    character_id: UUID,
    location: str | None = None,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    q = select(ItemInstance).options(selectinload(ItemInstance.template)).where(ItemInstance.character_id == character_id)
    if location:
        q = q.where(ItemInstance.location == location)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/items/{item_id}", response_model=ItemInstanceOut)
async def update_item(
    character_id: UUID,
    item_id: UUID,
    body: ItemInstanceUpdate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    res = await db.execute(
        select(ItemInstance).options(selectinload(ItemInstance.template))
        .where(ItemInstance.id == item_id, ItemInstance.character_id == character_id)
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if body.overrides is not None:
        item.overrides = body.overrides
    if body.acquired_price is not None:
        item.acquired_price = body.acquired_price
    return item


@router.post("/equipment/{slot}", response_model=ItemInstanceOut)
async def equip(
    character_id: UUID,
    slot: str,
    body: EquipRequest,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if slot not in SLOT_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid slot: {slot}")
    await character_service.check_character_access(db, character_id, current_user)
    return await equip_item(db, character_id, slot, body.item_instance_id, current_user.id, is_gm=current_user.role in ("gm", "admin"))


@router.delete("/equipment/{slot}", status_code=204)
async def unequip(
    character_id: UUID,
    slot: str,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    await unequip_item(db, character_id, slot, current_user.id)
