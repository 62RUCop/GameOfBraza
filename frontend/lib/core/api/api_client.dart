import 'package:dio/dio.dart';
import '../models/models.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient(String baseUrl) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      contentType: 'application/json',
    ));
  }

  void setBearer(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearBearer() {
    _dio.options.headers.remove('Authorization');
  }

  String? get currentToken =>
      _dio.options.headers['Authorization'] as String?;

  // ── AUTH ─────────────────────────────────────────────────────────────────────

  Future<TokenResponse> login(String email, String password) async {
    final r = await _dio.post('/auth/login',
        data: {'email': email, 'password': password});
    return TokenResponse.fromJson(r.data as Map<String, dynamic>);
  }

  Future<TokenResponse> refresh(String refreshToken) async {
    final r = await _dio
        .post('/auth/refresh', data: {'refresh_token': refreshToken});
    return TokenResponse.fromJson(r.data as Map<String, dynamic>);
  }

  Future<Account> me() async {
    final r = await _dio.get('/auth/me');
    return Account.fromJson(r.data as Map<String, dynamic>);
  }

  Future<Account> updateProfile(String accountId,
      {required bool gmSkipConfirmation}) async {
    final r = await _dio.patch('/auth/accounts/$accountId/profile',
        data: {'gm_skip_confirmation': gmSkipConfirmation});
    return Account.fromJson(r.data as Map<String, dynamic>);
  }

  // ── CHARACTERS ───────────────────────────────────────────────────────────────

  Future<List<CharacterListItem>> listCharacters(
      {String? accountId, bool? isNpc}) async {
    final params = <String, dynamic>{};
    if (accountId != null) params['account_id'] = accountId;
    if (isNpc != null) params['is_npc'] = isNpc;
    final r = await _dio.get('/characters', queryParameters: params);
    return (r.data as List<dynamic>)
        .map((e) => CharacterListItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Character> getCharacter(String id) async {
    final r = await _dio.get('/characters/$id');
    return Character.fromJson(r.data as Map<String, dynamic>);
  }

  Future<Character> createCharacter({
    required String name,
    String? raceId,
    required Map<String, int> attributes,
    bool isNpc = false,
  }) async {
    final r = await _dio.post('/characters', data: {
      'name': name,
      if (raceId != null) 'race_id': raceId,
      'attributes': attributes,
      'is_npc': isNpc,
    });
    return Character.fromJson(r.data as Map<String, dynamic>);
  }

  Future<Character> updateDescription(
      String characterId, Map<String, dynamic> data) async {
    final r = await _dio.patch('/characters/$characterId/description',
        data: data);
    return Character.fromJson(r.data as Map<String, dynamic>);
  }

  Future<AllocatePreview> previewAllocate(
      String characterId, String attribute, int delta) async {
    final r = await _dio.post('/characters/$characterId/attributes/allocate',
        data: {'attribute': attribute, 'delta': delta, 'confirmed': false});
    return AllocatePreview.fromJson(r.data as Map<String, dynamic>);
  }

  Future<Character> confirmAllocate(
      String characterId, String attribute, int delta) async {
    final r = await _dio.post('/characters/$characterId/attributes/allocate',
        data: {'attribute': attribute, 'delta': delta, 'confirmed': true});
    return Character.fromJson(r.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> grantPoints(
      String characterId, int points) async {
    final r = await _dio.post(
        '/characters/$characterId/attributes/grant-points',
        data: {'points': points});
    return r.data as Map<String, dynamic>;
  }

  Future<void> overrideStat(String characterId, String key,
      {int? value, bool reset = false}) async {
    await _dio.patch('/characters/$characterId/stats/$key/override', data: {
      if (value != null) 'value': value,
      'reset': reset,
    });
  }

  Future<void> patchRuntime(
      String characterId, Map<String, dynamic> updates) async {
    await _dio.patch('/characters/$characterId/runtime', data: updates);
  }

  Future<void> deleteCharacter(String characterId) async {
    await _dio.delete('/characters/$characterId');
  }

  // ── EQUIPMENT / ITEMS ─────────────────────────────────────────────────────────

  Future<List<ItemInstance>> listItems(String characterId,
      {String? location}) async {
    final params = <String, dynamic>{};
    if (location != null) params['location'] = location;
    final r = await _dio.get('/characters/$characterId/items',
        queryParameters: params);
    return (r.data as List<dynamic>)
        .map((e) => ItemInstance.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ItemInstance> createItem(
      String characterId, Map<String, dynamic> data) async {
    final r =
        await _dio.post('/characters/$characterId/items', data: data);
    return ItemInstance.fromJson(r.data as Map<String, dynamic>);
  }

  Future<ItemInstance> equipItem(
      String characterId, String slot, String itemInstanceId) async {
    final r = await _dio.post('/characters/$characterId/equipment/$slot',
        data: {'item_instance_id': itemInstanceId});
    return ItemInstance.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> unequipItem(String characterId, String slot) async {
    await _dio.delete('/characters/$characterId/equipment/$slot');
  }

  Future<List<ItemTemplate>> listItemTemplates(
      {String? slot, int? tier, String? weaponFamily}) async {
    final params = <String, dynamic>{};
    if (slot != null) params['slot'] = slot;
    if (tier != null) params['tier'] = tier;
    if (weaponFamily != null) params['weapon_family'] = weaponFamily;
    final r = await _dio.get('/admin/item-templates',
        queryParameters: params);
    return (r.data as List<dynamic>)
        .map((e) => ItemTemplate.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ── SKILLS ────────────────────────────────────────────────────────────────────

  Future<List<CharacterSkill>> getCharacterSkills(String characterId) async {
    final r = await _dio.get('/characters/$characterId/skills');
    return (r.data as List<dynamic>)
        .map((e) => CharacterSkill.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> addSkill(String characterId, String skillId) async {
    await _dio.post('/characters/$characterId/skills',
        data: {'skill_id': skillId});
  }

  Future<void> removeSkill(String characterId, String skillId) async {
    await _dio.delete('/characters/$characterId/skills/$skillId');
  }

  Future<void> assignSkillCategory(
      String characterId, String skillId, String? categoryId) async {
    await _dio.patch('/characters/$characterId/skills/$skillId/category',
        data: {'category_id': categoryId});
  }

  Future<List<Skill>> listAllSkills() async {
    final r = await _dio.get('/admin/skills');
    return (r.data as List<dynamic>)
        .map((e) => Skill.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<SkillCategory>> listSkillCategories() async {
    final r = await _dio.get('/admin/skill-categories');
    return (r.data as List<dynamic>)
        .map((e) => SkillCategory.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ── BACKPACK ──────────────────────────────────────────────────────────────────

  Future<List<BackpackSlot>> getBackpack(String characterId) async {
    final r = await _dio.get('/characters/$characterId/backpack');
    return (r.data as List<dynamic>)
        .map((e) => BackpackSlot.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<BackpackSlot> setBackpackSlot(
      String characterId, int slotIndex, Map<String, dynamic> data) async {
    final r = await _dio
        .post('/characters/$characterId/backpack/$slotIndex', data: data);
    return BackpackSlot.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> clearBackpackSlot(String characterId, int slotIndex) async {
    await _dio.delete('/characters/$characterId/backpack/$slotIndex');
  }

  // ── CURRENCY ──────────────────────────────────────────────────────────────────

  Future<CurrencyOut> getCurrency(String characterId) async {
    final r = await _dio.get('/characters/$characterId/currency');
    return CurrencyOut.fromJson(r.data as Map<String, dynamic>);
  }

  Future<TransactionOut> createTransaction(String characterId,
      {required double amountBronze, required String moneyTarget}) async {
    final r = await _dio.post('/characters/$characterId/currency/transaction',
        data: {
          'amount_bronze': amountBronze,
          'money_target': moneyTarget,
        });
    return TransactionOut.fromJson(r.data as Map<String, dynamic>);
  }

  // ── REPUTATION ────────────────────────────────────────────────────────────────

  Future<List<ReputationOut>> getReputation(String characterId) async {
    final r = await _dio.get('/characters/$characterId/reputation');
    return (r.data as List<dynamic>)
        .map((e) => ReputationOut.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> updateReputation(
      String characterId, String factionId, int value) async {
    await _dio.patch('/characters/$characterId/reputation/$factionId',
        data: {'value': value});
  }

  // ── PET ───────────────────────────────────────────────────────────────────────

  Future<PetOut?> getPet(String characterId) async {
    try {
      final r = await _dio.get('/characters/$characterId/pet');
      if (r.data == null) return null;
      return PetOut.fromJson(r.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  Future<PetOut> createPet(String characterId, Map<String, dynamic> data) async {
    final r = await _dio.post('/characters/$characterId/pet', data: data);
    return PetOut.fromJson(r.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> feedPet(
      String characterId, int hungerPoints) async {
    final r = await _dio.post('/characters/$characterId/pet/feed',
        data: {'hunger_points': hungerPoints});
    return r.data as Map<String, dynamic>;
  }

  // ── CLASS BONUS ───────────────────────────────────────────────────────────────

  Future<ClassBonusRollResponse> rollClassBonus(
      String characterId, String attribute) async {
    final r = await _dio.post('/characters/$characterId/class-bonus/roll',
        data: {'attribute': attribute});
    return ClassBonusRollResponse.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> chooseIntCard(
      String characterId, String drawId, String cardId) async {
    await _dio.post('/characters/$characterId/class-bonus/int-choose',
        data: {'draw_id': drawId, 'chosen_card_id': cardId});
  }

  // ── DICE ──────────────────────────────────────────────────────────────────────

  Future<int> rollDice(int faces) async {
    final r = await _dio.post('/dice/roll', data: {'faces': faces});
    return r.data['result'] as int;
  }

  // ── ADMIN: RACES ──────────────────────────────────────────────────────────────

  Future<List<RaceOut>> listRaces() async {
    final r = await _dio.get('/admin/races');
    return (r.data as List<dynamic>)
        .map((e) => RaceOut.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<RaceOut> createRace(
      {required String name, String? description}) async {
    final r = await _dio.post('/admin/races',
        data: {'name': name, if (description != null) 'description': description});
    return RaceOut.fromJson(r.data as Map<String, dynamic>);
  }

  Future<RaceOut> updateRace(String raceId,
      {required String name, String? description}) async {
    final r = await _dio.patch('/admin/races/$raceId',
        data: {'name': name, if (description != null) 'description': description});
    return RaceOut.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> deleteRace(String raceId) async {
    await _dio.delete('/admin/races/$raceId');
  }

  // ── ADMIN: FACTIONS ───────────────────────────────────────────────────────────

  Future<List<FactionOut>> listFactions() async {
    final r = await _dio.get('/admin/factions');
    return (r.data as List<dynamic>)
        .map((e) => FactionOut.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<FactionOut> createFaction(
      {required String name, String? description}) async {
    final r = await _dio.post('/admin/factions',
        data: {'name': name, if (description != null) 'description': description});
    return FactionOut.fromJson(r.data as Map<String, dynamic>);
  }

  Future<FactionOut> updateFaction(String factionId,
      {required String name, String? description}) async {
    final r = await _dio.patch('/admin/factions/$factionId',
        data: {'name': name, if (description != null) 'description': description});
    return FactionOut.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> deleteFaction(String factionId) async {
    await _dio.delete('/admin/factions/$factionId');
  }

  // ── ADMIN: SKILLS ─────────────────────────────────────────────────────────────

  Future<Skill> createSkill(Map<String, dynamic> data) async {
    final r = await _dio.post('/admin/skills', data: data);
    return Skill.fromJson(r.data as Map<String, dynamic>);
  }

  Future<Skill> updateSkill(String skillId, Map<String, dynamic> data) async {
    final r = await _dio.patch('/admin/skills/$skillId', data: data);
    return Skill.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> deleteSkill(String skillId) async {
    await _dio.delete('/admin/skills/$skillId');
  }

  // ── ADMIN: ITEM TEMPLATES ─────────────────────────────────────────────────────

  Future<ItemTemplate> createItemTemplate(Map<String, dynamic> data) async {
    final r = await _dio.post('/admin/item-templates', data: data);
    return ItemTemplate.fromJson(r.data as Map<String, dynamic>);
  }

  Future<ItemTemplate> updateItemTemplate(
      String itemId, Map<String, dynamic> data) async {
    final r = await _dio.patch('/admin/item-templates/$itemId', data: data);
    return ItemTemplate.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> deleteItemTemplate(String itemId) async {
    await _dio.delete('/admin/item-templates/$itemId');
  }

  // ── ADMIN: WILD MAGIC CARDS ───────────────────────────────────────────────────

  Future<List<WildMagicCard>> listWildMagicCards() async {
    final r = await _dio.get('/admin/wild-magic-cards');
    return (r.data as List<dynamic>)
        .map((e) => WildMagicCard.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<WildMagicCard> createWildMagicCard(Map<String, dynamic> data) async {
    final r = await _dio.post('/admin/wild-magic-cards', data: data);
    return WildMagicCard.fromJson(r.data as Map<String, dynamic>);
  }

  Future<WildMagicCard> updateWildMagicCard(
      String cardId, Map<String, dynamic> data) async {
    final r = await _dio.patch('/admin/wild-magic-cards/$cardId', data: data);
    return WildMagicCard.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> deleteWildMagicCard(String cardId) async {
    await _dio.delete('/admin/wild-magic-cards/$cardId');
  }

  // ── ADMIN: RULE CONFIG ────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getRuleConfig() async {
    final r = await _dio.get('/admin/rule-config');
    return r.data as Map<String, dynamic>;
  }

  Future<void> updateRuleConfig(Map<String, dynamic> updates) async {
    await _dio.patch('/admin/rule-config', data: updates);
  }

  // ── CAMPAIGNS ─────────────────────────────────────────────────────────────────

  Future<List<CampaignOut>> listCampaigns() async {
    final r = await _dio.get('/campaigns');
    return (r.data as List<dynamic>)
        .map((e) => CampaignOut.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CampaignOut> createCampaign(String name) async {
    final r = await _dio.post('/campaigns', data: {'name': name});
    return CampaignOut.fromJson(r.data as Map<String, dynamic>);
  }

  Future<List<PartySummaryItem>> getPartySummary(String campaignId) async {
    final r =
        await _dio.get('/campaigns/$campaignId/party-summary');
    return (r.data as List<dynamic>)
        .map((e) => PartySummaryItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> updateCampaignMembers(String campaignId,
      {List<String> add = const [], List<String> remove = const []}) async {
    await _dio.patch('/campaigns/$campaignId/members',
        data: {'add': add, 'remove': remove});
  }
}
