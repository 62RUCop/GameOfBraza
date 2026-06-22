from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database import get_db
from app.models.account import Account
from app.models.class_bonus import ClassBonusRecord
from app.schemas.catalogs import ClassBonusRollResponse, IntChooseRequest
from app.services import character_service
from app.services.class_bonus_service import choose_wild_magic, roll_class_bonus

router = APIRouter(prefix="/characters/{character_id}/class-bonus", tags=["class-bonus"])


@router.get("")
async def list_class_bonuses(
    character_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    result = await db.execute(
        select(ClassBonusRecord)
        .where(ClassBonusRecord.character_id == character_id)
        .order_by(ClassBonusRecord.attribute, ClassBonusRecord.class_index)
    )
    return result.scalars().all()


@router.post("/{attribute}/roll", response_model=ClassBonusRollResponse)
async def roll_bonus(
    character_id: UUID,
    attribute: str,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    return await roll_class_bonus(db, character_id, attribute, current_user.id)


@router.post("/int/choose")
async def choose_card(
    character_id: UUID,
    body: IntChooseRequest,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    record = await choose_wild_magic(db, character_id, body.draw_id, body.chosen_card_id, current_user.id)
    return {"attribute": "intelligence", "class_index": record.class_index, "resulting_effect": record.resulting_effect}
