import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/models/models.dart';

class CharacterCreateScreen extends ConsumerStatefulWidget {
  const CharacterCreateScreen({super.key});

  @override
  ConsumerState<CharacterCreateScreen> createState() =>
      _CharacterCreateScreenState();
}

class _CharacterCreateScreenState
    extends ConsumerState<CharacterCreateScreen> {
  final _nameCtrl = TextEditingController();
  String? _selectedRaceId;
  bool _isNpc = false;
  bool _loading = false;

  // Point-buy state
  static const _startValue = 3;
  static const _totalPoints = 12;
  final _attrs = {
    'strength': _startValue,
    'dexterity': _startValue,
    'intelligence': _startValue,
    'spirit': _startValue,
    'endurance': _startValue,
    'luck': _startValue,
  };

  int get _spentPoints {
    int total = 0;
    for (final v in _attrs.values) {
      total += _cost(_startValue, v);
    }
    return total;
  }

  int get _remainingPoints => _totalPoints - _spentPoints;

  int _cost(int from, int to) {
    if (to <= from) return 0;
    int cost = 0;
    for (int v = from; v < to; v++) {
      cost += v < 4 ? 1 : v - 2;
    }
    return cost;
  }

  int _incrementCost(int current) => current < 4 ? 1 : current - 2;

  void _increment(String attr) {
    final cur = _attrs[attr]!;
    final cost = _incrementCost(cur);
    if (cost > _remainingPoints) return;
    setState(() => _attrs[attr] = cur + 1);
  }

  void _decrement(String attr) {
    final cur = _attrs[attr]!;
    if (cur <= _startValue) return;
    setState(() => _attrs[attr] = cur - 1);
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Введите имя персонажа')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final char = await ref.read(characterListProvider.notifier).create(
            name: _nameCtrl.text.trim(),
            raceId: _selectedRaceId,
            attributes: Map<String, int>.from(_attrs),
            isNpc: _isNpc,
          );
      if (mounted) context.go('/characters/${char.id}');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка создания персонажа: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final racesAsync = ref.watch(racesProvider);
    final auth = ref.watch(authProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go('/characters')),
        title: const Text('Новый персонаж'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Name
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Имя персонажа',
                prefixIcon: Icon(Icons.person_outlined),
              ),
            ),
            const SizedBox(height: 16),

            // Race picker
            racesAsync.when(
              loading: () =>
                  const LinearProgressIndicator(),
              error: (_, __) => const Text('Ошибка загрузки рас'),
              data: (races) => DropdownButtonFormField<String>(
                value: _selectedRaceId,
                decoration: const InputDecoration(
                  labelText: 'Раса',
                  prefixIcon: Icon(Icons.emoji_nature_outlined),
                ),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('Не выбрана'),
                  ),
                  ...races.map((r) => DropdownMenuItem(
                        value: r.id,
                        child: Text(r.name),
                      )),
                ],
                onChanged: (v) => setState(() => _selectedRaceId = v),
              ),
            ),
            const SizedBox(height: 16),

            // NPC toggle for GM/admin
            if (auth?.isGmOrAdmin ?? false)
              SwitchListTile(
                value: _isNpc,
                onChanged: (v) => setState(() => _isNpc = v),
                title: const Text('NPC'),
                subtitle: const Text('Персонаж-неигрок'),
                contentPadding: EdgeInsets.zero,
              ),

            const SizedBox(height: 24),
            Text('Распределение очков',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            _PointsBudgetBar(
                remaining: _remainingPoints, total: _totalPoints),
            const SizedBox(height: 16),

            // Attribute rows
            ...Attributes.fullLabels.entries.map((entry) {
              final key = entry.key;
              final label = entry.value;
              final shortLabel = Attributes.labels[key] ?? key;
              final value = _attrs[key]!;
              final canInc =
                  _incrementCost(value) <= _remainingPoints;
              final canDec = value > _startValue;

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    SizedBox(
                      width: 100,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(label,
                              style: theme.textTheme.bodyMedium),
                          Text(shortLabel,
                              style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.primary)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: canDec ? () => _decrement(key) : null,
                      color: theme.colorScheme.error,
                      iconSize: 20,
                    ),
                    SizedBox(
                      width: 36,
                      child: Text(
                        '$value',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: canInc ? () => _increment(key) : null,
                      color: theme.colorScheme.primary,
                      iconSize: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'цена +1: ${_incrementCost(value)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withAlpha(120),
                      ),
                    ),
                  ],
                ),
              );
            }),

            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_loading || _remainingPoints < 0) ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Создать персонажа'),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _PointsBudgetBar extends StatelessWidget {
  final int remaining;
  final int total;

  const _PointsBudgetBar({required this.remaining, required this.total});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fraction = (total - remaining) / total;
    final color = remaining < 0
        ? theme.colorScheme.error
        : remaining == 0
            ? Colors.green
            : theme.colorScheme.primary;

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Осталось очков:',
                style: theme.textTheme.bodyMedium),
            Text(
              '$remaining / $total',
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: color, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: fraction.clamp(0.0, 1.0),
            minHeight: 6,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}
