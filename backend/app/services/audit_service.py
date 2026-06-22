import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log(
    session: AsyncSession,
    action_type: str,
    character_id: uuid.UUID,
    actor_id: uuid.UUID,
    payload: Optional[dict] = None,
) -> None:
    entry = AuditLog(
        character_id=character_id,
        action_type=action_type,
        actor_id=actor_id,
        payload=payload,
    )
    session.add(entry)
