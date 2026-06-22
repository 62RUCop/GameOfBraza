import asyncio
from typing import Any, Optional

_cache: dict[str, Any] = {}
_loaded = False

DEFAULT_CONFIG = {
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

KNOWN_KEYS = set(DEFAULT_CONFIG.keys())


def get(key: str, default: Any = None) -> Any:
    return _cache.get(key, DEFAULT_CONFIG.get(key, default))


def get_all() -> dict[str, Any]:
    merged = {**DEFAULT_CONFIG, **_cache}
    return merged


def set_all(data: dict[str, Any]) -> None:
    _cache.update(data)


def invalidate() -> None:
    _cache.clear()


async def load_from_db(session) -> None:
    global _loaded
    from sqlalchemy import select
    from app.models.rule_config_model import RuleConfigEntry

    result = await session.execute(select(RuleConfigEntry))
    for row in result.scalars():
        _cache[row.key] = row.value
    _loaded = True
