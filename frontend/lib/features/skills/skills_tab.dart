import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../core/widgets/tier_badge.dart';

final _skillsProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, charId) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/characters/$charId/skills');
  return (response.data as List).cast<Map<String, dynamic>>();
});

class SkillsTab extends ConsumerWidget {
  final String characterId;
  final Character character;

  const SkillsTab({super.key, required this.characterId, required this.character});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final skillsAsync = ref.watch(_skillsProvider(characterId));
    final slots = character.getDerivedValue('slots');

    return skillsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e', style: const TextStyle(color: Colors.red))),
      data: (skills) {
        final used = skills.where((s) => (s['skill'] as Map<String, dynamic>)['occupies_slot'] == true).length;

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Навыки', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  Chip(
                    label: Text('Занято $used из $slots', style: const TextStyle(fontSize: 12)),
                    backgroundColor: used >= slots ? Colors.red.withOpacity(0.3) : null,
                  ),
                ],
              ),
            ),
            Expanded(
              child: skills.isEmpty
                  ? const Center(child: Text('Нет навыков', style: TextStyle(color: Colors.white38)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: skills.length,
                      itemBuilder: (_, i) {
                        final skill = skills[i]['skill'] as Map<String, dynamic>;
                        final isLocked = skills[i]['is_locked'] as bool? ?? false;
                        final occupiesSlot = skill['occupies_slot'] as bool? ?? true;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 6),
                          child: ListTile(
                            leading: TierBadge(tier: skill['tier'] as int? ?? 0),
                            title: Row(
                              children: [
                                Text(skill['name'] as String, style: TextStyle(color: isLocked ? Colors.white38 : null)),
                                if (isLocked) ...[
                                  const SizedBox(width: 4),
                                  Icon(Icons.lock, size: 12, color: Colors.red[300]),
                                ],
                              ],
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (skill['description'] != null)
                                  Text(skill['description'] as String, style: const TextStyle(fontSize: 11, color: Colors.white38), maxLines: 2),
                                Row(
                                  children: [
                                    if (!occupiesSlot)
                                      const Chip(label: Text('не занимает ячейку', style: TextStyle(fontSize: 9))),
                                    if (skill['mana_cost'] != null)
                                      Padding(padding: const EdgeInsets.only(left: 4), child: Text('Мана: ${skill['mana_cost']}', style: const TextStyle(fontSize: 10, color: Colors.blue))),
                                    if (skill['ap_cost'] != null)
                                      Padding(padding: const EdgeInsets.only(left: 4), child: Text('AP: ${skill['ap_cost']}', style: const TextStyle(fontSize: 10, color: Colors.green))),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}
