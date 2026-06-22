import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ClassBonusRecord(Base):
    __tablename__ = "class_bonus_record"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), nullable=False)
    attribute: Mapped[str] = mapped_column(
        Enum("strength", "dexterity", "intelligence", "spirit", "endurance", "luck", name="class_bonus_attr"),
        nullable=False,
    )
    class_index: Mapped[int] = mapped_column(Integer, nullable=False)
    dice_formula: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    rolled_values: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    rolled_sum: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    resulting_effect: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    wild_magic_draw_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("wild_magic_draw.id"), nullable=True)

    character = relationship("Character", back_populates="class_bonuses")
    wild_magic_draw = relationship("WildMagicDraw", back_populates="class_bonus_record")


class WildMagicDraw(Base):
    __tablename__ = "wild_magic_draw"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), nullable=False)
    drawn_card_ids: Mapped[list] = mapped_column(JSONB, nullable=False)
    chosen_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("wild_magic_card.id"), nullable=True)
    drawn_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    chosen_card = relationship("WildMagicCard", foreign_keys=[chosen_card_id])
    class_bonus_record = relationship("ClassBonusRecord", back_populates="wild_magic_draw", uselist=False)
