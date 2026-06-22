import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/models.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/theme/app_theme.dart';

class BackpackTab extends ConsumerWidget {
  final String characterId;

  const BackpackTab({super.key, required this.characterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final backpackAsync = ref.watch(backpackProvider(characterId));
    final currencyAsync = ref.watch(currencyProvider(characterId));

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(backpackProvider(characterId));
        ref.invalidate(currencyProvider(characterId));
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Currency block
          currencyAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => Text('Ошибка валюты: $e'),
            data: (currency) => _CurrencyBlock(
              currency: currency,
              onTransaction: () =>
                  _showTransactionDialog(context, ref, currency),
            ),
          ),
          const SizedBox(height: 20),

          // Backpack slots
          Text('Рюкзак (6 ячеек)',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          backpackAsync.when(
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => Text('Ошибка: $e'),
            data: (slots) => Column(
              children: List.generate(6, (i) {
                final slotIndex = i + 1;
                final slot = slots.firstWhere(
                  (s) => s.slotIndex == slotIndex,
                  orElse: () => BackpackSlot(slotIndex: slotIndex),
                );
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _BackpackSlotCard(
                    slot: slot,
                    onSave: (data) async {
                      await ref
                          .read(apiClientProvider)
                          .setBackpackSlot(characterId, slotIndex, data);
                      ref.invalidate(backpackProvider(characterId));
                    },
                    onClear: slot.isEmpty
                        ? null
                        : () async {
                            await ref
                                .read(apiClientProvider)
                                .clearBackpackSlot(characterId, slotIndex);
                            ref.invalidate(backpackProvider(characterId));
                          },
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  void _showTransactionDialog(
      BuildContext context, WidgetRef ref, CurrencyOut currency) {
    showDialog(
      context: context,
      builder: (_) => _TransactionDialog(
        characterId: characterId,
        currentBalance: currency.balanceBronze,
        onDone: () => ref.invalidate(currencyProvider(characterId)),
      ),
    );
  }
}

// ── Currency block ────────────────────────────────────────────────────────────

class _CurrencyBlock extends StatelessWidget {
  final CurrencyOut currency;
  final VoidCallback onTransaction;

  const _CurrencyBlock(
      {required this.currency, required this.onTransaction});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Валюта',
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.bold)),
                TextButton.icon(
                  icon: const Icon(Icons.swap_horiz, size: 16),
                  label: const Text('Изменить'),
                  onPressed: onTransaction,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _CoinWidget(
                    amount: currency.gold, label: 'зол.', color: const Color(0xFFFFD700)),
                const SizedBox(width: 16),
                _CoinWidget(
                    amount: currency.silver,
                    label: 'сер.',
                    color: const Color(0xFFC0C0C0)),
                const SizedBox(width: 16),
                _CoinWidget(
                    amount: currency.bronze,
                    label: 'бр.',
                    color: const Color(0xFFCD7F32)),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Всего: ${currency.balanceBronze.toStringAsFixed(0)} бронзы',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: AppTheme.onSurfaceMuted),
            ),
            if (currency.transactions.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Text('Последние операции',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: AppTheme.onSurfaceMuted)),
              const SizedBox(height: 4),
              ...currency.transactions.take(5).map((tx) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(
                      children: [
                        Icon(
                          tx.amountBronze >= 0
                              ? Icons.arrow_upward
                              : Icons.arrow_downward,
                          size: 12,
                          color: tx.amountBronze >= 0
                              ? Colors.green
                              : theme.colorScheme.error,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            tx.moneyTarget,
                            style: theme.textTheme.bodySmall,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          '${tx.amountBronze >= 0 ? "+" : ""}${tx.amountBronze.toStringAsFixed(0)} бр.',
                          style: TextStyle(
                            fontSize: 11,
                            color: tx.amountBronze >= 0
                                ? Colors.green
                                : theme.colorScheme.error,
                          ),
                        ),
                      ],
                    ),
                  )),
            ],
          ],
        ),
      ),
    );
  }
}

class _CoinWidget extends StatelessWidget {
  final int amount;
  final String label;
  final Color color;

  const _CoinWidget(
      {required this.amount, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withAlpha(30),
            shape: BoxShape.circle,
            border: Border.all(color: color.withAlpha(150), width: 2),
          ),
          child: Center(
            child: Text(
              '$amount',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(label,
            style: const TextStyle(
                fontSize: 11, color: AppTheme.onSurfaceMuted)),
      ],
    );
  }
}

// ── Transaction dialog ────────────────────────────────────────────────────────

class _TransactionDialog extends ConsumerStatefulWidget {
  final String characterId;
  final double currentBalance;
  final VoidCallback onDone;

  const _TransactionDialog({
    required this.characterId,
    required this.currentBalance,
    required this.onDone,
  });

  @override
  ConsumerState<_TransactionDialog> createState() => _TransactionDialogState();
}

class _TransactionDialogState extends ConsumerState<_TransactionDialog> {
  final _amountCtrl = TextEditingController();
  final _targetCtrl = TextEditingController();
  bool _loading = false;
  bool _isPositive = true;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _targetCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountCtrl.text);
    final target = _targetCtrl.text.trim();
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Введите сумму')));
      return;
    }
    if (target.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Укажите назначение платежа')));
      return;
    }
    setState(() => _loading = true);
    try {
      final delta = _isPositive ? amount : -amount;
      await ref.read(apiClientProvider).createTransaction(
            widget.characterId,
            amountBronze: delta,
            moneyTarget: target,
          );
      widget.onDone();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Ошибка: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Изменить баланс'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: true, label: Text('Получить')),
              ButtonSegment(value: false, label: Text('Потратить')),
            ],
            selected: {_isPositive},
            onSelectionChanged: (s) =>
                setState(() => _isPositive = s.first),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _amountCtrl,
            keyboardType:
                const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Сумма (в бронзе)',
              hintText: '100 = 1 серебро',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _targetCtrl,
            decoration: const InputDecoration(
              labelText: 'Назначение *',
              hintText: 'Покупка меча / Оплата таверны...',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Отмена')),
        ElevatedButton(
          onPressed: _loading ? null : _submit,
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

// ── Backpack slot card ────────────────────────────────────────────────────────

class _BackpackSlotCard extends StatefulWidget {
  final BackpackSlot slot;
  final Future<void> Function(Map<String, dynamic>) onSave;
  final VoidCallback? onClear;

  const _BackpackSlotCard({
    required this.slot,
    required this.onSave,
    this.onClear,
  });

  @override
  State<_BackpackSlotCard> createState() => _BackpackSlotCardState();
}

class _BackpackSlotCardState extends State<_BackpackSlotCard> {
  bool _editing = false;
  late final TextEditingController _nameCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _qtyCtrl;
  late String _type;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.slot.itemName ?? '');
    _descCtrl = TextEditingController(text: widget.slot.description ?? '');
    _qtyCtrl =
        TextEditingController(text: '${widget.slot.quantity ?? 1}');
    _type = widget.slot.itemType ?? 'misc';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _qtyCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await widget.onSave({
        'item_name': _nameCtrl.text.trim(),
        'item_type': _type,
        'description': _descCtrl.text.trim().isNotEmpty
            ? _descCtrl.text.trim()
            : null,
        'quantity': int.tryParse(_qtyCtrl.text) ?? 1,
      });
      setState(() => _editing = false);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Ошибка: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final slot = widget.slot;

    if (_editing) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Row(
                children: [
                  Text('Ячейка ${slot.slotIndex}',
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: AppTheme.onSurfaceMuted)),
                  const Spacer(),
                  TextButton(
                      onPressed: () => setState(() => _editing = false),
                      child: const Text('Отмена')),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _nameCtrl,
                decoration:
                    const InputDecoration(labelText: 'Название', isDense: true),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _type,
                      isDense: true,
                      decoration: const InputDecoration(labelText: 'Тип'),
                      items: kBackpackItemTypes
                          .map((t) => DropdownMenuItem(
                              value: t,
                              child: Text(
                                  kBackpackItemTypeLabels[t] ?? t,
                                  style:
                                      const TextStyle(fontSize: 13))))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _type = v ?? 'misc'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 70,
                    child: TextField(
                      controller: _qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'Кол-во', isDense: true),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _descCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                    labelText: 'Описание (необязательно)',
                    isDense: true),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child:
                              CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Сохранить'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => setState(() {
          _editing = true;
          _nameCtrl.text = slot.itemName ?? '';
          _descCtrl.text = slot.description ?? '';
          _qtyCtrl.text = '${slot.quantity ?? 1}';
          _type = slot.itemType ?? 'misc';
        }),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppTheme.surfaceVariant,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Text('${slot.slotIndex}',
                      style: const TextStyle(
                          fontSize: 12, color: AppTheme.onSurfaceMuted)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: slot.isEmpty
                    ? Text('пусто',
                        style: theme.textTheme.bodyMedium
                            ?.copyWith(color: AppTheme.onSurfaceMuted))
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  slot.itemName!,
                                  style: theme.textTheme.bodyMedium
                                      ?.copyWith(
                                          fontWeight: FontWeight.w600),
                                ),
                              ),
                              Text(
                                '×${slot.quantity ?? 1}',
                                style: theme.textTheme.bodySmall?.copyWith(
                                    color: AppTheme.onSurfaceMuted),
                              ),
                            ],
                          ),
                          if (slot.description != null &&
                              slot.description!.isNotEmpty)
                            Text(
                              slot.description!,
                              style: theme.textTheme.bodySmall?.copyWith(
                                  color: AppTheme.onSurfaceMuted),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
              ),
              if (!slot.isEmpty && widget.onClear != null)
                IconButton(
                  iconSize: 18,
                  icon: const Icon(Icons.clear,
                      color: AppTheme.onSurfaceMuted),
                  onPressed: widget.onClear,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
