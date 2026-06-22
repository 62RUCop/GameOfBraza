import random
import uuid
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.compute import roll_dice, tier_to_dice
from app.core import rule_config
from app.models.class_bonus import ClassBonusRecord, WildMagicDraw
from app.models.catalogs import WildMagicCard
from app.models.character import DerivedValue
from app.services import audit_service, character_service


ATTRIBUTE_MAP = {
    "strength": "strength",
    "dexterity": "dexterity",
    "intelligence": "intelligence",
    "spirit": "spirit",
    "endurance": "endurance",
    "luck": "luck",
}


async def get_next_class_index(session: AsyncSession, character_id: uuid.UUID, attribute: str) -> int:
    result = await session.execute(
        select(ClassBonusRecord)
        .where(ClassBonusRecord.character_id == character_id, ClassBonusRecord.attribute == attribute)
        .order_by(ClassBonusRecord.class_index)
    )
    existing = result.scalars().all()
    expected = list(range(len(existing)))
    for i, rec in enumerate(existing):
        if rec.class_index != i:
            raise HTTPException(status_code=409, detail="Class bonus records are inconsistent")
    return len(existing)


async def roll_class_bonus(
    session: AsyncSession,
    character_id: uuid.UUID,
    attribute: str,
    actor_id: uuid.UUID,
) -> dict:
    if attribute not in ATTRIBUTE_MAP:
        raise HTTPException(status_code=422, detail="Invalid attribute")

    cfg = rule_config.get_all()
    thresholds = cfg.get("class_thresholds", [6, 9, 12, 20])

    class_index = await get_next_class_index(session, character_id, attribute)
    if class_index >= len(thresholds):
        raise HTTPException(status_code=409, detail="Max class bonuses already claimed for this attribute")

    result = {"attribute": attribute, "class_index": class_index}

    if attribute == "strength":
        n_dice = class_index + 1
        rolls = [roll_dice(6) for _ in range(n_dice)]
        s = sum(rolls)
        record = ClassBonusRecord(
            character_id=character_id, attribute=attribute, class_index=class_index,
            dice_formula=f"{n_dice}D6", rolled_values=rolls, rolled_sum=s,
            resulting_effect={"hp_bonus": s},
        )
        session.add(record)
        result.update({"dice_formula": f"{n_dice}D6", "rolled_values": rolls, "rolled_sum": s, "resulting_effect": {"hp_bonus": s}})
        await character_service.recompute_derived_values(character_id, session)

    elif attribute == "dexterity":
        n_dice = class_index + 1
        rolls = [roll_dice(4) for _ in range(n_dice)]
        s = sum(rolls)
        record = ClassBonusRecord(
            character_id=character_id, attribute=attribute, class_index=class_index,
            dice_formula=f"{n_dice}D4", rolled_values=rolls, rolled_sum=s,
            resulting_effect={"dodge_bonus": s},
        )
        session.add(record)
        result.update({"dice_formula": f"{n_dice}D4", "rolled_values": rolls, "rolled_sum": s, "resulting_effect": {"dodge_bonus": s}})
        await character_service.recompute_derived_values(character_id, session)

    elif attribute == "intelligence":
        n_cards = 2 * class_index + 4
        cards_result = await session.execute(
            select(WildMagicCard).where(WildMagicCard.deleted_at.is_(None))
        )
        all_cards = cards_result.scalars().all()
        if len(all_cards) < n_cards:
            n_cards = len(all_cards)
        drawn = random.sample(all_cards, min(n_cards, len(all_cards)))
        draw = WildMagicDraw(
            character_id=character_id,
            drawn_card_ids=[str(c.id) for c in drawn],
        )
        session.add(draw)
        await session.flush()
        result.update({"draw_id": draw.id, "drawn_cards": [{"id": str(c.id), "name": c.name, "description": c.description} for c in drawn]})

    elif attribute == "endurance":
        dice_type = tier_to_dice(class_index)
        faces = int(dice_type[1:])
        r = roll_dice(faces)
        record = ClassBonusRecord(
            character_id=character_id, attribute=attribute, class_index=class_index,
            dice_formula=f"1{dice_type}", rolled_values=[r], rolled_sum=r,
            resulting_effect={"armor_bonus": r},
        )
        session.add(record)
        result.update({"dice_formula": f"1{dice_type}", "rolled_values": [r], "rolled_sum": r, "resulting_effect": {"armor_bonus": r}})
        await character_service.recompute_derived_values(character_id, session)

    elif attribute == "spirit":
        record = ClassBonusRecord(
            character_id=character_id, attribute=attribute, class_index=class_index,
            resulting_effect={"bubble_charges": 1},
        )
        session.add(record)
        result.update({"resulting_effect": {"bubble_charges": 1}})
        await character_service.recompute_derived_values(character_id, session)

    elif attribute == "luck":
        record = ClassBonusRecord(
            character_id=character_id, attribute=attribute, class_index=class_index,
            resulting_effect={"luck_class_crit_bonus": 1},
        )
        session.add(record)
        result.update({"resulting_effect": {"luck_class_crit_bonus": 1}})
        await character_service.recompute_derived_values(character_id, session)

    await audit_service.log(session, "class_bonus_applied", character_id, actor_id, {"attribute": attribute, "class_index": class_index})
    return result


async def choose_wild_magic(
    session: AsyncSession,
    character_id: uuid.UUID,
    draw_id: uuid.UUID,
    chosen_card_id: uuid.UUID,
    actor_id: uuid.UUID,
) -> ClassBonusRecord:
    draw_res = await session.execute(select(WildMagicDraw).where(WildMagicDraw.id == draw_id))
    draw = draw_res.scalar_one_or_none()
    if not draw:
        raise HTTPException(status_code=404, detail="Draw not found")
    if str(chosen_card_id) not in draw.drawn_card_ids:
        raise HTTPException(status_code=422, detail="Chosen card not in draw")

    card_res = await session.execute(select(WildMagicCard).where(WildMagicCard.id == chosen_card_id))
    card = card_res.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    draw.chosen_card_id = chosen_card_id

    existing_index = await get_next_class_index(session, character_id, "intelligence")
    record = ClassBonusRecord(
        character_id=character_id,
        attribute="intelligence",
        class_index=existing_index,
        resulting_effect={"wild_magic_card": str(chosen_card_id), "effect": card.effect_json},
        wild_magic_draw_id=draw_id,
    )
    session.add(record)
    await audit_service.log(session, "class_bonus_applied", character_id, actor_id, {"attribute": "intelligence", "card_id": str(chosen_card_id)})
    return record
