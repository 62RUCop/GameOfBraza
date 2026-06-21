import 'package:flutter/foundation.dart';

enum Role { player, gm, admin }

class Account {
  final String id;
  final String email;
  final Role role;
  final bool gmSkipConfirmation;

  const Account({required this.id, required this.email, required this.role, required this.gmSkipConfirmation});

  factory Account.fromJson(Map<String, dynamic> json) => Account(
        id: json['id'] as String,
        email: json['email'] as String,
        role: Role.values.firstWhere((r) => r.name == json['role']),
        gmSkipConfirmation: json['gm_skip_confirmation'] as bool? ?? false,
      );
}

class CharacterListItem {
  final String id;
  final String name;
  final String? raceId;
  final bool isNpc;
  final String? imageUrl;
  final int unallocatedPoints;

  const CharacterListItem({
    required this.id,
    required this.name,
    this.raceId,
    required this.isNpc,
    this.imageUrl,
    required this.unallocatedPoints,
  });

  factory CharacterListItem.fromJson(Map<String, dynamic> json) => CharacterListItem(
        id: json['id'] as String,
        name: json['name'] as String,
        raceId: json['race_id'] as String?,
        isNpc: json['is_npc'] as bool? ?? false,
        imageUrl: json['appearance_image_url'] as String?,
        unallocatedPoints: json['unallocated_points'] as int? ?? 0,
      );
}

class Attributes {
  final int strength, dexterity, intelligence, spirit, endurance, luck;

  const Attributes({
    required this.strength,
    required this.dexterity,
    required this.intelligence,
    required this.spirit,
    required this.endurance,
    required this.luck,
  });

  factory Attributes.fromJson(Map<String, dynamic> json) => Attributes(
        strength: json['strength'] as int? ?? 3,
        dexterity: json['dexterity'] as int? ?? 3,
        intelligence: json['intelligence'] as int? ?? 3,
        spirit: json['spirit'] as int? ?? 3,
        endurance: json['endurance'] as int? ?? 3,
        luck: json['luck'] as int? ?? 3,
      );

  static const names = ['strength', 'dexterity', 'intelligence', 'spirit', 'endurance', 'luck'];
  static const displayNames = ['СИЛ', 'ЛОВ', 'ИНТ', 'ДУХ', 'ВЫН', 'УДА'];

  int operator [](String key) {
    switch (key) {
      case 'strength': return strength;
      case 'dexterity': return dexterity;
      case 'intelligence': return intelligence;
      case 'spirit': return spirit;
      case 'endurance': return endurance;
      case 'luck': return luck;
      default: return 0;
    }
  }
}

class DerivedValue {
  final String key;
  final int computedValue;
  final int? overrideValue;
  final bool manualOverride;
  final int effectiveValue;

  const DerivedValue({
    required this.key,
    required this.computedValue,
    this.overrideValue,
    required this.manualOverride,
    required this.effectiveValue,
  });

  factory DerivedValue.fromJson(Map<String, dynamic> json) => DerivedValue(
        key: json['key'] as String,
        computedValue: json['computed_value'] as int? ?? 0,
        overrideValue: json['override_value'] as int?,
        manualOverride: json['manual_override'] as bool? ?? false,
        effectiveValue: json['effective_value'] as int? ?? 0,
      );
}

class RuntimeState {
  final int currentHp, currentMana, currentAp, satietyCurrent;
  final bool bubbleActive;
  final int bubblePersistChance;

  const RuntimeState({
    required this.currentHp,
    required this.currentMana,
    required this.currentAp,
    required this.satietyCurrent,
    required this.bubbleActive,
    required this.bubblePersistChance,
  });

  factory RuntimeState.fromJson(Map<String, dynamic> json) => RuntimeState(
        currentHp: json['current_hp'] as int? ?? 0,
        currentMana: json['current_mana'] as int? ?? 0,
        currentAp: json['current_ap'] as int? ?? 0,
        satietyCurrent: json['satiety_current'] as int? ?? 0,
        bubbleActive: json['bubble_active'] as bool? ?? false,
        bubblePersistChance: json['bubble_persist_chance_current'] as int? ?? 0,
      );
}

class Character {
  final String id;
  final String name;
  final String? raceId;
  final bool isNpc;
  final String? imageUrl;
  final String? quenta;
  final String? mainQuest;
  final String? playerNotes;
  final int unallocatedPoints;
  final Attributes? attributes;
  final List<DerivedValue> derivedValues;
  final RuntimeState? runtimeState;

  const Character({
    required this.id,
    required this.name,
    this.raceId,
    required this.isNpc,
    this.imageUrl,
    this.quenta,
    this.mainQuest,
    this.playerNotes,
    required this.unallocatedPoints,
    this.attributes,
    required this.derivedValues,
    this.runtimeState,
  });

  factory Character.fromJson(Map<String, dynamic> json) => Character(
        id: json['id'] as String,
        name: json['name'] as String,
        raceId: json['race_id'] as String?,
        isNpc: json['is_npc'] as bool? ?? false,
        imageUrl: json['appearance_image_url'] as String?,
        quenta: json['quenta'] as String?,
        mainQuest: json['main_quest'] as String?,
        playerNotes: json['player_notes'] as String?,
        unallocatedPoints: json['unallocated_points'] as int? ?? 0,
        attributes: json['attributes'] != null ? Attributes.fromJson(json['attributes'] as Map<String, dynamic>) : null,
        derivedValues: (json['derived_values'] as List<dynamic>?)
                ?.map((e) => DerivedValue.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        runtimeState: json['runtime_state'] != null ? RuntimeState.fromJson(json['runtime_state'] as Map<String, dynamic>) : null,
      );

  DerivedValue? getDerived(String key) {
    try {
      return derivedValues.firstWhere((d) => d.key == key);
    } catch (_) {
      return null;
    }
  }

  int getDerivedValue(String key) => getDerived(key)?.effectiveValue ?? 0;
}
