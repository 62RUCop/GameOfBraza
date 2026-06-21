import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/widgets/tier_badge.dart';

final _equipmentProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, charId) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/characters/$charId/items');
  return (response.data as List).cast<Map<String, dynamic>>();
});

class EquipmentTab extends ConsumerWidget {
  final String characterId;

  const EquipmentTab({super.key, required this.characterId});

  static const _slots = ['head', 'body', 'legs', 'vambraces', 'weapon_left', 'weapon_right', 'ring', 'amulet', 'pet'];
  static const _slotLabels = {
    'head': 'Голова', 'body': 'Тело', 'legs': 'Ноги', 'vambraces': 'Наручи',
    'weapon_left': 'Оружие (л)', 'weapon_right': 'Оружие (п)', 'ring': 'Кольцо',
    'amulet': 'Амулет', 'pet': 'Питомец',
  };
  static const _slotIcons = {
    'head': Icons.face, 'body': Icons.checkroom, 'legs': Icons.airline_seat_legroom_normal,
    'vambraces': Icons.back_hand, 'weapon_left': Icons.construction, 'weapon_right': Icons.construction,
    'ring': Icons.circle, 'amulet': Icons.favorite, 'pet': Icons.pets,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemsAsync = ref.watch(_equipmentProvider(characterId));

    return itemsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e', style: const TextStyle(color: Colors.red))),
      data: (items) {
        final equipped = {for (var i in items.where((i) => (i['location'] as String).startsWith('equipped:'))) (i['location'] as String).substring(9): i};
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Снаряжение', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 16),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, childAspectRatio: 1.1, crossAxisSpacing: 8, mainAxisSpacing: 8),
                itemCount: _slots.length,
                itemBuilder: (_, i) {
                  final slot = _slots[i];
                  final item = equipped[slot];
                  return _SlotCard(
                    slot: slot,
                    label: _slotLabels[slot]!,
                    icon: _slotIcons[slot]!,
                    item: item,
                    onUnequip: item != null
                        ? () async {
                            final dio = ref.read(dioProvider);
                            await dio.delete('/characters/$characterId/equipment/$slot');
                            ref.invalidate(_equipmentProvider(characterId));
                          }
                        : null,
                  );
                },
              ),
              const SizedBox(height: 24),
              const Text('Рюкзак (предметы)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              ...items.where((i) => i['location'] == 'backpack').map((item) => _ItemCard(item: item, characterId: characterId, onEquip: (slot) async {
                final dio = ref.read(dioProvider);
                await dio.post('/characters/$characterId/equipment/$slot', data: {'item_instance_id': item['id']});
                ref.invalidate(_equipmentProvider(characterId));
              })),
            ],
          ),
        );
      },
    );
  }
}

class _SlotCard extends StatelessWidget {
  final String slot, label;
  final IconData icon;
  final Map<String, dynamic>? item;
  final VoidCallback? onUnequip;

  const _SlotCard({required this.slot, required this.label, required this.icon, this.item, this.onUnequip});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onLongPress: onUnequip,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 24, color: item != null ? Theme.of(context).colorScheme.primary : Colors.white24),
              const SizedBox(height: 4),
              Text(label, style: const TextStyle(fontSize: 10, color: Colors.white54), textAlign: TextAlign.center),
              if (item != null) ...[
                const SizedBox(height: 4),
                Text(
                  _itemName(item!),
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                TierBadge(tier: _itemTier(item!), fontSize: 9),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _itemName(Map<String, dynamic> item) {
    final tmpl = item['template'] as Map<String, dynamic>?;
    return tmpl?['name'] as String? ?? (item['overrides'] as Map<String, dynamic>?)?['name'] as String? ?? 'Предмет';
  }

  int _itemTier(Map<String, dynamic> item) {
    final tmpl = item['template'] as Map<String, dynamic>?;
    return (tmpl?['tier'] as int?) ?? ((item['overrides'] as Map<String, dynamic>?)?['tier'] as int?) ?? 0;
  }
}

class _ItemCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final String characterId;
  final void Function(String slot) onEquip;

  const _ItemCard({required this.item, required this.characterId, required this.onEquip});

  @override
  Widget build(BuildContext context) {
    final tmpl = item['template'] as Map<String, dynamic>?;
    final name = tmpl?['name'] as String? ?? 'Предмет';
    final tier = (tmpl?['tier'] as int?) ?? 0;
    final slot = tmpl?['slot_type'] as String? ?? '';
    final bonuses = tmpl?['stat_bonuses'] as Map<String, dynamic>?;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            TierBadge(tier: tier),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  if (bonuses != null && bonuses.isNotEmpty)
                    Text(
                      bonuses.entries.map((e) => '${e.key}: ${e.value}').join(', '),
                      style: const TextStyle(fontSize: 11, color: Colors.white54),
                    ),
                ],
              ),
            ),
            if (slot.isNotEmpty)
              TextButton(
                onPressed: () => onEquip(slot),
                child: const Text('Надеть', style: TextStyle(fontSize: 12)),
              ),
          ],
        ),
      ),
    );
  }
}
