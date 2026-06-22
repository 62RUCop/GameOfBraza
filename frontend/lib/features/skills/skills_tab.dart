import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/models.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/tier_badge.dart';

class SkillsTab extends ConsumerWidget {
  final String characterId;

  const SkillsTab({super.key, required this.characterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final skillsAsync = ref.watch(characterSkillsProvider(characterId));
    final categoriesAsync = ref.watch(skillCategoriesProvider);
    final characterAsync = ref.watch(characterProvider(characterId));
    final auth = ref.watch(authProvider).valueOrNull;

    final slots = characterAsync.valueOrNull?.slots ?? 0;

    return skillsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (skills) {
        final usedSlots =
            skills.where((s) => s.skill.occupiesSlot && !s.isLocked).length;

        return Column(
          children: [
            // Header: slot counter + add button
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: Theme.of(context).colorScheme.surface,
              child: Row(
                children: [
                  Icon(Icons.auto_awesome,
                      size: 16, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 6),
                  Text(
                    'Занято $usedSlots из $slots слотов',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: usedSlots >= slots && slots > 0
                              ? Theme.of(context).colorScheme.error
                              : Theme.of(context).colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const Spacer(),
                  TextButton.icon(
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Добавить умение'),
                    onPressed: () =>
                        _showAddSkillDialog(context, ref, skills),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Skills by category
            Expanded(
              child: categoriesAsync.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) =>
                    Center(child: Text('Ошибка категорий: $e')),
                data: (categories) => _SkillsByCategory(
                  skills: skills,
                  categories: categories,
                  isGm: auth?.isGmOrAdmin ?? false,
                  characterId: characterId,
                  onRemove: (skillId) async {
                    await ref
                        .read(apiClientProvider)
                        .removeSkill(characterId, skillId);
                    ref.invalidate(characterSkillsProvider(characterId));
                  },
                  onAssignCategory: (skillId, catId) async {
                    await ref
                        .read(apiClientProvider)
                        .assignSkillCategory(characterId, skillId, catId);
                    ref.invalidate(characterSkillsProvider(characterId));
                  },
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showAddSkillDialog(BuildContext context, WidgetRef ref,
      List<CharacterSkill> current) {
    showDialog(
      context: context,
      builder: (_) =>
          _AddSkillDialog(characterId: characterId, current: current),
    );
  }
}

// ── Skills organized by category ──────────────────────────────────────────────

class _SkillsByCategory extends StatefulWidget {
  final List<CharacterSkill> skills;
  final List<SkillCategory> categories;
  final bool isGm;
  final String characterId;
  final void Function(String skillId) onRemove;
  final void Function(String skillId, String? catId) onAssignCategory;

  const _SkillsByCategory({
    required this.skills,
    required this.categories,
    required this.isGm,
    required this.characterId,
    required this.onRemove,
    required this.onAssignCategory,
  });

  @override
  State<_SkillsByCategory> createState() => _SkillsByCategoryState();
}

class _SkillsByCategoryState extends State<_SkillsByCategory>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(
        length: widget.categories.length + 1, vsync: this);
  }

  @override
  void didUpdateWidget(covariant _SkillsByCategory old) {
    super.didUpdateWidget(old);
    if (old.categories.length != widget.categories.length) {
      _tabCtrl.dispose();
      _tabCtrl = TabController(
          length: widget.categories.length + 1, vsync: this);
    }
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final allTab = [const SkillCategory(id: '', name: 'Все')];
    final tabs = [...allTab, ...widget.categories];

    return Column(
      children: [
        TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          onTap: (_) => setState(() {}),
          tabs: tabs.map((c) => Tab(text: c.name)).toList(),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: tabs.map((cat) {
              final filtered = cat.id.isEmpty
                  ? widget.skills
                  : widget.skills
                      .where((s) => s.categoryId == cat.id)
                      .toList();
              return _SkillList(
                skills: filtered,
                categories: widget.categories,
                isGm: widget.isGm,
                onRemove: widget.onRemove,
                onAssignCategory: widget.onAssignCategory,
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _SkillList extends StatelessWidget {
  final List<CharacterSkill> skills;
  final List<SkillCategory> categories;
  final bool isGm;
  final void Function(String) onRemove;
  final void Function(String, String?) onAssignCategory;

  const _SkillList({
    required this.skills,
    required this.categories,
    required this.isGm,
    required this.onRemove,
    required this.onAssignCategory,
  });

  @override
  Widget build(BuildContext context) {
    if (skills.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('Нет умений',
              style: TextStyle(color: AppTheme.onSurfaceMuted)),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: skills.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => _SkillCard(
        cs: skills[i],
        categories: categories,
        isGm: isGm,
        onRemove: () => onRemove(skills[i].skill.id),
        onAssignCategory: (catId) =>
            onAssignCategory(skills[i].skill.id, catId),
      ),
    );
  }
}

class _SkillCard extends StatelessWidget {
  final CharacterSkill cs;
  final List<SkillCategory> categories;
  final bool isGm;
  final VoidCallback onRemove;
  final void Function(String?) onAssignCategory;

  const _SkillCard({
    required this.cs,
    required this.categories,
    required this.isGm,
    required this.onRemove,
    required this.onAssignCategory,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final skill = cs.skill;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    skill.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: cs.isLocked
                          ? AppTheme.onSurfaceMuted
                          : theme.colorScheme.onSurface,
                    ),
                  ),
                ),
                TierBadge(tier: skill.tier),
                if (cs.isLocked) ...[
                  const SizedBox(width: 6),
                  Tooltip(
                    message:
                        'Требуется тир ИНТ ${skill.tier}. Заблокировано.',
                    child: const Icon(Icons.lock_outline,
                        size: 16, color: AppTheme.onSurfaceMuted),
                  ),
                ],
              ],
            ),
            if (skill.description != null) ...[
              const SizedBox(height: 4),
              Text(skill.description!,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: AppTheme.onSurfaceMuted),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis),
            ],
            const SizedBox(height: 6),
            Row(
              children: [
                if (skill.manaCost != null)
                  _CostChip(
                      label: '${skill.manaCost} ман.',
                      color: AppTheme.manaColor),
                if (skill.apCost != null) ...[
                  const SizedBox(width: 4),
                  _CostChip(
                      label: '${skill.apCost} ОД',
                      color: AppTheme.apColor),
                ],
                if (!skill.occupiesSlot) ...[
                  const SizedBox(width: 4),
                  const Chip(
                    label: Text('не занимает слот',
                        style: TextStyle(fontSize: 10)),
                    visualDensity: VisualDensity.compact,
                    padding: EdgeInsets.zero,
                  ),
                ],
                const Spacer(),
                if (categories.isNotEmpty)
                  PopupMenuButton<String?>(
                    iconSize: 18,
                    tooltip: 'Категория',
                    icon: const Icon(Icons.label_outline,
                        size: 16, color: AppTheme.onSurfaceMuted),
                    onSelected: onAssignCategory,
                    itemBuilder: (_) => [
                      const PopupMenuItem(
                          value: null, child: Text('Без категории')),
                      ...categories.map((c) =>
                          PopupMenuItem(value: c.id, child: Text(c.name))),
                    ],
                  ),
                IconButton(
                  iconSize: 16,
                  icon: const Icon(Icons.delete_outline,
                      color: AppTheme.onSurfaceMuted),
                  onPressed: onRemove,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CostChip extends StatelessWidget {
  final String label;
  final Color color;

  const _CostChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(30),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withAlpha(80)),
      ),
      child: Text(label,
          style: TextStyle(fontSize: 10, color: color)),
    );
  }
}

// ── Add skill dialog ──────────────────────────────────────────────────────────

class _AddSkillDialog extends ConsumerStatefulWidget {
  final String characterId;
  final List<CharacterSkill> current;

  const _AddSkillDialog({required this.characterId, required this.current});

  @override
  ConsumerState<_AddSkillDialog> createState() => _AddSkillDialogState();
}

class _AddSkillDialogState extends ConsumerState<_AddSkillDialog> {
  String _search = '';
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final allAsync = ref.watch(allSkillsProvider);
    final currentIds = widget.current.map((s) => s.skill.id).toSet();

    return AlertDialog(
      title: const Text('Добавить умение'),
      content: SizedBox(
        width: 360,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              decoration: const InputDecoration(
                hintText: 'Поиск...',
                prefixIcon: Icon(Icons.search, size: 18),
              ),
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 300,
              child: allAsync.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => Text('Ошибка: $e'),
                data: (all) {
                  final filtered = all
                      .where((s) =>
                          !currentIds.contains(s.id) &&
                          (s.name.toLowerCase().contains(_search) ||
                              (s.description
                                      ?.toLowerCase()
                                      .contains(_search) ??
                                  false)))
                      .toList();
                  if (filtered.isEmpty) {
                    return const Center(
                        child: Text('Ничего не найдено',
                            style:
                                TextStyle(color: AppTheme.onSurfaceMuted)));
                  }
                  return ListView.separated(
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final s = filtered[i];
                      return ListTile(
                        dense: true,
                        title: Text(s.name),
                        subtitle: s.description != null
                            ? Text(s.description!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis)
                            : null,
                        trailing: TierBadge(tier: s.tier),
                        onTap: _loading
                            ? null
                            : () async {
                                setState(() => _loading = true);
                                try {
                                  await ref
                                      .read(apiClientProvider)
                                      .addSkill(widget.characterId, s.id);
                                  ref.invalidate(characterSkillsProvider(
                                      widget.characterId));
                                  if (context.mounted) {
                                    Navigator.pop(context);
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                            content: Text('Ошибка: $e')));
                                  }
                                } finally {
                                  if (mounted) setState(() => _loading = false);
                                }
                              },
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Закрыть')),
      ],
    );
  }
}
