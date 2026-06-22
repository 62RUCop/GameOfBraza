from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class AttributesIn(BaseModel):
    strength: int = 3
    dexterity: int = 3
    intelligence: int = 3
    spirit: int = 3
    endurance: int = 3
    luck: int = 3


class CharacterCreate(BaseModel):
    name: str
    race_id: Optional[UUID] = None
    attributes: AttributesIn = AttributesIn()
    is_npc: bool = False


class CharacterDescriptionUpdate(BaseModel):
    name: Optional[str] = None
    race_id: Optional[UUID] = None
    quenta: Optional[str] = None
    main_quest: Optional[str] = None
    quest_progress_stage: Optional[int] = None
    player_notes: Optional[str] = None
    appearance_image_url: Optional[str] = None


class AttributesOut(BaseModel):
    strength: int
    dexterity: int
    intelligence: int
    spirit: int
    endurance: int
    luck: int

    model_config = {"from_attributes": True}


class DerivedValueOut(BaseModel):
    key: str
    computed_value: int
    override_value: Optional[int]
    manual_override: bool
    effective_value: int
    override_author_id: Optional[UUID]
    override_at: Optional[datetime]

    model_config = {"from_attributes": True}


class RuntimeStateOut(BaseModel):
    current_hp: int
    current_mana: int
    current_ap: int
    satiety_current: int
    bubble_active: bool
    bubble_persist_chance_current: int
    active_effects: Optional[dict]
    updated_at: datetime

    model_config = {"from_attributes": True}


class CharacterOut(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    race_id: Optional[UUID]
    is_npc: bool
    campaign_id: Optional[UUID]
    appearance_image_url: Optional[str]
    quenta: Optional[str]
    main_quest: Optional[str]
    quest_progress_stage: int
    player_notes: Optional[str]
    unallocated_points: int
    created_at: datetime
    attributes: Optional[AttributesOut]
    derived_values: list[DerivedValueOut] = []
    runtime_state: Optional[RuntimeStateOut]

    model_config = {"from_attributes": True}


class CharacterListItem(BaseModel):
    id: UUID
    name: str
    race_id: Optional[UUID]
    is_npc: bool
    appearance_image_url: Optional[str]
    unallocated_points: int

    model_config = {"from_attributes": True}


class AllocateRequest(BaseModel):
    attribute: str
    delta: int
    confirmed: bool = False


class AllocatePreview(BaseModel):
    cost: int
    new_value: int
    remaining_points: int


class GrantPointsRequest(BaseModel):
    points: int


class OverrideRequest(BaseModel):
    value: Optional[int] = None
    reset: bool = False


class RuntimeUpdate(BaseModel):
    current_hp: Optional[int] = None
    current_mana: Optional[int] = None
    current_ap: Optional[int] = None
    satiety_current: Optional[int] = None
    bubble_active: Optional[bool] = None
    bubble_persist_chance_current: Optional[int] = None
