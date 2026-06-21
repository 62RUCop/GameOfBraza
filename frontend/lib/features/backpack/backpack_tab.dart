import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';

final _backpackProvider = FutureProvider.family<List<Map<String, dynamic>?>, String>((ref, charId) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/characters/$charId/backpack');
  return (response.data as List).map((e) => e as Map<String, dynamic>?).toList();
});

final _currencyProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, charId) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/characters/$charId/currency');
  return response.data as Map<String, dynamic>;
});

class BackpackTab extends ConsumerWidget {
  final String characterId;

  const BackpackTab({super.key, required this.characterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final backpackAsync = ref.watch(_backpackProvider(characterId));
    final currencyAsync = ref.watch(_currencyProvider(characterId));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          currencyAsync.when(
            loading: () => const CircularProgressIndicator(),
            error: (e, _) => Text('Ошибка загрузки валюты: $e', style: const TextStyle(color: Colors.red)),
            data: (curr) => _CurrencyCard(characterId: characterId, balanceBronze: (curr['balance_bronze'] as num).toDouble(), ref: ref),
          ),
          const SizedBox(height: 16),
          const Text('Рюкзак', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),
          backpackAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('Ошибка: $e', style: const TextStyle(color: Colors.red)),
            data: (slots) => Column(
              children: slots.asMap().entries.map((entry) {
                final i = entry.key;
                final slot = entry.value;
                return _BackpackSlotCard(
                  slotIndex: i + 1,
                  slot: slot,
                  characterId: characterId,
                  onSave: () => ref.invalidate(_backpackProvider(characterId)),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _CurrencyCard extends StatelessWidget {
  final String characterId;
  final double balanceBronze;
  final WidgetRef ref;

  const _CurrencyCard({required this.characterId, required this.balanceBronze, required this.ref});

  String _format() {
    final bronze = balanceBronze.toInt();
    final gold = bronze ~/ 100;
    final silver = (bronze % 100) ~/ 10;
    final b = bronze % 10;
    final parts = <String>[];
    if (gold > 0) parts.add('${gold} зол.');
    if (silver > 0) parts.add('${silver} сер.');
    if (b > 0 || parts.isEmpty) parts.add('${b} бр.');
    return parts.join(' ');
  }

  void _showTransactionDialog(BuildContext context) {
    final amountCtrl = TextEditingController();
    final targetCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Изменить баланс'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: amountCtrl, keyboardType: const TextInputType.numberWithOptions(signed: true, decimal: true), decoration: const InputDecoration(labelText: 'Сумма (бронза, +/-)')),
            const SizedBox(height: 8),
            TextField(controller: targetCtrl, decoration: const InputDecoration(labelText: 'Цель транзакции *')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          ElevatedButton(
            onPressed: () async {
              if (targetCtrl.text.isEmpty) return;
              final amount = double.tryParse(amountCtrl.text);
              if (amount == null) return;
              Navigator.pop(ctx);
              final dio = ref.read(dioProvider);
              await dio.post('/characters/$characterId/currency/transaction', data: {'amount_bronze': amount, 'money_target': targetCtrl.text});
              ref.invalidate(_currencyProvider(characterId));
            },
            child: const Text('Применить'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.monetization_on, color: Colors.amber, size: 32),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Монеты', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(_format(), style: const TextStyle(fontSize: 18, color: Colors.amber)),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: () => _showTransactionDialog(context),
              child: const Text('Изменить'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BackpackSlotCard extends ConsumerStatefulWidget {
  final int slotIndex;
  final Map<String, dynamic>? slot;
  final String characterId;
  final VoidCallback onSave;

  const _BackpackSlotCard({required this.slotIndex, required this.slot, required this.characterId, required this.onSave});

  @override
  ConsumerState<_BackpackSlotCard> createState() => _BackpackSlotCardState();
}

class _BackpackSlotCardState extends ConsumerState<_BackpackSlotCard> {
  bool _expanded = false;
  late final TextEditingController _nameCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _qtyCtrl;
  String _type = 'misc';

  static const _types = ['food', 'scroll', 'herb', 'potion', 'misc', 'quest', 'other'];
  static const _typeLabels = {'food': 'Еда', 'scroll': 'Свиток', 'herb': 'Трава', 'potion': 'Зелье', 'misc': 'Разное', 'quest': 'Квест', 'other': 'Другое'};

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.slot?['item_name'] as String? ?? '');
    _descCtrl = TextEditingController(text: widget.slot?['description'] as String? ?? '');
    _qtyCtrl = TextEditingController(text: '${widget.slot?['quantity'] ?? 1}');
    _type = widget.slot?['item_type'] as String? ?? 'misc';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _qtyCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameCtrl.text.isEmpty) return;
    final dio = ref.read(dioProvider);
    await dio.post('/characters/${widget.characterId}/backpack/${widget.slotIndex}', data: {
      'item_name': _nameCtrl.text,
      'item_type': _type,
      'description': _descCtrl.text.isEmpty ? null : _descCtrl.text,
      'quantity': int.tryParse(_qtyCtrl.text) ?? 1,
    });
    widget.onSave();
    setState(() => _expanded = false);
  }

  Future<void> _clear() async {
    final dio = ref.read(dioProvider);
    await dio.delete('/characters/${widget.characterId}/backpack/${widget.slotIndex}');
    widget.onSave();
  }

  @override
  Widget build(BuildContext context) {
    final isEmpty = widget.slot?['item_name'] == null;

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ExpansionTile(
        leading: CircleAvatar(radius: 14, child: Text('${widget.slotIndex}', style: const TextStyle(fontSize: 12))),
        title: Text(isEmpty ? 'Пустая ячейка ${widget.slotIndex}' : (widget.slot!['item_name'] as String), style: TextStyle(color: isEmpty ? Colors.white24 : null)),
        subtitle: !isEmpty ? Text('${_typeLabels[widget.slot!['item_type']]} × ${widget.slot!['quantity']}', style: const TextStyle(fontSize: 11)) : null,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Название', isDense: true)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _type,
                  items: _types.map((t) => DropdownMenuItem(value: t, child: Text(_typeLabels[t]!))).toList(),
                  onChanged: (v) => setState(() => _type = v ?? 'misc'),
                  decoration: const InputDecoration(labelText: 'Тип', isDense: true),
                ),
                const SizedBox(height: 8),
                TextField(controller: _qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Кол-во', isDense: true)),
                const SizedBox(height: 8),
                TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Описание', isDense: true)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: ElevatedButton(onPressed: _save, child: const Text('Сохранить'))),
                    if (!isEmpty) ...[
                      const SizedBox(width: 8),
                      OutlinedButton(onPressed: _clear, child: const Text('Очистить', style: TextStyle(color: Colors.red))),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
