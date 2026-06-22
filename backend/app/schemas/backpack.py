from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class BackpackSlotCreate(BaseModel):
    item_name: str
    item_type: str = "misc"
    description: Optional[str] = None
    quantity: int = 1
    icon_url: Optional[str] = None


class BackpackSlotOut(BaseModel):
    slot_index: int
    item_name: str
    item_type: str
    description: Optional[str]
    quantity: int
    icon_url: Optional[str]

    model_config = {"from_attributes": True}
