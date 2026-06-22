from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user, require_role
from app.core.compute import reputation_range_label
from app.core import rule_config
from app.database import get_db
from app.models.account import Account
from app.models.catalogs import Faction
from app.models.reputation import Reputation
from app.schemas.catalogs import ReputationUpdate
from app.services import audit_service, character_service

router = APIRouter(prefix="/characters/{character_id}/reputation", tags=["reputation"])


@router.get("")
async def list_reputation(
    character_id: UUID,
    item_category: str | None = None,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    factions_res = await db.execute(select(Faction).where(Faction.deleted_at.is_(None)))
    factions = factions_res.scalars().all()

    rep_res = await db.execute(select(Reputation).where(Reputation.character_id == character_id))
    rep_map = {r.faction_id: r.value for r in rep_res.scalars().all()}

    cfg = rule_config.get_all()
    curves = cfg.get("reputation_price_curves", {})
    curve = curves.get(item_category or "default", curves.get("default", [1.5, 1.0, 0.5, 0.25]))

    result = []
    for faction in factions:
        value = rep_map.get(faction.id, 0)
        label = reputation_range_label(value)
        idx = min(3, max(0, (value + 10) // 5))
        multiplier = curve[idx] if curve else 1.0
        result.append({
            "faction": {"id": str(faction.id), "name": faction.name, "description": faction.description, "icon_url": faction.icon_url},
            "value": value,
            "range_label": label,
            "price_multiplier": multiplier,
        })
    return result


@router.patch("/{faction_id}")
async def update_reputation(
    character_id: UUID,
    faction_id: UUID,
    body: ReputationUpdate,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    if not -10 <= body.value <= 10:
        raise HTTPException(status_code=422, detail="Reputation value must be between -10 and 10")

    res = await db.execute(
        select(Reputation).where(Reputation.character_id == character_id, Reputation.faction_id == faction_id)
    )
    rep = res.scalar_one_or_none()
    if rep:
        rep.value = body.value
    else:
        rep = Reputation(character_id=character_id, faction_id=faction_id, value=body.value)
        db.add(rep)

    await audit_service.log(db, "reputation_changed", character_id, current_user.id, {"faction_id": str(faction_id), "value": body.value})
    return {"faction_id": str(faction_id), "value": body.value, "range_label": reputation_range_label(body.value)}
