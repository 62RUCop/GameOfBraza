import math
import random


def attribute_power_tier(value: int) -> int:
    if value < 3:
        return 0
    return min(4, math.floor((value - 3) / 3) + 1)


def hp_max(str_value: int, hp_class_bonus: int, hp_per_str: int) -> int:
    return str_value * hp_per_str + hp_class_bonus


def mana_max(spi_value: int, mana_class_bonus: int, mana_per_spi: int) -> int:
    return spi_value * mana_per_spi + mana_class_bonus


def ap_max(end_value: int, ap_class_bonus: int, ap_per_end: int) -> int:
    return end_value * ap_per_end + ap_class_bonus


def slots(int_value: int) -> int:
    return int_value


def satiety_bounds(str_val: int, end_val: int, hp_max_val: int) -> tuple[int, int]:
    return (-hp_max_val, str_val + end_val)


def bubble_persist_chance(charges: int) -> int:
    return min(100, charges * 10)


def class_threshold_index(attr_value: int, thresholds: list[int]) -> int:
    result = -1
    for i, threshold in enumerate(thresholds):
        if attr_value >= threshold:
            result = i
    return result


def tier_to_dice(tier: int) -> str:
    mapping = {0: "d4", 1: "d6", 2: "d12", 3: "d20", 4: "d60", 5: "d100"}
    return mapping.get(tier, "d4")


def roll_dice(faces: int) -> int:
    return random.randint(1, faces)


def point_buy_cost(from_val: int, to_val: int) -> int:
    """Total cost to move an attribute from from_val to to_val (positive = increase)."""
    cost = 0
    if to_val > from_val:
        for v in range(from_val, to_val):
            cost += 1 if v < 3 else v - 2
    else:
        for v in range(to_val, from_val):
            cost -= 1 if v < 3 else v - 2
    return cost


REPUTATION_RANGES = [
    (-10, -8, "Враг"),
    (-7, -5, "Ненависть"),
    (-4, -2, "Недоверие"),
    (-1, -1, "Подозрение"),
    (0, 0, "Незнакомец"),
    (1, 3, "Нейтралитет"),
    (4, 6, "Симпатия"),
    (7, 9, "Уважение"),
    (10, 10, "Союзник"),
]


def reputation_range_label(value: int) -> str:
    for lo, hi, label in REPUTATION_RANGES:
        if lo <= value <= hi:
            return label
    return "Незнакомец"


def food_required_next(level: int, base_pet_food_unit: int) -> int:
    return base_pet_food_unit * (2 ** (level - 1))
