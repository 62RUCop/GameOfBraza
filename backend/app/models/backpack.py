import uuid
from typing import Optional

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

ITEM_TYPES = ["food", "scroll", "herb", "potion", "misc", "quest", "other"]


class BackpackSlot(Base):
    __tablename__ = "backpack_slot"

    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), primary_key=True)
    slot_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    item_type: Mapped[str] = mapped_column(
        Enum(*ITEM_TYPES, name="backpack_item_type"), nullable=False, default="misc"
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    character = relationship("Character", back_populates="backpack_slots")
