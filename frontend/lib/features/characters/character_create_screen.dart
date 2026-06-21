import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/providers/characters_provider.dart';

class CharacterCreateScreen extends ConsumerStatefulWidget {
  const CharacterCreateScreen({super.key});

  @override
  ConsumerState<CharacterCreateScreen> createState() => _CharacterCreateScreenState();
}

class _CharacterCreateScreenState extends ConsumerState<CharacterCreateScreen> {
  final _nameCtrl = TextEditingController();
  final _attrs = {'strength': 3, 'dexterity': 3, 'intelligence': 3, 'spirit': 3, 'endurance': 3, 'luck': 3};
  final _labels = {'strength': 'Сила', 'dexterity': 'Ловкость', 'intelligence': 'Интеллект', 'spirit': 'Дух', 'endurance': 'Выносливость', 'luck': 'Удача'};
  bool _loading = false;

  static const _basePoints = 0;

  int _costOf(int v) => v < 4 ? 1 : v - 2;

  int get _totalCost {
    int cost = 0;
    for (final v in _attrs.values) {
      for (int i = 3; i < v; i++) cost += _costOf(i);
      for (int i = v; i < 3; i++) cost -= _costOf(i);
    }
    return cost;
  }

  bool get _isBalanced => _totalCost == 0;

  void _adjust(String attr, int delta) {
    final current = _attrs[attr]!;
    final next = current + delta;
    if (next < 1 || next > 20) return;
    final costDelta = delta > 0 ? _costOf(current) : -_costOf(next);
    setState(() => _attrs[attr] = next);
  }

  Future<void> _create() async {
    if (_nameCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Введите имя персонажа')));
      return;
    }
    if (!_isBalanced) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Бюджет очков должен быть нулевым'), backgroundColor: Colors.red));
      return;
    }
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.post('/characters', data: {'name': _nameCtrl.text.trim(), 'attributes': _attrs});
      final id = response.data['id'] as String;
      ref.invalidate(characterListProvider);
      if (mounted) context.go('/characters/$id');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Новый персонаж')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Имя персонажа', prefixIcon: Icon(Icons.person))),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Характеристики', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: _isBalanced ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
                            border: Border.all(color: _isBalanced ? Colors.green : Colors.red),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _isBalanced ? 'Баланс: ✓' : 'Баланс: ${_totalCost > 0 ? '+' : ''}$_totalCost',
                            style: TextStyle(color: _isBalanced ? Colors.green : Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text('Все хар-ки начинаются с 3. Стоимость повышения от v: 1 если v<4, иначе v−2.', style: TextStyle(color: Colors.white38, fontSize: 11)),
                    const SizedBox(height: 16),
                    ..._attrs.keys.map((attr) => _AttrRow(
                          label: _labels[attr]!,
                          value: _attrs[attr]!,
                          onDecrement: () => _adjust(attr, -1),
                          onIncrement: () => _adjust(attr, 1),
                        )),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: (_loading || !_isBalanced) ? null : _create,
              child: _loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Создать персонажа'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AttrRow extends StatelessWidget {
  final String label;
  final int value;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  const _AttrRow({required this.label, required this.value, required this.onDecrement, required this.onIncrement});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          IconButton(icon: const Icon(Icons.remove_circle_outline, size: 20), onPressed: onDecrement, padding: EdgeInsets.zero, constraints: const BoxConstraints()),
          SizedBox(
            width: 40,
            child: Text('$value', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ),
          IconButton(icon: const Icon(Icons.add_circle_outline, size: 20), onPressed: onIncrement, padding: EdgeInsets.zero, constraints: const BoxConstraints()),
        ],
      ),
    );
  }
}
