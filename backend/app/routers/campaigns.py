from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user, require_role
from app.database import get_db
from app.models.account import Account
from app.models.campaign import Campaign, CampaignMember
from app.models.character import Character, DerivedValue, RuntimeState
from app.schemas.catalogs import CampaignCreate, CampaignMembersUpdate, CampaignOut, GrantPointsRequest, PartySummaryItem
from app.services import audit_service, character_service

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("", response_model=list[CampaignOut])
async def list_campaigns(
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    q = select(Campaign)
    if current_user.role == "gm":
        q = q.where(Campaign.gm_id == current_user.id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=CampaignOut, status_code=201)
async def create_campaign(
    body: CampaignCreate,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    campaign = Campaign(gm_id=current_user.id, name=body.name)
    db.add(campaign)
    await db.flush()
    return campaign


@router.patch("/{campaign_id}/members")
async def update_members(
    campaign_id: UUID,
    body: CampaignMembersUpdate,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if current_user.role == "gm" and campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your campaign")

    for char_id in body.add:
        existing = await db.execute(
            select(CampaignMember).where(CampaignMember.campaign_id == campaign_id, CampaignMember.character_id == char_id)
        )
        if not existing.scalar_one_or_none():
            db.add(CampaignMember(campaign_id=campaign_id, character_id=char_id))

    for char_id in body.remove:
        res2 = await db.execute(
            select(CampaignMember).where(CampaignMember.campaign_id == campaign_id, CampaignMember.character_id == char_id)
        )
        member = res2.scalar_one_or_none()
        if member:
            await db.delete(member)

    return {"status": "ok"}


@router.get("/{campaign_id}/party-summary")
async def party_summary(
    campaign_id: UUID,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    members_res = await db.execute(
        select(CampaignMember).where(CampaignMember.campaign_id == campaign_id)
    )
    member_ids = [m.character_id for m in members_res.scalars().all()]

    if not member_ids:
        return []

    chars_res = await db.execute(
        select(Character)
        .options(selectinload(Character.runtime_state), selectinload(Character.derived_values))
        .where(Character.id.in_(member_ids), Character.deleted_at.is_(None))
    )
    chars = chars_res.scalars().all()

    result = []
    for char in chars:
        dv_map = {dv.key: dv.effective_value for dv in char.derived_values}
        rs = char.runtime_state
        result.append({
            "id": str(char.id),
            "name": char.name,
            "current_hp": rs.current_hp if rs else 0,
            "hp_max": dv_map.get("hp_max", 0),
            "current_mana": rs.current_mana if rs else 0,
            "mana_max": dv_map.get("mana_max", 0),
            "current_ap": rs.current_ap if rs else 0,
            "ap_max": dv_map.get("ap_max", 0),
            "bubble_active": rs.bubble_active if rs else False,
        })
    return result


@router.post("/{campaign_id}/grant-points")
async def grant_points(
    campaign_id: UUID,
    body: GrantPointsRequest,
    current_user: Account = Depends(require_role("gm", "admin")),
    db: AsyncSession = Depends(get_db),
):
    members_res = await db.execute(
        select(CampaignMember.character_id).where(CampaignMember.campaign_id == campaign_id)
    )
    member_ids = {row[0] for row in members_res.all()}

    for char_id in body.character_ids:
        if char_id not in member_ids:
            raise HTTPException(status_code=422, detail=f"Character {char_id} is not a member of this campaign")

    for char_id in body.character_ids:
        char = await character_service.get_character_or_404(db, char_id)
        char.unallocated_points += body.points
        await audit_service.log(db, "points_granted", char_id, current_user.id, {"points": body.points, "campaign_id": str(campaign_id)})

    return {"granted": len(body.character_ids), "points": body.points}
