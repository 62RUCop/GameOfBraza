from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class ItemTemplateCreate(BaseModel):
    name: str
    slot_type: str
    weapon_family: Optional[str] = None
    is_two_handed: bool = False
    tier: int = 0
    required_attribute: Optional[str] = None
    damage_dice: Optional[str] = None
    bonus_crit_dice: Optional[str] = None
    scaling_attribute: Optional[str] = None
    scaling_coefficient: Optional[float] = None
    stat_bonuses: Optional[dict] = None
    granted_ability_ids: Optional[list[UUID]] = None
    hunger_restored: Optional[int] = None
    reference_price: float = 0.0
    description: Optional[str] = None
    icon_url: Optional[str] = None


class ItemTemplateUpdate(BaseModel):
    name: Optional[str] = None
    slot_type: Optional[str] = None
    weapon_family: Optional[str] = None
    is_two_handed: Optional[bool] = None
    tier: Optional[int] = None
    required_attribute: Optional[str] = None
    damage_dice: Optional[str] = None
    bonus_crit_dice: Optional[str] = None
    scaling_attribute: Optional[str] = None
    scaling_coefficient: Optional[float] = None
    stat_bonuses: Optional[dict] = None
    granted_ability_ids: Optional[list[UUID]] = None
    hunger_restored: Optional[int] = None
    reference_price: Optional[float] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None


class ItemTemplateOut(BaseModel):
    id: UUID
    name: str
    slot_type: str
    weapon_family: Optional[str]
    is_two_handed: bool
    tier: int
    required_attribute: Optional[str]
    damage_dice: Optional[str]
    bonus_crit_dice: Optional[str]
    scaling_attribute: Optional[str]
    scaling_coefficient: Optional[float]
    stat_bonuses: Optional[dict]
    granted_ability_ids: Optional[list]
    hunger_restored: Optional[int]
    reference_price: float
    description: Optional[str]
    icon_url: Optional[str]

    model_config = {"from_attributes": True}


class ItemInstanceCreate(BaseModel):
    template_id: Optional[UUID] = None
    overrides: Optional[dict] = None
    acquired_price: Optional[float] = None
    name: Optional[str] = None
    slot_type: Optional[str] = None
    tier: Optional[int] = None
    stat_bonuses: Optional[dict] = None


class ItemInstanceUpdate(BaseModel):
    overrides: Optional[dict] = None
    acquired_price: Optional[float] = None


class ItemInstanceOut(BaseModel):
    id: UUID
    character_id: UUID
    template_id: Optional[UUID]
    overrides: Optional[dict]
    acquired_price: Optional[float]
    location: str
    created_at: datetime
    template: Optional[ItemTemplateOut]

    model_config = {"from_attributes": True}


class EquipRequest(BaseModel):
    item_instance_id: UUID
