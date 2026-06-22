import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Pet(Base):
    __tablename__ = "pet"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    species: Mapped[str] = mapped_column(String(100), nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    food_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stat_bonuses: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ability_skill_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("skill.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    character = relationship("Character", back_populates="pet")
    ability_skill = relationship("Skill", foreign_keys=[ability_skill_id])
