import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/models/models.dart';

final _reputationProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, charId) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/characters/$charId/reputation');
  return (response.data as List).cast<Map<String, dynamic>>();
});

class ReputationTab extends ConsumerWidget {
  final String characterId;

  const ReputationTab({super.key, required this.characterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repAsync = ref.watch(_reputationProvider(characterId));
    final auth = ref.watch(authProvider).asData?.value;
    final isGm = auth?.role == Role.gm || auth?.role == Role.admin;

    return repAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e', style: const TextStyle(color: Colors.red))),
      data: (reps) => ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: reps.length,
        itemBuilder: (_, i) {
          final rep = reps[i];
          final faction = rep['faction'] as Map<String, dynamic>;
          final value = rep['value'] as int;
          final label = rep['range_label'] as String;
          final multiplier = rep['price_multiplier'] as double?;

          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(faction['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      Chip(label: Text(label, style: const TextStyle(fontSize: 11)), padding: EdgeInsets.zero),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: SliderTheme(
                          data: SliderTheme.of(context).copyWith(trackHeight: 6, thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8)),
                          child: Slider(
                            value: value.toDouble(),
                            min: -10,
                            max: 10,
                            divisions: 20,
                            label: '$value',
                            onChanged: isGm
                                ? (v) async {
                                    final dio = ref.read(dioProvider);
                                    await dio.patch('/characters/$characterId/reputation/${faction['id']}', data: {'value': v.round()});
                                    ref.invalidate(_reputationProvider(characterId));
                                  }
                                : null,
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 32,
                        child: Text('$value', textAlign: TextAlign.center, style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: value > 0 ? Colors.green : (value < 0 ? Colors.red : Colors.white54),
                        )),
                      ),
                    ],
                  ),
                  if (multiplier != null)
                    Text('Множитель цены: ×$multiplier', style: const TextStyle(fontSize: 11, color: Colors.white38)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
