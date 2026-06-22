import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/models.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/override_label.dart';

class StatsTab extends ConsumerWidget {
  final String characterId;

  const StatsTab({super.key, required this.characterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final characterAsync = ref.watch(characterProvider(characterId));
    final auth = ref.watch(authProvider).valueOrNull;

    return characterAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (character) => RefreshIndicator(
        onRefresh: () =>
            ref.read(characterProvider(characterId).notifier).reload(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Runtime state bar
            if (character.runtimeState != null)
              _RuntimeBar(
                character: character,
                onEdit: auth?.canEdit == true || auth?.isPlayer == true
                    ? (updates) => ref
                        .read(characterProvider(characterId).notifier)
                        .patchRuntime(updates)
                    : null,
              ),
            const SizedBox(height: 16),

            // Unallocated points banner
            if (character.unallocatedPoints > 0)
              _UnallocatedPointsBanner(
                character: character,
                canAllocate: true,
                characterId: characterId,
              ),

            // Attribute ribbons
            Text('Атрибуты',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (character.attributes != null)
              ...Attributes.fullLabels.entries.map((e) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _AttributeRibbon(
                      label: e.value,
                      shortLabel: Attributes.labels[e.key] ?? e.key,
                      value: character.attributes!.asMap[e.key] ?? 0,
                    ),
                  )),
            const SizedBox(height: 8),

            // Derived values
            Text('Производные',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _DerivedValuesGrid(
              character: character,
              isGm: auth?.isGmOrAdmin ?? false,
              onReset: (key) => ref
                  .read(characterProvider(characterId).notifier)
                  .overrideStat(key, reset: true),
              onOverride: auth?.isGmOrAdmin == true
                  ? (key, value) => ref
                      .read(characterProvider(characterId).notifier)
                      .overrideStat(key, value: value)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Attribute ribbon (20-cell) ────────────────────────────────────────────────

class _AttributeRibbon extends StatelessWidget {
  final String label;
  final String shortLabel;
  final int value;

  const _AttributeRibbon({
    required this.label,
    required this.shortLabel,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final layers = (value / 20).ceil().clamp(1, 13);
    final fullLayers = value ~/ 20;
    final remainder = value % 20;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            SizedBox(
              width: 100,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: AppTheme.onSurfaceMuted)),
                  Text(
                    shortLabel,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Column(
                children: [
                  for (int layer = 0; layer < layers; layer++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 3),
                      child: _RibbonRow(
                        filled: layer < fullLayers
                            ? 20
                            : (layer == fullLayers ? remainder : 0),
                        isOverflow: layer > 0,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 36,
              child: Text(
                '$value',
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _RibbonRow extends StatelessWidget {
  final int filled;
  final bool isOverflow;

  const _RibbonRow({required this.filled, required this.isOverflow});

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final fill = isOverflow
        ? primary.withAlpha(180)
        : primary;
    final empty = AppTheme.surfaceVariant;

    return Row(
      children: List.generate(20, (i) {
        final active = i < filled;
        return Expanded(
          child: Container(
            height: 10,
            margin: const EdgeInsets.symmetric(horizontal: 1),
            decoration: BoxDecoration(
              color: active ? fill : empty,
              borderRadius: BorderRadius.circular(2),
              border: isOverflow && active
                  ? Border.all(
                      color: primary.withAlpha(200), width: 0.5)
                  : null,
            ),
          ),
        );
      }),
    );
  }
}

// ── Derived values grid ───────────────────────────────────────────────────────

class _DerivedValuesGrid extends StatelessWidget {
  final Character character;
  final bool isGm;
  final void Function(String key) onReset;
  final void Function(String key, int value)? onOverride;

  const _DerivedValuesGrid({
    required this.character,
    required this.isGm,
    required this.onReset,
    this.onOverride,
  });

  @override
  Widget build(BuildContext context) {
    final dvs = character.derivedValues;
    if (dvs.isEmpty) {
      return const Text('Производные значения недоступны',
          style: TextStyle(color: AppTheme.onSurfaceMuted));
    }
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: dvs
          .where((d) => DerivedValue.labels.containsKey(d.key))
          .map((dv) => _DerivedValueCard(
                dv: dv,
                isGm: isGm,
                onReset: () => onReset(dv.key),
                onOverride: onOverride != null
                    ? (v) => onOverride!(dv.key, v)
                    : null,
              ))
          .toList(),
    );
  }
}

class _DerivedValueCard extends StatelessWidget {
  final DerivedValue dv;
  final bool isGm;
  final VoidCallback onReset;
  final void Function(int)? onOverride;

  const _DerivedValueCard({
    required this.dv,
    required this.isGm,
    required this.onReset,
    this.onOverride,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final label = DerivedValue.labels[dv.key] ?? dv.key;

    return SizedBox(
      width: 140,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: AppTheme.onSurfaceMuted)),
              const SizedBox(height: 4),
              OverrideLabel(
                manualOverride: dv.manualOverride,
                onReset: dv.manualOverride ? onReset : null,
                child: Text(
                  '${dv.effectiveValue}',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: dv.manualOverride
                        ? theme.colorScheme.secondary
                        : theme.colorScheme.onSurface,
                  ),
                ),
              ),
              if (dv.manualOverride && dv.computedValue != dv.effectiveValue)
                Text(
                  'авто: ${dv.computedValue}',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: AppTheme.onSurfaceMuted),
                ),
              if (isGm && onOverride != null && !dv.manualOverride)
                TextButton(
                  onPressed: () => _showOverrideDialog(context),
                  style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                  child: const Text('Override', style: TextStyle(fontSize: 11)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showOverrideDialog(BuildContext context) {
    final ctrl = TextEditingController(text: '${dv.effectiveValue}');
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Переопределить ${DerivedValue.labels[dv.key] ?? dv.key}'),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Новое значение'),
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Отмена')),
          ElevatedButton(
            onPressed: () {
              final v = int.tryParse(ctrl.text);
              if (v != null) {
                onOverride!(v);
                Navigator.pop(context);
              }
            },
            child: const Text('Сохранить'),
          ),
        ],
      ),
    );
  }
}

// ── Unallocated points banner ─────────────────────────────────────────────────

class _UnallocatedPointsBanner extends ConsumerWidget {
  final Character character;
  final bool canAllocate;
  final String characterId;

  const _UnallocatedPointsBanner({
    required this.character,
    required this.canAllocate,
    required this.characterId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withAlpha(30),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: theme.colorScheme.primary.withAlpha(80)),
      ),
      child: Row(
        children: [
          Icon(Icons.star, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '${character.unallocatedPoints} очков доступно для распределения',
              style: TextStyle(color: theme.colorScheme.primary),
            ),
          ),
          if (canAllocate)
            TextButton(
              onPressed: () => _showAllocateDialog(context, ref),
              child: const Text('Распределить'),
            ),
        ],
      ),
    );
  }

  void _showAllocateDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => _AllocateDialog(
        character: character,
        characterId: characterId,
      ),
    );
  }
}

class _AllocateDialog extends ConsumerStatefulWidget {
  final Character character;
  final String characterId;

  const _AllocateDialog({required this.character, required this.characterId});

  @override
  ConsumerState<_AllocateDialog> createState() => _AllocateDialogState();
}

class _AllocateDialogState extends ConsumerState<_AllocateDialog> {
  final _pending = <String, int>{};
  bool _loading = false;

  int _pendingCost(String attr) {
    final delta = _pending[attr] ?? 0;
    if (delta == 0) return 0;
    final base = widget.character.attributes?.asMap[attr] ?? 3;
    int cost = 0;
    for (int v = base; v < base + delta; v++) {
      cost += v < 4 ? 1 : v - 2;
    }
    return cost;
  }

  int get _totalPendingCost =>
      Attributes.fullLabels.keys.fold(0, (s, k) => s + _pendingCost(k));

  int get _remaining =>
      widget.character.unallocatedPoints - _totalPendingCost;

  Future<void> _apply() async {
    setState(() => _loading = true);
    try {
      for (final entry in _pending.entries) {
        if (entry.value > 0) {
          await ref
              .read(characterProvider(widget.characterId).notifier)
              .confirmAllocate(entry.key, entry.value);
        }
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Распределить очки (осталось: $_remaining)'),
      content: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: Attributes.fullLabels.entries.map((e) {
            final key = e.key;
            final base = widget.character.attributes?.asMap[key] ?? 3;
            final delta = _pending[key] ?? 0;
            final incCost = (base + delta) < 4 ? 1 : (base + delta) - 2;
            final canInc = incCost <= _remaining;

            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  SizedBox(
                      width: 100,
                      child: Text(e.value,
                          style: Theme.of(context).textTheme.bodyMedium)),
                  Text('$base',
                      style: const TextStyle(color: AppTheme.onSurfaceMuted)),
                  if (delta > 0) Text(' → ${base + delta}'),
                  const Spacer(),
                  IconButton(
                    iconSize: 18,
                    icon: const Icon(Icons.remove),
                    onPressed: delta > 0
                        ? () => setState(
                            () => _pending[key] = (delta - 1).clamp(0, 99))
                        : null,
                  ),
                  Text('$delta',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  IconButton(
                    iconSize: 18,
                    icon: const Icon(Icons.add),
                    onPressed:
                        canInc ? () => setState(() => _pending[key] = delta + 1) : null,
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена')),
        ElevatedButton(
          onPressed: (_loading || _totalPendingCost == 0) ? null : _apply,
          child: _loading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Применить'),
        ),
      ],
    );
  }
}

// ── Runtime state bar ─────────────────────────────────────────────────────────

class _RuntimeBar extends StatelessWidget {
  final Character character;
  final Future<void> Function(Map<String, dynamic>)? onEdit;

  const _RuntimeBar({required this.character, this.onEdit});

  @override
  Widget build(BuildContext context) {
    final rs = character.runtimeState!;
    final hpMax = character.hpMax;
    final manaMax = character.manaMax;
    final apMax = character.apMax;
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _BarRow(
              label: 'HP',
              current: rs.currentHp,
              max: hpMax,
              color: AppTheme.hpColor,
              onTap: onEdit == null
                  ? null
                  : () => _editValue(context, 'HP', rs.currentHp, 0, hpMax,
                      (v) => onEdit!({'current_hp': v})),
            ),
            const SizedBox(height: 8),
            _BarRow(
              label: 'Мана',
              current: rs.currentMana,
              max: manaMax,
              color: AppTheme.manaColor,
              onTap: onEdit == null
                  ? null
                  : () => _editValue(
                      context, 'Мана', rs.currentMana, 0, manaMax,
                      (v) => onEdit!({'current_mana': v})),
            ),
            const SizedBox(height: 8),
            _BarRow(
              label: 'ОД',
              current: rs.currentAp,
              max: apMax,
              color: AppTheme.apColor,
              onTap: onEdit == null
                  ? null
                  : () => _editValue(
                      context, 'Очки действий', rs.currentAp, 0, apMax,
                      (v) => onEdit!({'current_ap': v})),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Сытость: ${rs.satietyCurrent}',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
                if (rs.bubbleActive)
                  Chip(
                    label: Text('Пузырь ${rs.bubblePersistChanceCurrent}%',
                        style: const TextStyle(fontSize: 11)),
                    avatar: const Icon(Icons.bubble_chart, size: 14),
                    padding: EdgeInsets.zero,
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _editValue(BuildContext context, String label, int current, int min,
      int max, void Function(int) onSave) {
    final ctrl = TextEditingController(text: '$current');
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Изменить $label'),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          decoration:
              InputDecoration(labelText: '$label ($min–$max)'),
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Отмена')),
          ElevatedButton(
            onPressed: () {
              final v = int.tryParse(ctrl.text);
              if (v != null && v >= min) {
                onSave(v);
                Navigator.pop(context);
              }
            },
            child: const Text('Сохранить'),
          ),
        ],
      ),
    );
  }
}

class _BarRow extends StatelessWidget {
  final String label;
  final int current;
  final int max;
  final Color color;
  final VoidCallback? onTap;

  const _BarRow({
    required this.label,
    required this.current,
    required this.max,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fraction = max > 0 ? (current / max).clamp(0.0, 1.0) : 0.0;
    return Row(
      children: [
        SizedBox(
          width: 40,
          child: Text(label,
              style: const TextStyle(
                  fontSize: 12, color: AppTheme.onSurfaceMuted)),
        ),
        Expanded(
          child: GestureDetector(
            onTap: onTap,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: fraction,
                minHeight: 14,
                backgroundColor: AppTheme.surfaceVariant,
                valueColor: AlwaysStoppedAnimation<Color>(color),
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: onTap,
          child: Text(
            '$current / $max',
            style: TextStyle(
                fontSize: 12, color: color, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
