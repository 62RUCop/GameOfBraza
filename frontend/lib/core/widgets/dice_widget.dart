import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';

const _diceFaces = [4, 6, 8, 10, 12, 20, 60, 100];

class DiceWidget extends ConsumerStatefulWidget {
  const DiceWidget({super.key});

  @override
  ConsumerState<DiceWidget> createState() => _DiceWidgetState();
}

class _DiceWidgetState extends ConsumerState<DiceWidget> {
  int _selectedFaces = 20;
  int? _result;
  bool _rolling = false;
  final _manualController = TextEditingController();

  @override
  void dispose() {
    _manualController.dispose();
    super.dispose();
  }

  Future<void> _roll() async {
    setState(() {
      _rolling = true;
      _result = null;
    });
    try {
      final result =
          await ref.read(apiClientProvider).rollDice(_selectedFaces);
      _manualController.text = result.toString();
      setState(() => _result = result);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка броска: $e')),
        );
      }
    } finally {
      setState(() => _rolling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Бросок кубика',
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _diceFaces.map((f) {
              final selected = f == _selectedFaces;
              return ChoiceChip(
                label: Text('d$f'),
                selected: selected,
                onSelected: (_) => setState(() => _selectedFaces = f),
                selectedColor:
                    theme.colorScheme.primary.withAlpha(50),
                labelStyle: TextStyle(
                  color: selected
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurface,
                  fontWeight:
                      selected ? FontWeight.bold : FontWeight.normal,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _manualController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Результат',
                    hintText: 'Введите вручную или бросьте',
                  ),
                  onChanged: (v) {
                    final parsed = int.tryParse(v);
                    if (parsed != null) setState(() => _result = parsed);
                  },
                ),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                onPressed: _rolling ? null : _roll,
                icon: _rolling
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.casino),
                label: const Text('Бросить'),
              ),
            ],
          ),
          if (_result != null) ...[
            const SizedBox(height: 12),
            Center(
              child: Text(
                '$_result',
                style: theme.textTheme.displaySmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

void showDiceBottomSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (_) => const DiceWidget(),
  );
}
