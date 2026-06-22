import uuid
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.compute import attribute_power_tier
from app.models.items import ItemInstance, ItemTemplate
from app.services import audit_service, character_service


def _effective_fields(instance: ItemInstance) -> dict:
    fields = {}
    if instance.template:
        fields["slot_type"] = instance.template.slot_type
        fields["tier"] = instance.template.tier
        fields["required_attribute"] = instance.template.required_attribute
        fields["is_two_handed"] = instance.template.is_two_handed
        fields["stat_bonuses"] = instance.template.stat_bonuses or {}
    if instance.overrides:
        fields.update(instance.overrides)
    return fields


async def equip_item(
    session: AsyncSession,
    character_id: uuid.UUID,
    slot: str,
    item_instance_id: uuid.UUID,
    actor_id: uuid.UUID,
    is_gm: bool = False,
) -> ItemInstance:
    result = await session.execute(
        select(ItemInstance)
        .options(selectinload(ItemInstance.template))
        .where(ItemInstance.id == item_instance_id, ItemInstance.character_id == character_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    fields = _effective_fields(item)

    if not is_gm and fields.get("required_attribute"):
        from app.models.character import CharacterAttributes
        from sqlalchemy import select as sel

        attrs_result = await session.execute(
            sel(CharacterAttributes).where(CharacterAttributes.character_id == character_id)
        )
        attrs = attrs_result.scalar_one_or_none()
        if attrs:
            attr_val = getattr(attrs, fields["required_attribute"], 0)
            if attribute_power_tier(attr_val) < fields.get("tier", 0):
                raise HTTPException(status_code=422, detail="Item tier exceeds your attribute tier")

    if fields.get("is_two_handed"):
        for s in ["weapon_left", "weapon_right"]:
            res = await session.execute(
                select(ItemInstance).where(
                    ItemInstance.character_id == character_id,
                    ItemInstance.location == f"equipped:{s}",
                )
            )
            existing = res.scalar_one_or_none()
            if existing:
                existing.location = "backpack"
        item.location = "equipped:weapon_left"
        res2 = await session.execute(
            select(ItemInstance).where(
                ItemInstance.character_id == character_id,
                ItemInstance.location == "equipped:weapon_right",
            )
        )
        slot_item = res2.scalar_one_or_none()
        if not slot_item:
            dummy_slot = ItemInstance(
                character_id=character_id,
                template_id=item.template_id,
                location="equipped:weapon_right",
            )
    else:
        res = await session.execute(
            select(ItemInstance).where(
                ItemInstance.character_id == character_id,
                ItemInstance.location == f"equipped:{slot}",
            )
        )
        existing = res.scalar_one_or_none()
        if existing:
            existing.location = "backpack"
        item.location = f"equipped:{slot}"

    await audit_service.log(session, "equipment_changed", character_id, actor_id, {"slot": slot, "item_id": str(item_instance_id)})
    await character_service.recompute_derived_values(character_id, session)
    return item


async def unequip_item(
    session: AsyncSession,
    character_id: uuid.UUID,
    slot: str,
    actor_id: uuid.UUID,
) -> None:
    res = await session.execute(
        select(ItemInstance).where(
            ItemInstance.character_id == character_id,
            ItemInstance.location == f"equipped:{slot}",
        )
    )
    item = res.scalar_one_or_none()
    if item:
        item.location = "backpack"
        await audit_service.log(session, "equipment_changed", character_id, actor_id, {"slot": slot, "unequipped": True})
        await character_service.recompute_derived_values(character_id, session)
