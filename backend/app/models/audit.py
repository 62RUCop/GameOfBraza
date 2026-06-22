import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

AUDIT_ACTION_TYPES = [
    "attribute_allocated",
    "attribute_overridden",
    "override_reset",
    "points_granted",
    "equipment_changed",
    "skill_added",
    "skill_removed",
    "currency_transaction",
    "reputation_changed",
    "class_bonus_applied",
    "pet_fed",
    "location_transition",
    "bubble_hit",
]


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("character.id"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(
        Enum(*AUDIT_ACTION_TYPES, name="audit_action_type"), nullable=False
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("account.id"), nullable=False)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    character = relationship("Character", back_populates="audit_logs")
    actor = relationship("Account", foreign_keys=[actor_id])
