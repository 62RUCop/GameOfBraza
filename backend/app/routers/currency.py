from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database import get_db
from app.models.account import Account
from app.models.currency import Currency, CurrencyTransaction
from app.schemas.currency import CurrencyOut, TransactionCreate, TransactionOut
from app.services import character_service
from app.services.currency_service import create_transaction

router = APIRouter(prefix="/characters/{character_id}/currency", tags=["currency"])


@router.get("", response_model=CurrencyOut)
async def get_currency(
    character_id: UUID,
    limit: int = 50,
    offset: int = 0,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    curr_res = await db.execute(select(Currency).where(Currency.character_id == character_id))
    currency = curr_res.scalar_one_or_none()
    balance = float(currency.balance_bronze) if currency else 0.0

    tx_res = await db.execute(
        select(CurrencyTransaction)
        .where(CurrencyTransaction.character_id == character_id)
        .order_by(CurrencyTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    txs = tx_res.scalars().all()
    return {"balance_bronze": balance, "transactions": txs}


@router.post("/transaction", response_model=TransactionOut, status_code=201)
async def add_transaction(
    character_id: UUID,
    body: TransactionCreate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    return await create_transaction(
        db, character_id, body.amount_bronze, body.money_target, current_user.id, body.related_item_instance_id
    )
