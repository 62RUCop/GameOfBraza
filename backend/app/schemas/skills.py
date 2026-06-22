from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class SkillCreate(BaseModel):
    name: str
    description: Optional[str] = None
    skill_type: str = "acquired"
    occupies_slot: bool = True
    tier: int = 0
    guild_id: Optional[UUID] = None
    tied_attribute: Optional[str] = None
    mana_cost: Optional[int] = None
    ap_cost: Optional[int] = None
    icon_url: Optional[str] = None


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    skill_type: Optional[str] = None
    occupies_slot: Optional[bool] = None
    tier: Optional[int] = None
    mana_cost: Optional[int] = None
    ap_cost: Optional[int] = None
    icon_url: Optional[str] = None


class SkillOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    skill_type: str
    occupies_slot: bool
    tier: int
    tied_attribute: Optional[str]
    mana_cost: Optional[int]
    ap_cost: Optional[int]
    icon_url: Optional[str]

    model_config = {"from_attributes": True}


class CharacterSkillOut(BaseModel):
    skill: SkillOut
    acquired_at: datetime
    category_id: Optional[UUID]
    is_locked: bool

    model_config = {"from_attributes": True}


class SkillCategoryCreate(BaseModel):
    name: str
    icon_url: Optional[str] = None


class SkillCategoryOut(BaseModel):
    id: UUID
    name: str
    icon_url: Optional[str]

    model_config = {"from_attributes": True}


class AddSkillRequest(BaseModel):
    skill_id: UUID


class AssignCategoryRequest(BaseModel):
    category_id: Optional[UUID] = None
