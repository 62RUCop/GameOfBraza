import uuid

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Reputation(Base):
    __tablename__ = "reputation"

    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), primary_key=True)
    faction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("faction.id"), primary_key=True)
    value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    character = relationship("Character", back_populates="reputations")
    faction = relationship("Faction")
