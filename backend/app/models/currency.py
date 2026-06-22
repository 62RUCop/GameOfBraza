import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Currency(Base):
    __tablename__ = "currency"

    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), primary_key=True)
    balance_bronze: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)

    character = relationship("Character", back_populates="currency")


class CurrencyTransaction(Base):
    __tablename__ = "currency_transaction"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), nullable=False, index=True)
    amount_bronze: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    money_target: Mapped[str] = mapped_column(String(500), nullable=False)
    related_item_instance_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("item_instance.id"), nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("account.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    created_by = relationship("Account", foreign_keys=[created_by_id])
