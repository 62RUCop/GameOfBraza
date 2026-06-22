import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.currency import Currency, CurrencyTransaction
from app.services import audit_service


async def create_transaction(
    session: AsyncSession,
    character_id: uuid.UUID,
    amount_bronze: float,
    money_target: str,
    actor_id: uuid.UUID,
    related_item_instance_id: uuid.UUID | None = None,
) -> CurrencyTransaction:
    if not money_target or not money_target.strip():
        raise HTTPException(status_code=422, detail="money_target is required")

    curr_res = await session.execute(select(Currency).where(Currency.character_id == character_id))
    currency = curr_res.scalar_one_or_none()
    if not currency:
        currency = Currency(character_id=character_id, balance_bronze=0)
        session.add(currency)

    currency.balance_bronze = float(currency.balance_bronze) + amount_bronze

    tx = CurrencyTransaction(
        character_id=character_id,
        amount_bronze=amount_bronze,
        money_target=money_target,
        related_item_instance_id=related_item_instance_id,
        created_by_id=actor_id,
    )
    session.add(tx)
    await audit_service.log(
        session, "currency_transaction", character_id, actor_id,
        {"amount": amount_bronze, "target": money_target}
    )
    return tx
