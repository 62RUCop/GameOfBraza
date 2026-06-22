from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class TransactionCreate(BaseModel):
    amount_bronze: float
    money_target: str
    related_item_instance_id: Optional[UUID] = None


class TransactionOut(BaseModel):
    id: UUID
    amount_bronze: float
    money_target: str
    related_item_instance_id: Optional[UUID]
    created_by_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class CurrencyOut(BaseModel):
    balance_bronze: float
    transactions: list[TransactionOut] = []

    model_config = {"from_attributes": True}
