import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

SLOT_TYPES = ["head", "body", "legs", "vambraces", "weapon_left", "weapon_right", "ring", "amulet", "pet"]
ATTRIBUTE_NAMES = ["strength", "dexterity", "intelligence", "spirit", "endurance", "luck"]


class ItemTemplate(Base):
    __tablename__ = "item_template"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slot_type: Mapped[str] = mapped_column(
        Enum(*SLOT_TYPES, name="slot_type_enum"), nullable=False
    )
    weapon_family: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_two_handed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tier: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    required_attribute: Mapped[Optional[str]] = mapped_column(
        Enum(*ATTRIBUTE_NAMES, name="attribute_enum"), nullable=True
    )
    damage_dice: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bonus_crit_dice: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    scaling_attribute: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    scaling_coefficient: Mapped[Optional[float]] = mapped_column(Numeric(6, 4), nullable=True)
    stat_bonuses: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    granted_ability_ids: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    hunger_restored: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reference_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ItemInstance(Base):
    __tablename__ = "item_instance"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), nullable=False, index=True)
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("item_template.id"), nullable=True)
    overrides: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    acquired_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    location: Mapped[str] = mapped_column(String(50), default="backpack", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    character = relationship("Character", back_populates="items")
    template = relationship("ItemTemplate")
