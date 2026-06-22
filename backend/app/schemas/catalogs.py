from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class RaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None


class RaceOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    icon_url: Optional[str]

    model_config = {"from_attributes": True}


class FactionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None


class FactionOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    icon_url: Optional[str]

    model_config = {"from_attributes": True}


class WildMagicCardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    effect_json: Optional[dict] = None


class WildMagicCardOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    effect_json: Optional[dict]

    model_config = {"from_attributes": True}


class ReputationOut(BaseModel):
    faction: FactionOut
    value: int
    range_label: str
    price_multiplier: Optional[float] = None

    model_config = {"from_attributes": True}


class ReputationUpdate(BaseModel):
    value: int


class PetCreate(BaseModel):
    name: str
    species: str
    stat_bonuses: Optional[dict] = None
    ability_skill_id: Optional[UUID] = None


class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    icon_url: Optional[str] = None


class PetOut(BaseModel):
    id: UUID
    name: str
    species: str
    icon_url: Optional[str]
    level: int
    food_progress: int
    food_required_next: int
    stat_bonuses: Optional[dict]

    model_config = {"from_attributes": True}


class FeedRequest(BaseModel):
    hunger_points: int


class FeedResponse(BaseModel):
    level: int
    food_progress: int
    food_required_next: int
    leveled_up: bool
    levels_gained: int


class ClassBonusRollResponse(BaseModel):
    attribute: str
    class_index: int
    dice_formula: Optional[str]
    rolled_values: Optional[list]
    rolled_sum: Optional[int]
    resulting_effect: Optional[dict]
    drawn_cards: Optional[list] = None
    draw_id: Optional[UUID] = None


class IntChooseRequest(BaseModel):
    draw_id: UUID
    chosen_card_id: UUID


class DiceRollRequest(BaseModel):
    faces: int


class DiceRollResponse(BaseModel):
    result: int
    faces: int


class CampaignCreate(BaseModel):
    name: str


class CampaignOut(BaseModel):
    id: UUID
    name: str
    gm_id: UUID

    model_config = {"from_attributes": True}


class CampaignMembersUpdate(BaseModel):
    add: list[UUID] = []
    remove: list[UUID] = []


class PartySummaryItem(BaseModel):
    id: UUID
    name: str
    current_hp: int
    hp_max: int
    current_mana: int
    mana_max: int
    current_ap: int
    ap_max: int
    bubble_active: bool


class GrantPointsRequest(BaseModel):
    character_ids: list[UUID]
    points: int


class RuleConfigUpdate(BaseModel):
    updates: dict[str, Any]


class ImageUploadResponse(BaseModel):
    image_url: str
    thumb_url: str
