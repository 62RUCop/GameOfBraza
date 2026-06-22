import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import 'auth_provider.dart';

// ── Character list ────────────────────────────────────────────────────────────

class CharacterListNotifier
    extends AsyncNotifier<List<CharacterListItem>> {
  @override
  Future<List<CharacterListItem>> build() async {
    final client = ref.read(apiClientProvider);
    return client.listCharacters();
  }

  Future<void> reload() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
        () => ref.read(apiClientProvider).listCharacters());
  }

  Future<Character> create({
    required String name,
    String? raceId,
    required Map<String, int> attributes,
    bool isNpc = false,
  }) async {
    final client = ref.read(apiClientProvider);
    final char = await client.createCharacter(
      name: name,
      raceId: raceId,
      attributes: attributes,
      isNpc: isNpc,
    );
    await reload();
    return char;
  }
}

final characterListProvider =
    AsyncNotifierProvider<CharacterListNotifier, List<CharacterListItem>>(
        CharacterListNotifier.new);

// ── Selected character (full detail) ─────────────────────────────────────────

class CharacterNotifier
    extends FamilyAsyncNotifier<Character, String> {
  @override
  Future<Character> build(String arg) async {
    return ref.read(apiClientProvider).getCharacter(arg);
  }

  Future<void> reload() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
        () => ref.read(apiClientProvider).getCharacter(arg));
  }

  Future<void> updateDescription(Map<String, dynamic> data) async {
    final updated =
        await ref.read(apiClientProvider).updateDescription(arg, data);
    state = AsyncData(updated);
  }

  Future<AllocatePreview> previewAllocate(
      String attribute, int delta) async {
    return ref.read(apiClientProvider).previewAllocate(arg, attribute, delta);
  }

  Future<void> confirmAllocate(String attribute, int delta) async {
    final updated = await ref
        .read(apiClientProvider)
        .confirmAllocate(arg, attribute, delta);
    state = AsyncData(updated);
  }

  Future<void> overrideStat(String key,
      {int? value, bool reset = false}) async {
    await ref
        .read(apiClientProvider)
        .overrideStat(arg, key, value: value, reset: reset);
    await reload();
  }

  Future<void> patchRuntime(Map<String, dynamic> updates) async {
    await ref.read(apiClientProvider).patchRuntime(arg, updates);
    await reload();
  }
}

final characterProvider =
    AsyncNotifierProviderFamily<CharacterNotifier, Character, String>(
        CharacterNotifier.new);

// ── Races (catalog) ───────────────────────────────────────────────────────────

final racesProvider = FutureProvider<List<RaceOut>>((ref) async {
  return ref.read(apiClientProvider).listRaces();
});

// ── Items for a character ─────────────────────────────────────────────────────

final characterItemsProvider =
    FutureProvider.family<List<ItemInstance>, String>((ref, characterId) async {
  return ref.read(apiClientProvider).listItems(characterId);
});

final equippedItemsProvider =
    FutureProvider.family<Map<String, ItemInstance>, String>(
        (ref, characterId) async {
  final all = await ref.read(apiClientProvider).listItems(characterId);
  final equipped = <String, ItemInstance>{};
  for (final item in all) {
    if (item.location != 'backpack') {
      equipped[item.location] = item;
    }
  }
  return equipped;
});

// ── Skills ────────────────────────────────────────────────────────────────────

final characterSkillsProvider =
    FutureProvider.family<List<CharacterSkill>, String>(
        (ref, characterId) async {
  return ref.read(apiClientProvider).getCharacterSkills(characterId);
});

final skillCategoriesProvider =
    FutureProvider<List<SkillCategory>>((ref) async {
  return ref.read(apiClientProvider).listSkillCategories();
});

final allSkillsProvider = FutureProvider<List<Skill>>((ref) async {
  return ref.read(apiClientProvider).listAllSkills();
});

// ── Backpack ──────────────────────────────────────────────────────────────────

final backpackProvider =
    FutureProvider.family<List<BackpackSlot>, String>((ref, characterId) async {
  return ref.read(apiClientProvider).getBackpack(characterId);
});

// ── Currency ──────────────────────────────────────────────────────────────────

final currencyProvider =
    FutureProvider.family<CurrencyOut, String>((ref, characterId) async {
  return ref.read(apiClientProvider).getCurrency(characterId);
});

// ── Reputation ────────────────────────────────────────────────────────────────

final reputationProvider =
    FutureProvider.family<List<ReputationOut>, String>(
        (ref, characterId) async {
  return ref.read(apiClientProvider).getReputation(characterId);
});

// ── Pet ───────────────────────────────────────────────────────────────────────

final petProvider =
    FutureProvider.family<PetOut?, String>((ref, characterId) async {
  return ref.read(apiClientProvider).getPet(characterId);
});

// ── Item templates ────────────────────────────────────────────────────────────

final itemTemplatesProvider =
    FutureProvider<List<ItemTemplate>>((ref) async {
  return ref.read(apiClientProvider).listItemTemplates();
});
