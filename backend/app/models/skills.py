import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Skill(Base):
    __tablename__ = "skill"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    skill_type: Mapped[str] = mapped_column(
        Enum("innate", "acquired", name="skill_type_enum"), default="acquired", nullable=False
    )
    occupies_slot: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tier: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    guild_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    tied_attribute: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mana_cost: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ap_cost: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class CharacterSkill(Base):
    __tablename__ = "character_skill"

    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), primary_key=True)
    skill_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("skill.id"), primary_key=True)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    character = relationship("Character", back_populates="skills")
    skill = relationship("Skill")


class CharacterSkillTag(Base):
    __tablename__ = "character_skill_tag"
    __table_args__ = (UniqueConstraint("character_id", "skill_id"),)

    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), primary_key=True)
    skill_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("skill.id"), primary_key=True)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("skill_category.id"), nullable=True)

    category = relationship("SkillCategory")
