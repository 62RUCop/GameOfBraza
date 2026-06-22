// ignore_for_file: non_constant_identifier_names

// ── Account ──────────────────────────────────────────────────────────────────

class Account {
  final String id;
  final String email;
  final String role;
  final bool gmSkipConfirmation;

  const Account({
    required this.id,
    required this.email,
    required this.role,
    required this.gmSkipConfirmation,
  });

  factory Account.fromJson(Map<String, dynamic> j) => Account(
        id: j['id'] as String,
        email: j['email'] as String,
        role: j['role'] as String,
        gmSkipConfirmation: j['gm_skip_confirmation'] as bool? ?? false,
      );

  bool get isPlayer => role == 'player';
  bool get isGm => role == 'gm';
  bool get isAdmin => role == 'admin';
  bool get isGmOrAdmin => isGm || isAdmin;
  bool get canEdit => isGm || isAdmin;
}

// ── Tokens ───────────────────────────────────────────────────────────────────

class TokenResponse {
  final String accessToken;
  final String refreshToken;

  const TokenResponse({required this.accessToken, required this.refreshToken});

  factory TokenResponse.fromJson(Map<String, dynamic> j) => TokenResponse(
        accessToken: j['access_token'] as String,
        refreshToken: j['refresh_token'] as String,
      );
}

// ── Character list item ───────────────────────────────────────────────────────

class CharacterListItem {
  final String id;
  final String name;
  final String? raceId;
  final bool isNpc;
  final String? appearanceImageUrl;
  final int unallocatedPoints;

  const CharacterListItem({
    required this.id,
    required this.name,
    this.raceId,
    required this.isNpc,
    this.appearanceImageUrl,
    required this.unallocatedPoints,
  });

  factory CharacterListItem.fromJson(Map<String, dynamic> j) =>
      CharacterListItem(
        id: j['id'] as String,
        name: j['name'] as String,
        raceId: j['race_id'] as String?,
        isNpc: j['is_npc'] as bool? ?? false,
        appearanceImageUrl: j['appearance_image_url'] as String?,
        unallocatedPoints: j['unallocated_points'] as int? ?? 0,
      );
}

// ── Attributes ────────────────────────────────────────────────────────────────

class Attributes {
  final int strength;
  final int dexterity;
  final int intelligence;
  final int spirit;
  final int endurance;
  final int luck;

  const Attributes({
    required this.strength,
    required this.dexterity,
    required this.intelligence,
    required this.spirit,
    required this.endurance,
    required this.luck,
  });

  factory Attributes.fromJson(Map<String, dynamic> j) => Attributes(
        strength: j['strength'] as int? ?? 3,
        dexterity: j['dexterity'] as int? ?? 3,
        intelligence: j['intelligence'] as int? ?? 3,
        spirit: j['spirit'] as int? ?? 3,
        endurance: j['endurance'] as int? ?? 3,
        luck: j['luck'] as int? ?? 3,
      );

  Map<String, int> get asMap => {
        'strength': strength,
        'dexterity': dexterity,
        'intelligence': intelligence,
        'spirit': spirit,
        'endurance': endurance,
        'luck': luck,
      };

  static const labels = {
    'strength': 'СИЛ',
    'dexterity': 'ЛОВ',
    'intelligence': 'ИНТ',
    'spirit': 'ДУХ',
    'endurance': 'ВЫН',
    'luck': 'УДЧ',
  };

  static const fullLabels = {
    'strength': 'Сила',
    'dexterity': 'Ловкость',
    'intelligence': 'Интеллект',
    'spirit': 'Дух',
    'endurance': 'Выносливость',
    'luck': 'Удача',
  };
}

// ── DerivedValue ──────────────────────────────────────────────────────────────

class DerivedValue {
  final String key;
  final int computedValue;
  final int? overrideValue;
  final bool manualOverride;
  final int effectiveValue;
  final String? overrideAuthorId;
  final String? overrideAt;

  const DerivedValue({
    required this.key,
    required this.computedValue,
    this.overrideValue,
    required this.manualOverride,
    required this.effectiveValue,
    this.overrideAuthorId,
    this.overrideAt,
  });

  factory DerivedValue.fromJson(Map<String, dynamic> j) => DerivedValue(
        key: j['key'] as String,
        computedValue: j['computed_value'] as int? ?? 0,
        overrideValue: j['override_value'] as int?,
        manualOverride: j['manual_override'] as bool? ?? false,
        effectiveValue: j['effective_value'] as int? ?? 0,
        overrideAuthorId: j['override_author_id'] as String?,
        overrideAt: j['override_at'] as String?,
      );

  static const labels = {
    'hp_max': 'HP макс.',
    'mana_max': 'Мана макс.',
    'ap_max': 'ОД макс.',
    'dodge': 'Уклонение',
    'armor': 'Броня',
    'slots': 'Слоты',
  };
}

// ── RuntimeState ──────────────────────────────────────────────────────────────

class RuntimeState {
  final int currentHp;
  final int currentMana;
  final int currentAp;
  final int satietyCurrent;
  final bool bubbleActive;
  final int bubblePersistChanceCurrent;

  const RuntimeState({
    required this.currentHp,
    required this.currentMana,
    required this.currentAp,
    required this.satietyCurrent,
    required this.bubbleActive,
    required this.bubblePersistChanceCurrent,
  });

  factory RuntimeState.fromJson(Map<String, dynamic> j) => RuntimeState(
        currentHp: j['current_hp'] as int? ?? 0,
        currentMana: j['current_mana'] as int? ?? 0,
        currentAp: j['current_ap'] as int? ?? 0,
        satietyCurrent: j['satiety_current'] as int? ?? 0,
        bubbleActive: j['bubble_active'] as bool? ?? false,
        bubblePersistChanceCurrent:
            j['bubble_persist_chance_current'] as int? ?? 0,
      );
}

// ── Character ─────────────────────────────────────────────────────────────────

class Character {
  final String id;
  final String ownerId;
  final String name;
  final String? raceId;
  final bool isNpc;
  final String? campaignId;
  final String? appearanceImageUrl;
  final String? quenta;
  final String? mainQuest;
  final int questProgressStage;
  final String? playerNotes;
  final int unallocatedPoints;
  final Attributes? attributes;
  final List<DerivedValue> derivedValues;
  final RuntimeState? runtimeState;

  const Character({
    required this.id,
    required this.ownerId,
    required this.name,
    this.raceId,
    required this.isNpc,
    this.campaignId,
    this.appearanceImageUrl,
    this.quenta,
    this.mainQuest,
    required this.questProgressStage,
    this.playerNotes,
    required this.unallocatedPoints,
    this.attributes,
    required this.derivedValues,
    this.runtimeState,
  });

  factory Character.fromJson(Map<String, dynamic> j) => Character(
        id: j['id'] as String,
        ownerId: j['owner_id'] as String,
        name: j['name'] as String,
        raceId: j['race_id'] as String?,
        isNpc: j['is_npc'] as bool? ?? false,
        campaignId: j['campaign_id'] as String?,
        appearanceImageUrl: j['appearance_image_url'] as String?,
        quenta: j['quenta'] as String?,
        mainQuest: j['main_quest'] as String?,
        questProgressStage: j['quest_progress_stage'] as int? ?? 0,
        playerNotes: j['player_notes'] as String?,
        unallocatedPoints: j['unallocated_points'] as int? ?? 0,
        attributes: j['attributes'] != null
            ? Attributes.fromJson(j['attributes'] as Map<String, dynamic>)
            : null,
        derivedValues: (j['derived_values'] as List<dynamic>? ?? [])
            .map((e) => DerivedValue.fromJson(e as Map<String, dynamic>))
            .toList(),
        runtimeState: j['runtime_state'] != null
            ? RuntimeState.fromJson(j['runtime_state'] as Map<String, dynamic>)
            : null,
      );

  DerivedValue? derived(String key) {
    try {
      return derivedValues.firstWhere((d) => d.key == key);
    } catch (_) {
      return null;
    }
  }

  int get hpMax => derived('hp_max')?.effectiveValue ?? 0;
  int get manaMax => derived('mana_max')?.effectiveValue ?? 0;
  int get apMax => derived('ap_max')?.effectiveValue ?? 0;
  int get slots => derived('slots')?.effectiveValue ?? 0;
}

// ── AllocatePreview ───────────────────────────────────────────────────────────

class AllocatePreview {
  final int cost;
  final int newValue;
  final int remainingPoints;

  const AllocatePreview({
    required this.cost,
    required this.newValue,
    required this.remainingPoints,
  });

  factory AllocatePreview.fromJson(Map<String, dynamic> j) => AllocatePreview(
        cost: j['cost'] as int,
        newValue: j['new_value'] as int,
        remainingPoints: j['remaining_points'] as int,
      );
}

// ── ItemTemplate ──────────────────────────────────────────────────────────────

class ItemTemplate {
  final String id;
  final String name;
  final String slotType;
  final String? weaponFamily;
  final bool isTwoHanded;
  final int tier;
  final String? requiredAttribute;
  final String? damageDice;
  final String? bonusCritDice;
  final String? scalingAttribute;
  final double? scalingCoefficient;
  final Map<String, dynamic>? statBonuses;
  final List<dynamic>? grantedAbilityIds;
  final int? hungerRestored;
  final double referencePrice;
  final String? description;
  final String? iconUrl;

  const ItemTemplate({
    required this.id,
    required this.name,
    required this.slotType,
    this.weaponFamily,
    required this.isTwoHanded,
    required this.tier,
    this.requiredAttribute,
    this.damageDice,
    this.bonusCritDice,
    this.scalingAttribute,
    this.scalingCoefficient,
    this.statBonuses,
    this.grantedAbilityIds,
    this.hungerRestored,
    required this.referencePrice,
    this.description,
    this.iconUrl,
  });

  factory ItemTemplate.fromJson(Map<String, dynamic> j) => ItemTemplate(
        id: j['id'] as String,
        name: j['name'] as String,
        slotType: j['slot_type'] as String,
        weaponFamily: j['weapon_family'] as String?,
        isTwoHanded: j['is_two_handed'] as bool? ?? false,
        tier: j['tier'] as int? ?? 0,
        requiredAttribute: j['required_attribute'] as String?,
        damageDice: j['damage_dice'] as String?,
        bonusCritDice: j['bonus_crit_dice'] as String?,
        scalingAttribute: j['scaling_attribute'] as String?,
        scalingCoefficient: (j['scaling_coefficient'] as num?)?.toDouble(),
        statBonuses: j['stat_bonuses'] as Map<String, dynamic>?,
        grantedAbilityIds: j['granted_ability_ids'] as List<dynamic>?,
        hungerRestored: j['hunger_restored'] as int?,
        referencePrice: (j['reference_price'] as num?)?.toDouble() ?? 0.0,
        description: j['description'] as String?,
        iconUrl: j['icon_url'] as String?,
      );
}

// ── ItemInstance ──────────────────────────────────────────────────────────────

class ItemInstance {
  final String id;
  final String characterId;
  final String? templateId;
  final Map<String, dynamic>? overrides;
  final double? acquiredPrice;
  final String location;
  final ItemTemplate? template;

  const ItemInstance({
    required this.id,
    required this.characterId,
    this.templateId,
    this.overrides,
    this.acquiredPrice,
    required this.location,
    this.template,
  });

  factory ItemInstance.fromJson(Map<String, dynamic> j) => ItemInstance(
        id: j['id'] as String,
        characterId: j['character_id'] as String,
        templateId: j['template_id'] as String?,
        overrides: j['overrides'] as Map<String, dynamic>?,
        acquiredPrice: (j['acquired_price'] as num?)?.toDouble(),
        location: j['location'] as String? ?? 'backpack',
        template: j['template'] != null
            ? ItemTemplate.fromJson(j['template'] as Map<String, dynamic>)
            : null,
      );

  String get displayName =>
      (overrides?['name'] as String?) ?? template?.name ?? 'Предмет';
  int get tier =>
      (overrides?['tier'] as int?) ?? template?.tier ?? 0;
  String get slotType =>
      (overrides?['slot_type'] as String?) ?? template?.slotType ?? 'misc';
}

// ── Skill ─────────────────────────────────────────────────────────────────────

class Skill {
  final String id;
  final String name;
  final String? description;
  final String skillType;
  final bool occupiesSlot;
  final int tier;
  final String? tiedAttribute;
  final int? manaCost;
  final int? apCost;
  final String? iconUrl;

  const Skill({
    required this.id,
    required this.name,
    this.description,
    required this.skillType,
    required this.occupiesSlot,
    required this.tier,
    this.tiedAttribute,
    this.manaCost,
    this.apCost,
    this.iconUrl,
  });

  factory Skill.fromJson(Map<String, dynamic> j) => Skill(
        id: j['id'] as String,
        name: j['name'] as String,
        description: j['description'] as String?,
        skillType: j['skill_type'] as String? ?? 'acquired',
        occupiesSlot: j['occupies_slot'] as bool? ?? true,
        tier: j['tier'] as int? ?? 0,
        tiedAttribute: j['tied_attribute'] as String?,
        manaCost: j['mana_cost'] as int?,
        apCost: j['ap_cost'] as int?,
        iconUrl: j['icon_url'] as String?,
      );
}

// ── CharacterSkill ────────────────────────────────────────────────────────────

class CharacterSkill {
  final Skill skill;
  final String? categoryId;
  final bool isLocked;

  const CharacterSkill({
    required this.skill,
    this.categoryId,
    required this.isLocked,
  });

  factory CharacterSkill.fromJson(Map<String, dynamic> j) => CharacterSkill(
        skill: Skill.fromJson(j['skill'] as Map<String, dynamic>),
        categoryId: j['category_id'] as String?,
        isLocked: j['is_locked'] as bool? ?? false,
      );
}

// ── SkillCategory ─────────────────────────────────────────────────────────────

class SkillCategory {
  final String id;
  final String name;
  final String? iconUrl;

  const SkillCategory({
    required this.id,
    required this.name,
    this.iconUrl,
  });

  factory SkillCategory.fromJson(Map<String, dynamic> j) => SkillCategory(
        id: j['id'] as String,
        name: j['name'] as String,
        iconUrl: j['icon_url'] as String?,
      );
}

// ── BackpackSlot ──────────────────────────────────────────────────────────────

class BackpackSlot {
  final int slotIndex;
  final String? itemName;
  final String? itemType;
  final String? description;
  final int? quantity;
  final String? iconUrl;

  const BackpackSlot({
    required this.slotIndex,
    this.itemName,
    this.itemType,
    this.description,
    this.quantity,
    this.iconUrl,
  });

  bool get isEmpty => itemName == null;

  factory BackpackSlot.fromJson(Map<String, dynamic> j) => BackpackSlot(
        slotIndex: j['slot_index'] as int,
        itemName: j['item_name'] as String?,
        itemType: j['item_type'] as String?,
        description: j['description'] as String?,
        quantity: j['quantity'] as int?,
        iconUrl: j['icon_url'] as String?,
      );
}

// ── Currency ──────────────────────────────────────────────────────────────────

class CurrencyOut {
  final double balanceBronze;
  final List<TransactionOut> transactions;

  const CurrencyOut({required this.balanceBronze, required this.transactions});

  factory CurrencyOut.fromJson(Map<String, dynamic> j) => CurrencyOut(
        balanceBronze: (j['balance_bronze'] as num?)?.toDouble() ?? 0.0,
        transactions: (j['transactions'] as List<dynamic>? ?? [])
            .map((e) => TransactionOut.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  int get gold => balanceBronze ~/ 100;
  int get silver => (balanceBronze % 100) ~/ 10;
  int get bronze => (balanceBronze % 10).toInt();

  String get displayString {
    final parts = <String>[];
    if (gold > 0) parts.add('$gold зол.');
    if (silver > 0) parts.add('$silver сер.');
    if (bronze > 0 || parts.isEmpty) parts.add('$bronze бр.');
    return parts.join(' ');
  }
}

class TransactionOut {
  final String id;
  final double amountBronze;
  final String moneyTarget;
  final String? relatedItemInstanceId;
  final String createdById;
  final String createdAt;

  const TransactionOut({
    required this.id,
    required this.amountBronze,
    required this.moneyTarget,
    this.relatedItemInstanceId,
    required this.createdById,
    required this.createdAt,
  });

  factory TransactionOut.fromJson(Map<String, dynamic> j) => TransactionOut(
        id: j['id'] as String,
        amountBronze: (j['amount_bronze'] as num?)?.toDouble() ?? 0.0,
        moneyTarget: j['money_target'] as String? ?? '',
        relatedItemInstanceId: j['related_item_instance_id'] as String?,
        createdById: j['created_by_id'] as String? ?? '',
        createdAt: j['created_at'] as String? ?? '',
      );
}

// ── Reputation ────────────────────────────────────────────────────────────────

class FactionOut {
  final String id;
  final String name;
  final String? description;
  final String? iconUrl;

  const FactionOut({
    required this.id,
    required this.name,
    this.description,
    this.iconUrl,
  });

  factory FactionOut.fromJson(Map<String, dynamic> j) => FactionOut(
        id: j['id'] as String,
        name: j['name'] as String,
        description: j['description'] as String?,
        iconUrl: j['icon_url'] as String?,
      );
}

class ReputationOut {
  final FactionOut faction;
  final int value;
  final String rangeLabel;
  final double? priceMultiplier;

  const ReputationOut({
    required this.faction,
    required this.value,
    required this.rangeLabel,
    this.priceMultiplier,
  });

  factory ReputationOut.fromJson(Map<String, dynamic> j) => ReputationOut(
        faction: FactionOut.fromJson(j['faction'] as Map<String, dynamic>),
        value: j['value'] as int? ?? 0,
        rangeLabel: j['range_label'] as String? ?? '',
        priceMultiplier: (j['price_multiplier'] as num?)?.toDouble(),
      );
}

// ── Race ──────────────────────────────────────────────────────────────────────

class RaceOut {
  final String id;
  final String name;
  final String? description;
  final String? iconUrl;

  const RaceOut({
    required this.id,
    required this.name,
    this.description,
    this.iconUrl,
  });

  factory RaceOut.fromJson(Map<String, dynamic> j) => RaceOut(
        id: j['id'] as String,
        name: j['name'] as String,
        description: j['description'] as String?,
        iconUrl: j['icon_url'] as String?,
      );
}

// ── Pet ───────────────────────────────────────────────────────────────────────

class PetOut {
  final String id;
  final String name;
  final String species;
  final String? iconUrl;
  final int level;
  final int foodProgress;
  final int foodRequiredNext;
  final Map<String, dynamic>? statBonuses;

  const PetOut({
    required this.id,
    required this.name,
    required this.species,
    this.iconUrl,
    required this.level,
    required this.foodProgress,
    required this.foodRequiredNext,
    this.statBonuses,
  });

  factory PetOut.fromJson(Map<String, dynamic> j) => PetOut(
        id: j['id'] as String,
        name: j['name'] as String,
        species: j['species'] as String,
        iconUrl: j['icon_url'] as String?,
        level: j['level'] as int? ?? 1,
        foodProgress: j['food_progress'] as int? ?? 0,
        foodRequiredNext: j['food_required_next'] as int? ?? 1,
        statBonuses: j['stat_bonuses'] as Map<String, dynamic>?,
      );
}

// ── Campaign ──────────────────────────────────────────────────────────────────

class CampaignOut {
  final String id;
  final String name;
  final String gmId;

  const CampaignOut({
    required this.id,
    required this.name,
    required this.gmId,
  });

  factory CampaignOut.fromJson(Map<String, dynamic> j) => CampaignOut(
        id: j['id'] as String,
        name: j['name'] as String,
        gmId: j['gm_id'] as String,
      );
}

// ── PartySummaryItem ──────────────────────────────────────────────────────────

class PartySummaryItem {
  final String id;
  final String name;
  final int currentHp;
  final int hpMax;
  final int currentMana;
  final int manaMax;
  final int currentAp;
  final int apMax;
  final bool bubbleActive;

  const PartySummaryItem({
    required this.id,
    required this.name,
    required this.currentHp,
    required this.hpMax,
    required this.currentMana,
    required this.manaMax,
    required this.currentAp,
    required this.apMax,
    required this.bubbleActive,
  });

  factory PartySummaryItem.fromJson(Map<String, dynamic> j) =>
      PartySummaryItem(
        id: j['id'] as String,
        name: j['name'] as String,
        currentHp: j['current_hp'] as int? ?? 0,
        hpMax: j['hp_max'] as int? ?? 0,
        currentMana: j['current_mana'] as int? ?? 0,
        manaMax: j['mana_max'] as int? ?? 0,
        currentAp: j['current_ap'] as int? ?? 0,
        apMax: j['ap_max'] as int? ?? 0,
        bubbleActive: j['bubble_active'] as bool? ?? false,
      );
}

// ── ClassBonusRollResponse ────────────────────────────────────────────────────

class ClassBonusRollResponse {
  final String attribute;
  final int classIndex;
  final String? diceFormula;
  final List<dynamic>? rolledValues;
  final int? rolledSum;
  final Map<String, dynamic>? resultingEffect;
  final List<dynamic>? drawnCards;
  final String? drawId;

  const ClassBonusRollResponse({
    required this.attribute,
    required this.classIndex,
    this.diceFormula,
    this.rolledValues,
    this.rolledSum,
    this.resultingEffect,
    this.drawnCards,
    this.drawId,
  });

  factory ClassBonusRollResponse.fromJson(Map<String, dynamic> j) =>
      ClassBonusRollResponse(
        attribute: j['attribute'] as String,
        classIndex: j['class_index'] as int? ?? 0,
        diceFormula: j['dice_formula'] as String?,
        rolledValues: j['rolled_values'] as List<dynamic>?,
        rolledSum: j['rolled_sum'] as int?,
        resultingEffect: j['resulting_effect'] as Map<String, dynamic>?,
        drawnCards: j['drawn_cards'] as List<dynamic>?,
        drawId: j['draw_id'] as String?,
      );
}

// ── WildMagicCard ─────────────────────────────────────────────────────────────

class WildMagicCard {
  final String id;
  final String name;
  final String? description;
  final Map<String, dynamic>? effectJson;

  const WildMagicCard({
    required this.id,
    required this.name,
    this.description,
    this.effectJson,
  });

  factory WildMagicCard.fromJson(Map<String, dynamic> j) => WildMagicCard(
        id: j['id'] as String,
        name: j['name'] as String,
        description: j['description'] as String?,
        effectJson: j['effect_json'] as Map<String, dynamic>?,
      );
}

// ── Slot type helpers ─────────────────────────────────────────────────────────

const kSlotTypes = [
  'head',
  'body',
  'legs',
  'vambraces',
  'weapon_left',
  'weapon_right',
  'ring',
  'amulet',
  'pet',
];

const kSlotLabels = {
  'head': 'Голова',
  'body': 'Тело',
  'legs': 'Ноги',
  'vambraces': 'Наручи',
  'weapon_left': 'Левая рука',
  'weapon_right': 'Правая рука',
  'ring': 'Кольцо',
  'amulet': 'Амулет',
  'pet': 'Питомец',
};

const kBackpackItemTypes = [
  'food',
  'scroll',
  'herb',
  'potion',
  'misc',
  'quest',
  'other',
];

const kBackpackItemTypeLabels = {
  'food': 'Еда',
  'scroll': 'Свиток',
  'herb': 'Трава',
  'potion': 'Зелье',
  'misc': 'Разное',
  'quest': 'Квест',
  'other': 'Прочее',
};

const kTierDice = {0: 'd4', 1: 'd6', 2: 'd12', 3: 'd20', 4: 'd60', 5: 'd100'};
