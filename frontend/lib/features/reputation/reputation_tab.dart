import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/models.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/theme/app_theme.dart';

class ReputationTab extends ConsumerWidget {
  final String characterId;

  const ReputationTab({super.key, required this.characterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repAsync = ref.watch(reputationProvider(characterId));
    final auth = ref.watch(authProvider).valueOrNull;

    return repAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (reputation) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(reputationProvider(characterId)),
        child: reputation.isEmpty
            ? const Center(
                child: Text('Нет фракций',
                    style: TextStyle(color: AppTheme.onSurfaceMuted)))
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: reputation.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _ReputationCard(
                  rep: reputation[i],
                  isGm: auth?.isGmOrAdmin ?? false,
                  onUpdate: (value) async {
                    await ref
                        .read(apiClientProvider)
                        .updateReputation(
                            characterId, reputation[i].faction.id, value);
                    ref.invalidate(reputationProvider(characterId));
                  },
                ),
              ),
      ),
    );
  }
}

class _ReputationCard extends StatelessWidget {
  final ReputationOut rep;
  final bool isGm;
  final Future<void> Function(int) onUpdate;

  const _ReputationCard({
    required this.rep,
    required this.isGm,
    required this.onUpdate,
  });

  Color _barColor(int value) {
    if (value >= 7) return Colors.green;
    if (value >= 3) return Colors.lightGreen;
    if (value >= 0) return Colors.yellow;
    if (value >= -3) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final value = rep.value;
    final fraction = (value + 10) / 20;
    final barColor = _barColor(value);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(rep.faction.name,
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: barColor.withAlpha(40),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: barColor.withAlpha(120)),
                  ),
                  child: Text(
                    rep.rangeLabel,
                    style: TextStyle(
                        color: barColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                const Text('-10',
                    style: TextStyle(
                        fontSize: 11, color: AppTheme.onSurfaceMuted)),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: fraction.clamp(0.0, 1.0),
                        minHeight: 10,
                        backgroundColor: AppTheme.surfaceVariant,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(barColor),
                      ),
                    ),
                  ),
                ),
                const Text('+10',
                    style: TextStyle(
                        fontSize: 11, color: AppTheme.onSurfaceMuted)),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  'Репутация: $value',
                  style: theme.textTheme.bodySmall,
                ),
                if (rep.priceMultiplier != null) ...[
                  const SizedBox(width: 12),
                  Text(
                    'Цены: ×${rep.priceMultiplier!.toStringAsFixed(2)}',
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: AppTheme.onSurfaceMuted),
                  ),
                ],
                const Spacer(),
                if (isGm)
                  TextButton(
                    onPressed: () =>
                        _showEditDialog(context, value),
                    child: const Text('Изменить'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showEditDialog(BuildContext context, int current) {
    int draft = current;
    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: Text('Репутация: ${rep.faction.name}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$draft',
                  style: const TextStyle(
                      fontSize: 32, fontWeight: FontWeight.bold)),
              Slider(
                value: draft.toDouble(),
                min: -10,
                max: 10,
                divisions: 20,
                label: '$draft',
                onChanged: (v) => setDlgState(() => draft = v.round()),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Отмена')),
            ElevatedButton(
              onPressed: () {
                onUpdate(draft);
                Navigator.pop(ctx);
              },
              child: const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
  }
}
