from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database import get_db
from app.models.account import Account
from app.models.backpack import BackpackSlot
from app.schemas.backpack import BackpackSlotCreate, BackpackSlotOut
from app.services import character_service

router = APIRouter(prefix="/characters/{character_id}/backpack", tags=["backpack"])


@router.get("", response_model=list[dict])
async def get_backpack(
    character_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    result = await db.execute(
        select(BackpackSlot).where(BackpackSlot.character_id == character_id).order_by(BackpackSlot.slot_index)
    )
    slots = {s.slot_index: s for s in result.scalars().all()}
    return [
        {
            "slot_index": i,
            "item_name": slots[i].item_name if i in slots else None,
            "item_type": slots[i].item_type if i in slots else None,
            "description": slots[i].description if i in slots else None,
            "quantity": slots[i].quantity if i in slots else None,
            "icon_url": slots[i].icon_url if i in slots else None,
        }
        for i in range(1, 7)
    ]


@router.post("/{slot_index}", response_model=BackpackSlotOut)
async def set_slot(
    character_id: UUID,
    slot_index: int,
    body: BackpackSlotCreate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not 1 <= slot_index <= 6:
        raise HTTPException(status_code=422, detail="slot_index must be between 1 and 6")
    await character_service.check_character_access(db, character_id, current_user)

    res = await db.execute(
        select(BackpackSlot).where(BackpackSlot.character_id == character_id, BackpackSlot.slot_index == slot_index)
    )
    slot = res.scalar_one_or_none()
    if slot:
        slot.item_name = body.item_name
        slot.item_type = body.item_type
        slot.description = body.description
        slot.quantity = body.quantity
        slot.icon_url = body.icon_url
    else:
        slot = BackpackSlot(character_id=character_id, slot_index=slot_index, **body.model_dump())
        db.add(slot)
    return slot


@router.delete("/{slot_index}", status_code=204)
async def clear_slot(
    character_id: UUID,
    slot_index: int,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    res = await db.execute(
        select(BackpackSlot).where(BackpackSlot.character_id == character_id, BackpackSlot.slot_index == slot_index)
    )
    slot = res.scalar_one_or_none()
    if slot:
        await db.delete(slot)
