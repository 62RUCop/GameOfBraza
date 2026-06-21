import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/widgets/override_label.dart';

class StatsTab extends ConsumerWidget {
  final Character character;
  final String characterId;

  const StatsTab({super.key, required this.character, required this.characterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).asData?.value;
    final isGm = auth?.role == Role.gm || auth?.role == Role.admin;
    final attrs = character.attributes;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (character.unallocatedPoints > 0)
            Card(
              color: Colors.amber.withOpacity(0.15),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.star, color: Colors.amber),
                    const SizedBox(width: 8),
                    Text('${character.unallocatedPoints} нераспределённых очков', style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),
          const Text('Характеристики', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 12),
          if (attrs != null)
            ...Attributes.names.asMap().entries.map((entry) {
              final i = entry.key;
              final attr = entry.value;
              final value = attrs[attr];
              return _AttributeRow(
                label: Attributes.displayNames[i],
                fullLabel: _attrFullNames[attr]!,
                value: value,
              );
            }),
          const SizedBox(height: 24),
          const Text('Производные значения', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: character.derivedValues.map((dv) => _DerivedValueCard(
              dv: dv,
              characterId: characterId,
              isGm: isGm,
              onReset: () async {
                final dio = ref.read(dioProvider);
                await dio.patch('/characters/$characterId/stats/${dv.key}/override', data: {'reset': true});
                ref.invalidate(characterProvider(characterId));
              },
            )).toList(),
          ),
          const SizedBox(height: 24),
          const Text('Текущее состояние', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 12),
          if (character.runtimeState != null) _RuntimeStateEditor(character: character, characterId: characterId),
        ],
      ),
    );
  }

  static const _attrFullNames = {
    'strength': 'Сила',
    'dexterity': 'Ловкость',
    'intelligence': 'Интеллект',
    'spirit': 'Дух',
    'endurance': 'Выносливость',
    'luck': 'Удача',
  };
}

class _AttributeRow extends StatelessWidget {
  final String label;
  final String fullLabel;
  final int value;

  const _AttributeRow({required this.label, required this.fullLabel, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(width: 40, child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white70))),
              const SizedBox(width: 8),
              Expanded(child: Text(fullLabel, style: const TextStyle(color: Colors.white54, fontSize: 12))),
              Text('$value', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 4),
          _AttributeRibbon(value: value),
        ],
      ),
    );
  }
}

class _AttributeRibbon extends StatelessWidget {
  final int value;

  const _AttributeRibbon({required this.value});

  @override
  Widget build(BuildContext context) {
    final displayCells = value > 20 ? value : 20;
    final rows = (displayCells / 20).ceil();

    return Column(
      children: List.generate(rows, (rowIndex) {
        final startCell = rowIndex * 20;
        final endCell = ((rowIndex + 1) * 20).clamp(0, displayCells);
        return Row(
          children: List.generate(endCell - startCell, (i) {
            final cellIndex = startCell + i;
            final filled = cellIndex < value;
            final isSecondLayer = rowIndex > 0;
            return Expanded(
              child: Container(
                height: 12,
                margin: const EdgeInsets.all(1),
                decoration: BoxDecoration(
                  color: filled
                      ? (isSecondLayer ? Colors.amber : Theme.of(context).colorScheme.primary)
                      : Colors.white12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
        );
      }),
    );
  }
}

class _DerivedValueCard extends StatelessWidget {
  final DerivedValue dv;
  final String characterId;
  final bool isGm;
  final VoidCallback onReset;

  const _DerivedValueCard({required this.dv, required this.characterId, required this.isGm, required this.onReset});

  static const _labels = {
    'hp_max': 'HP макс.',
    'mana_max': 'Мана макс.',
    'ap_max': 'AP макс.',
    'dodge': 'Уклонение',
    'armor': 'Броня',
    'slots': 'Ячейки навыков',
    'bubble_charges': 'Заряды пузыря',
    'luck_class_crit_bonus': 'Крит (Удача)',
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(8),
        border: dv.manualOverride ? Border.all(color: Colors.orange, width: 1.5) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_labels[dv.key] ?? dv.key, style: const TextStyle(fontSize: 11, color: Colors.white54)),
          const SizedBox(height: 4),
          dv.manualOverride
              ? OverrideLabel(value: dv.effectiveValue, onReset: isGm ? onReset : null)
              : Text('${dv.effectiveValue}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
        ],
      ),
    );
  }
}

class _RuntimeStateEditor extends ConsumerStatefulWidget {
  final Character character;
  final String characterId;

  const _RuntimeStateEditor({required this.character, required this.characterId});

  @override
  ConsumerState<_RuntimeStateEditor> createState() => _RuntimeStateEditorState();
}

class _RuntimeStateEditorState extends ConsumerState<_RuntimeStateEditor> {
  Future<void> _patch(Map<String, dynamic> data) async {
    try {
      final dio = ref.read(dioProvider);
      await dio.patch('/characters/${widget.characterId}/runtime', data: data);
      ref.invalidate(characterProvider(widget.characterId));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    final rs = widget.character.runtimeState!;
    final hpMax = widget.character.getDerivedValue('hp_max');
    final manaMax = widget.character.getDerivedValue('mana_max');
    final apMax = widget.character.getDerivedValue('ap_max');

    return Column(
      children: [
        _BarRow(label: 'HP', current: rs.currentHp, max: hpMax, color: Colors.red, onChanged: (v) => _patch({'current_hp': v})),
        _BarRow(label: 'Мана', current: rs.currentMana, max: manaMax, color: Colors.blue, onChanged: (v) => _patch({'current_mana': v})),
        _BarRow(label: 'AP', current: rs.currentAp, max: apMax, color: Colors.green, onChanged: (v) => _patch({'current_ap': v})),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Пузырь защиты'),
                Row(
                  children: [
                    if (rs.bubbleActive) Text('${rs.bubblePersistChance}%', style: const TextStyle(color: Colors.cyan)),
                    const SizedBox(width: 8),
                    Switch(value: rs.bubbleActive, onChanged: (v) => _patch({'bubble_active': v})),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _BarRow extends StatefulWidget {
  final String label;
  final int current;
  final int max;
  final Color color;
  final void Function(int) onChanged;

  const _BarRow({required this.label, required this.current, required this.max, required this.color, required this.onChanged});

  @override
  State<_BarRow> createState() => _BarRowState();
}

class _BarRowState extends State<_BarRow> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: '${widget.current}');
  }

  @override
  void didUpdateWidget(_BarRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.current != widget.current) {
      _ctrl.text = '${widget.current}';
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pct = widget.max > 0 ? (widget.current / widget.max).clamp(0.0, 1.0) : 0.0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(width: 50, child: Text(widget.label, style: const TextStyle(fontWeight: FontWeight.bold))),
          Expanded(
            child: Stack(
              children: [
                Container(height: 24, decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(4))),
                FractionallySizedBox(
                  widthFactor: pct,
                  child: Container(height: 24, decoration: BoxDecoration(color: widget.color.withOpacity(0.6), borderRadius: BorderRadius.circular(4))),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 48,
            child: TextField(
              controller: _ctrl,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12),
              decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(vertical: 4, horizontal: 4)),
              onSubmitted: (v) {
                final val = int.tryParse(v);
                if (val != null) widget.onChanged(val);
              },
            ),
          ),
          Text('/ ${widget.max}', style: const TextStyle(color: Colors.white54, fontSize: 12)),
        ],
      ),
    );
  }
}
