import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Character(Base):
    __tablename__ = "character"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("account.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    race_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("race.id"), nullable=True)
    is_npc: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("campaign.id"), nullable=True)
    appearance_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    quenta: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    main_quest: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quest_progress_stage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    player_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unallocated_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    owner = relationship("Account", back_populates="characters", foreign_keys=[owner_id])
    race = relationship("Race")
    attributes = relationship("CharacterAttributes", back_populates="character", uselist=False, cascade="all, delete-orphan")
    derived_values = relationship("DerivedValue", back_populates="character", cascade="all, delete-orphan")
    runtime_state = relationship("RuntimeState", back_populates="character", uselist=False, cascade="all, delete-orphan")
    items = relationship("ItemInstance", back_populates="character", cascade="all, delete-orphan")
    skills = relationship("CharacterSkill", back_populates="character", cascade="all, delete-orphan")
    backpack_slots = relationship("BackpackSlot", back_populates="character", cascade="all, delete-orphan")
    currency = relationship("Currency", back_populates="character", uselist=False, cascade="all, delete-orphan")
    reputations = relationship("Reputation", back_populates="character", cascade="all, delete-orphan")
    pet = relationship("Pet", back_populates="character", uselist=False, cascade="all, delete-orphan")
    class_bonuses = relationship("ClassBonusRecord", back_populates="character", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="character", cascade="all, delete-orphan")


class CharacterAttributes(Base):
    __tablename__ = "character_attributes"

    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), primary_key=True)
    strength: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    dexterity: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    intelligence: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    spirit: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    endurance: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    luck: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)

    character = relationship("Character", back_populates="attributes")


DERIVED_VALUE_KEYS = ["hp_max", "mana_max", "ap_max", "dodge", "armor", "slots", "bubble_charges", "luck_class_crit_bonus"]


class DerivedValue(Base):
    __tablename__ = "derived_value"

    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), primary_key=True)
    key: Mapped[str] = mapped_column(
        Enum("hp_max", "mana_max", "ap_max", "dodge", "armor", "slots", "bubble_charges", "luck_class_crit_bonus", name="derived_value_key"),
        primary_key=True,
    )
    computed_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    override_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    manual_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    override_author_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("account.id"), nullable=True)
    override_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    character = relationship("Character", back_populates="derived_values")
    override_author = relationship("Account", foreign_keys=[override_author_id])

    @property
    def effective_value(self) -> int:
        return self.override_value if self.manual_override and self.override_value is not None else self.computed_value


class RuntimeState(Base):
    __tablename__ = "runtime_state"

    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), primary_key=True)
    current_hp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_mana: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_ap: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    satiety_current: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bubble_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bubble_persist_chance_current: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_effects: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    character = relationship("Character", back_populates="runtime_state")
