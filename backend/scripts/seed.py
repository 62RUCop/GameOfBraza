"""Seed database with default data. Idempotent - safe to run multiple times."""
import asyncio
import sys
from datetime import datetime, timezone

sys.path.insert(0, "/app")

from sqlalchemy import select

from app.core.auth import hash_password
from app.core import rule_config as rule_config_cache
from app.database import AsyncSessionLocal
from app.models.account import Account
from app.models.catalogs import Faction, Race, SkillCategory, WildMagicCard
from app.models.rule_config_model import RuleConfigEntry
from app.models.skills import Skill


DEFAULT_RULE_CONFIG = {
    "hp_per_str": 4,
    "mana_per_spi": 10,
    "ap_per_end": 10,
    "class_thresholds": [6, 9, 12, 20],
    "base_pet_food_unit": 3,
    "point_buy_base_points": 3,
    "reputation_price_curves": {
        "default": [1.5, 1.0, 0.5, 0.25],
        "ranged_weapon": [1.5, 1.0, 0.75, 0.5],
    },
}


async def seed():
    async with AsyncSessionLocal() as session:
        # Accounts
        for email, password, role in [
            ("admin@gameofbraza.local", "admin", "admin"),
            ("gm@gameofbraza.local", "gm", "gm"),
            ("player@gameofbraza.local", "player", "player"),
        ]:
            res = await session.execute(select(Account).where(Account.email == email))
            if not res.scalar_one_or_none():
                session.add(Account(email=email, hashed_password=hash_password(password), role=role))
                print(f"Created account: {email}")

        # RuleConfig
        for key, value in DEFAULT_RULE_CONFIG.items():
            res = await session.execute(select(RuleConfigEntry).where(RuleConfigEntry.key == key))
            if not res.scalar_one_or_none():
                session.add(RuleConfigEntry(key=key, value=value, updated_at=datetime.now(timezone.utc)))
                print(f"Created rule config: {key}")

        # Races
        for race_name in ["Человек", "Эльф", "Гном"]:
            res = await session.execute(select(Race).where(Race.name == race_name))
            if not res.scalar_one_or_none():
                session.add(Race(name=race_name))
                print(f"Created race: {race_name}")

        # Factions
        for faction_name, desc in [
            ("Торговая гильдия", "Купцы и торговцы"),
            ("Орден стражей", "Защитники мирных жителей"),
        ]:
            res = await session.execute(select(Faction).where(Faction.name == faction_name))
            if not res.scalar_one_or_none():
                session.add(Faction(name=faction_name, description=desc))
                print(f"Created faction: {faction_name}")

        # Skill categories
        for cat_name in ["Боевые", "Магические", "Социальные", "Пассивные", "Гильдейские"]:
            res = await session.execute(select(SkillCategory).where(SkillCategory.name == cat_name))
            if not res.scalar_one_or_none():
                session.add(SkillCategory(name=cat_name))
                print(f"Created skill category: {cat_name}")

        # Wild magic cards
        for i, (card_name, card_desc) in enumerate([
            ("Вихрь хаоса", "Все вокруг получают 1d6 урона"),
            ("Удача судьбы", "+2 к следующему броску"),
            ("Щит из эфира", "Создаёт пузырь защиты"),
            ("Ярость тьмы", "Следующая атака наносит двойной урон"),
            ("Исцеление хаоса", "Восстанавливает 1d8 HP"),
            ("Туман иллюзий", "Противники промахиваются с 50% шансом"),
            ("Стрела молнии", "Наносит 2d6 урона молнией"),
            ("Благословение хаоса", "+1 ко всем атрибутам на 1 час"),
            ("Проклятие рока", "Противник получает -2 ко всем броскам"),
            ("Зеркало судьбы", "Отражает следующее заклинание"),
        ]):
            res = await session.execute(select(WildMagicCard).where(WildMagicCard.name == card_name))
            if not res.scalar_one_or_none():
                session.add(WildMagicCard(name=card_name, description=card_desc, effect_json={"type": "chaos", "index": i}))
                print(f"Created wild magic card: {card_name}")

        # Skills
        for skill_name, tier, occupies, skill_type in [
            ("Удар мечом", 0, True, "acquired"),
            ("Огненный шар", 1, True, "acquired"),
            ("Торговля", 0, True, "acquired"),
            ("Скрытность", 1, True, "acquired"),
            ("Стойкость", 0, False, "innate"),
        ]:
            res = await session.execute(select(Skill).where(Skill.name == skill_name))
            if not res.scalar_one_or_none():
                session.add(Skill(name=skill_name, tier=tier, occupies_slot=occupies, skill_type=skill_type))
                print(f"Created skill: {skill_name}")

        await session.commit()
        rule_config_cache.set_all(DEFAULT_RULE_CONFIG)
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
