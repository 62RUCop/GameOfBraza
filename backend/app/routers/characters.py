from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user, require_role
from app.database import get_db
from app.models.account import Account
from app.models.character import Character, CharacterAttributes, DerivedValue
from app.schemas.characters import (
    AllocatePreview,
    AllocateRequest,
    CharacterCreate,
    CharacterDescriptionUpdate,
    CharacterListItem,
    CharacterOut,
    GrantPointsRequest,
    OverrideRequest,
    RuntimeUpdate,
)
from app.services import audit_service, character_service
from app.services.runtime_service import bubble_hit, location_transition, update_runtime

router = APIRouter(prefix="/characters", tags=["characters"])


@router.get("", response_model=list[CharacterListItem])
async def list_characters(
    account_id: UUID | None = None,
    is_npc: bool | None = None,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Character).where(Character.deleted_at.is_(None))
    if current_user.role == "player":
        q = q.where(Character.owner_id == current_user.id)
    elif account_id:
        q = q.where(Character.owner_id == account_id)
    if is_npc is not None:
        q = q.where(Character.is_npc == is_npc)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=CharacterOut, status_code=201)
async def create_character(
    body: CharacterCreate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.is_npc and current_user.role not in ("gm", "admin"):
        raise HTTPException(status_code=403, detail="Only GM/admin can create NPCs")

    attrs_dict = body.attributes.model_dump()

    if not body.is_npc or current_user.role == "player":
        character_service.validate_point_buy(attrs_dict)

    char = Character(owner_id=current_user.id, name=body.name, race_id=body.race_id, is_npc=body.is_npc)
    db.add(char)
    await db.flush()

    await character_service.initialize_character(db, char)
    await db.flush()

    attrs_res = await db.execute(select(CharacterAttributes).where(CharacterAttributes.character_id == char.id))
    attrs = attrs_res.scalar_one()
    for k, v in attrs_dict.items():
        setattr(attrs, k, v)

    await character_service.recompute_derived_values(char.id, db)
    await db.flush()

    return await character_service.get_character_or_404(db, char.id)


@router.get("/{character_id}", response_model=CharacterOut)
async def get_character(
    character_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await character_service.check_character_access(db, character_id, current_user)


@router.patch("/{character_id}/description", response_model=CharacterOut)
async def update_description(
    character_id: UUID,
    body: CharacterDescriptionUpdate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    char = await character_service.check_character_access(db, character_id, current_user)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(char, field, value)
    return char


@router.post("/{character_id}/attributes/allocate")
async def allocate_attribute(
    character_id: UUID,
    body: AllocateRequest,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    char = await character_service.check_character_access(db, character_id, current_user)

    if current_user.role == "player" and body.delta < 0:
        raise HTTPException(status_code=403, detail="Players cannot lower attributes")

    attrs_res = await db.execute(select(CharacterAttributes).where(CharacterAttributes.character_id == character_id))
    attrs = attrs_res.scalar_one_or_none()
    if not attrs:
        raise HTTPException(status_code=404, detail="Attributes not found")

    valid_attrs = {"strength", "dexterity", "intelligence", "spirit", "endurance", "luck"}
    if body.attribute not in valid_attrs:
        raise HTTPException(status_code=422, detail="Invalid attribute name")

    current_val = getattr(attrs, body.attribute)
    new_val = current_val + body.delta
    cost = character_service.point_buy_cost(current_val, new_val)

    if not body.confirmed:
        return AllocatePreview(cost=cost, new_value=new_val, remaining_points=char.unallocated_points - cost)

    if cost > char.unallocated_points:
        raise HTTPException(status_code=422, detail="Insufficient unallocated points")

    setattr(attrs, body.attribute, new_val)
    char.unallocated_points -= cost
    await character_service.recompute_derived_values(character_id, db)
    await audit_service.log(db, "attribute_allocated", character_id, current_user.id, {"attribute": body.attribute, "delta": body.delta, "cost": cost})

    return await character_service.get_character_or_404(db, character_id)


@router.post("/{character_id}/attributes/grant-points")
async def grant_points(
    character_id: UUID,
    body: GrantPointsRequest,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    char = await character_service.get_character_or_404(db, character_id)
    char.unallocated_points += body.points
    await audit_service.log(db, "points_granted", character_id, current_user.id, {"points": body.points})
    return {"unallocated_points": char.unallocated_points}


@router.patch("/{character_id}/stats/{key}/override")
async def override_stat(
    character_id: UUID,
    key: str,
    body: OverrideRequest,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(DerivedValue).where(DerivedValue.character_id == character_id, DerivedValue.key == key)
    )
    dv = res.scalar_one_or_none()
    if not dv:
        raise HTTPException(status_code=404, detail="Derived value not found")

    if body.reset:
        dv.manual_override = False
        dv.override_value = None
        dv.override_author_id = None
        dv.override_at = None
        await character_service.recompute_derived_values(character_id, db)
        await audit_service.log(db, "override_reset", character_id, current_user.id, {"key": key})
    else:
        dv.manual_override = True
        dv.override_value = body.value
        dv.override_author_id = current_user.id
        dv.override_at = datetime.now(timezone.utc)
        await audit_service.log(db, "attribute_overridden", character_id, current_user.id, {"key": key, "value": body.value})

    return dv


@router.patch("/{character_id}/runtime")
async def patch_runtime(
    character_id: UUID,
    body: RuntimeUpdate,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    updates = body.model_dump(exclude_none=True)
    return await update_runtime(db, character_id, updates)


@router.post("/{character_id}/runtime/location-transition")
async def do_location_transition(
    character_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    return await location_transition(db, character_id, current_user.id)


@router.post("/{character_id}/runtime/bubble-hit")
async def do_bubble_hit(
    character_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await character_service.check_character_access(db, character_id, current_user)
    return await bubble_hit(db, character_id, current_user.id)


@router.delete("/{character_id}", status_code=204)
async def delete_character(
    character_id: UUID,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    char = await character_service.get_character_or_404(db, character_id)
    char.deleted_at = datetime.now(timezone.utc)


@router.get("/{character_id}/audit-log")
async def get_audit_log(
    character_id: UUID,
    action_type: str | None = None,
    since: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.models.audit import AuditLog
    q = select(AuditLog).where(AuditLog.character_id == character_id)
    if action_type:
        q = q.where(AuditLog.action_type == action_type)
    if since:
        q = q.where(AuditLog.created_at >= since)
    q = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()
