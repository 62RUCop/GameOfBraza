import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/models.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/tier_badge.dart';

class EquipmentTab extends ConsumerWidget {
  final String characterId;

  const EquipmentTab({super.key, required this.characterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final equippedAsync = ref.watch(equippedItemsProvider(characterId));
    final inventoryAsync = ref.watch(characterItemsProvider(characterId));
    final auth = ref.watch(authProvider).valueOrNull;
    final characterAsync = ref.watch(characterProvider(characterId));

    return equippedAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (equipped) => RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(equippedItemsProvider(characterId));
          ref.invalidate(characterItemsProvider(characterId));
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Paperdoll grid
            Text('Экипировка',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _PaperdollGrid(
              equipped: equipped,
              character: characterAsync.valueOrNull,
              isGm: auth?.isGmOrAdmin ?? false,
              onUnequip: (slot) async {
                await ref
                    .read(apiClientProvider)
                    .unequipItem(characterId, slot);
                ref.invalidate(equippedItemsProvider(characterId));
                ref.invalidate(characterItemsProvider(characterId));
              },
              onEquipFromInventory: (slot) => _showEquipDialog(
                  context, ref, slot,
                  inventoryAsync.valueOrNull ?? [],
                  characterAsync.valueOrNull),
            ),
            const SizedBox(height: 24),

            // Inventory
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Инвентарь',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.bold)),
                if (auth?.isGmOrAdmin ?? false)
                  TextButton.icon(
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Добавить'),
                    onPressed: () =>
                        _showAddItemDialog(context, ref, auth!.isGmOrAdmin),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            inventoryAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('Ошибка: $e'),
              data: (items) {
                final backpackItems =
                    items.where((i) => i.location == 'backpack').toList();
                if (backpackItems.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(
                        child: Text('Инвентарь пуст',
                            style:
                                TextStyle(color: AppTheme.onSurfaceMuted))),
                  );
                }
                return Column(
                  children: backpackItems
                      .map((item) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _ItemCard(
                              item: item,
                              isGm: auth?.isGmOrAdmin ?? false,
                              onEquip: (slot) async {
                                await ref
                                    .read(apiClientProvider)
                                    .equipItem(characterId, slot, item.id);
                                ref.invalidate(
                                    equippedItemsProvider(characterId));
                                ref.invalidate(
                                    characterItemsProvider(characterId));
                              },
                            ),
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showEquipDialog(BuildContext context, WidgetRef ref, String slot,
      List<ItemInstance> inventory, Character? character) {
    final compatible = inventory
        .where((i) => i.location == 'backpack' && i.slotType == slot)
        .toList();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Надеть в "${kSlotLabels[slot]}"'),
        content: SizedBox(
          width: 320,
          child: compatible.isEmpty
              ? const Text('Нет подходящих предметов в инвентаре')
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: compatible
                      .map((item) => ListTile(
                            title: Text(item.displayName),
                            subtitle: TierBadge(tier: item.tier),
                            onTap: () async {
                              await ref
                                  .read(apiClientProvider)
                                  .equipItem(characterId, slot, item.id);
                              ref.invalidate(equippedItemsProvider(characterId));
                              ref.invalidate(
                                  characterItemsProvider(characterId));
                              if (context.mounted) Navigator.pop(context);
                            },
                          ))
                      .toList(),
                ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Отмена')),
        ],
      ),
    );
  }

  void _showAddItemDialog(
      BuildContext context, WidgetRef ref, bool isGm) {
    showDialog(
      context: context,
      builder: (_) => _AddItemDialog(characterId: characterId),
    );
  }
}

// ── Paperdoll grid ────────────────────────────────────────────────────────────

class _PaperdollGrid extends StatelessWidget {
  final Map<String, ItemInstance> equipped;
  final Character? character;
  final bool isGm;
  final void Function(String slot) onUnequip;
  final void Function(String slot) onEquipFromInventory;

  const _PaperdollGrid({
    required this.equipped,
    this.character,
    required this.isGm,
    required this.onUnequip,
    required this.onEquipFromInventory,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: kSlotTypes.map((slot) {
        final item = equipped[slot];
        return SizedBox(
          width: 155,
          child: _SlotCard(
            slot: slot,
            item: item,
            onUnequip: item != null ? () => onUnequip(slot) : null,
            onEquip: () => onEquipFromInventory(slot),
          ),
        );
      }).toList(),
    );
  }
}

class _SlotCard extends StatelessWidget {
  final String slot;
  final ItemInstance? item;
  final VoidCallback? onUnequip;
  final VoidCallback onEquip;

  const _SlotCard({
    required this.slot,
    this.item,
    this.onUnequip,
    required this.onEquip,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final label = kSlotLabels[slot] ?? slot;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: item == null ? onEquip : null,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: AppTheme.onSurfaceMuted)),
              const SizedBox(height: 4),
              if (item == null)
                Text('— пусто —',
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: AppTheme.onSurfaceMuted))
              else ...[
                Text(item!.displayName,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Row(
                  children: [
                    TierBadge(tier: item!.tier),
                    const Spacer(),
                    InkWell(
                      onTap: onUnequip,
                      child: const Icon(Icons.close, size: 16,
                          color: AppTheme.onSurfaceMuted),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Item card ─────────────────────────────────────────────────────────────────

class _ItemCard extends StatelessWidget {
  final ItemInstance item;
  final bool isGm;
  final void Function(String slot) onEquip;

  const _ItemCard({
    required this.item,
    required this.isGm,
    required this.onEquip,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tmpl = item.template;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(item.displayName,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.bold)),
                ),
                TierBadge(tier: item.tier),
              ],
            ),
            const SizedBox(height: 4),
            Text(kSlotLabels[item.slotType] ?? item.slotType,
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: AppTheme.onSurfaceMuted)),
            if (tmpl?.description != null) ...[
              const SizedBox(height: 4),
              Text(tmpl!.description!,
                  style: theme.textTheme.bodySmall, maxLines: 2,
                  overflow: TextOverflow.ellipsis),
            ],
            if (tmpl?.statBonuses != null) ...[
              const SizedBox(height: 6),
              Wrap(
                spacing: 4,
                runSpacing: 4,
                children: tmpl!.statBonuses!.entries
                    .map((e) => Chip(
                          label: Text('${e.key}: ${e.value}',
                              style: const TextStyle(fontSize: 10)),
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: () => onEquip(item.slotType),
              icon: const Icon(Icons.add_circle_outline, size: 16),
              label: const Text('Надеть'),
              style: ElevatedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                minimumSize: Size.zero,
                textStyle: const TextStyle(fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Add item dialog ───────────────────────────────────────────────────────────

class _AddItemDialog extends ConsumerStatefulWidget {
  final String characterId;

  const _AddItemDialog({required this.characterId});

  @override
  ConsumerState<_AddItemDialog> createState() => _AddItemDialogState();
}

class _AddItemDialogState extends ConsumerState<_AddItemDialog> {
  final _nameCtrl = TextEditingController();
  String _slotType = 'misc';
  bool _loading = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      await ref.read(apiClientProvider).createItem(widget.characterId, {
        'name': _nameCtrl.text.trim(),
        'slot_type': _slotType,
      });
      ref.invalidate(characterItemsProvider(widget.characterId));
      ref.invalidate(equippedItemsProvider(widget.characterId));
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
      title: const Text('Добавить предмет'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(labelText: 'Название'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _slotType,
            decoration: const InputDecoration(labelText: 'Слот'),
            items: kSlotTypes
                .map((s) => DropdownMenuItem(
                    value: s,
                    child: Text(kSlotLabels[s] ?? s)))
                .toList(),
            onChanged: (v) => setState(() => _slotType = v ?? 'misc'),
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
              : const Text('Добавить'),
        ),
      ],
    );
  }
}
