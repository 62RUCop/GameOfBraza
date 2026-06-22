import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/tier_badge.dart';

class AdminPanelScreen extends ConsumerStatefulWidget {
  const AdminPanelScreen({super.key});

  @override
  ConsumerState<AdminPanelScreen> createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends ConsumerState<AdminPanelScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go('/characters')),
        title: const Text('Администратор'),
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(text: 'Расы'),
            Tab(text: 'Фракции'),
            Tab(text: 'Умения'),
            Tab(text: 'Предметы'),
            Tab(text: 'Конфиг'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: const [
          _RacesView(),
          _FactionsView(),
          _SkillsView(),
          _ItemTemplatesView(),
          _RuleConfigView(),
        ],
      ),
    );
  }
}

// ── Catalog item type ─────────────────────────────────────────────────────────

typedef _CatalogItem = ({String id, String name, String? description});

// ── Generic catalog list ──────────────────────────────────────────────────────

class _CatalogList extends StatefulWidget {
  final Future<List<_CatalogItem>> Function() load;
  final Future<void> Function(String name, String? desc) onCreate;
  final Future<void> Function(String id, String name, String? desc) onUpdate;
  final Future<void> Function(String id) onDelete;
  final String heroTag;

  const _CatalogList({
    required this.load,
    required this.onCreate,
    required this.onUpdate,
    required this.onDelete,
    required this.heroTag,
  });

  @override
  State<_CatalogList> createState() => _CatalogListState();
}

class _CatalogListState extends State<_CatalogList> {
  late Future<List<_CatalogItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.load();
  }

  void _reload() => setState(() => _future = widget.load());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton(
        heroTag: widget.heroTag,
        onPressed: () => _showForm(context, null),
        child: const Icon(Icons.add),
      ),
      body: FutureBuilder<List<_CatalogItem>>(
        future: _future,
        builder: (_, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Ошибка: ${snap.error}'));
          }
          final items = snap.data ?? [];
          if (items.isEmpty) {
            return const Center(
              child: Text('Нет элементов',
                  style: TextStyle(color: AppTheme.onSurfaceMuted)),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final item = items[i];
              return Card(
                child: ListTile(
                  title: Text(item.name,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: item.description != null
                      ? Text(item.description!,
                          maxLines: 1, overflow: TextOverflow.ellipsis)
                      : null,
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        onPressed: () => _showForm(context, item),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline,
                            size: 18, color: AppTheme.onSurfaceMuted),
                        onPressed: () =>
                            _confirmDelete(context, item),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showForm(BuildContext context, _CatalogItem? existing) {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final descCtrl =
        TextEditingController(text: existing?.description ?? '');
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(existing == null ? 'Добавить' : 'Редактировать'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Название'),
              autofocus: true,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: descCtrl,
              decoration: const InputDecoration(
                  labelText: 'Описание (необязательно)'),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Отмена')),
          ElevatedButton(
            onPressed: () async {
              final name = nameCtrl.text.trim();
              if (name.isEmpty) return;
              final desc = descCtrl.text.trim().isNotEmpty
                  ? descCtrl.text.trim()
                  : null;
              if (existing == null) {
                await widget.onCreate(name, desc);
              } else {
                await widget.onUpdate(existing.id, name, desc);
              }
              _reload();
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Сохранить'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, _CatalogItem item) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Удалить?'),
        content: Text('Удалить "${item.name}"?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Отмена')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () async {
              await widget.onDelete(item.id);
              _reload();
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
  }
}

// ── Races ─────────────────────────────────────────────────────────────────────

class _RacesView extends ConsumerWidget {
  const _RacesView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final client = ref.read(apiClientProvider);
    return _CatalogList(
      heroTag: 'races',
      load: () async => (await client.listRaces())
          .map((r) => (id: r.id, name: r.name, description: r.description))
          .toList(),
      onCreate: (name, desc) =>
          client.createRace(name: name, description: desc),
      onUpdate: (id, name, desc) =>
          client.updateRace(id, name: name, description: desc),
      onDelete: (id) => client.deleteRace(id),
    );
  }
}

// ── Factions ──────────────────────────────────────────────────────────────────

class _FactionsView extends ConsumerWidget {
  const _FactionsView();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final client = ref.read(apiClientProvider);
    return _CatalogList(
      heroTag: 'factions',
      load: () async => (await client.listFactions())
          .map((f) => (id: f.id, name: f.name, description: f.description))
          .toList(),
      onCreate: (name, desc) =>
          client.createFaction(name: name, description: desc),
      onUpdate: (id, name, desc) =>
          client.updateFaction(id, name: name, description: desc),
      onDelete: (id) => client.deleteFaction(id),
    );
  }
}

// ── Skills ────────────────────────────────────────────────────────────────────

class _SkillsView extends ConsumerStatefulWidget {
  const _SkillsView();

  @override
  ConsumerState<_SkillsView> createState() => _SkillsViewState();
}

class _SkillsViewState extends ConsumerState<_SkillsView> {
  late Future<List<Skill>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() =>
      setState(() => _future = ref.read(apiClientProvider).listAllSkills());

  @override
  Widget build(BuildContext context) {
    final client = ref.read(apiClientProvider);
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton(
        heroTag: 'skills',
        onPressed: () => _showSkillForm(context, client, null),
        child: const Icon(Icons.add),
      ),
      body: FutureBuilder<List<Skill>>(
        future: _future,
        builder: (_, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Ошибка: ${snap.error}'));
          }
          final skills = snap.data ?? [];
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            itemCount: skills.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final s = skills[i];
              return Card(
                child: ListTile(
                  title: Text(s.name,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: s.description != null
                      ? Text(s.description!,
                          maxLines: 1, overflow: TextOverflow.ellipsis)
                      : null,
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TierBadge(tier: s.tier),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        onPressed: () =>
                            _showSkillForm(context, client, s),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline,
                            size: 18, color: AppTheme.onSurfaceMuted),
                        onPressed: () async {
                          await client.deleteSkill(s.id);
                          _reload();
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showSkillForm(
      BuildContext context, ApiClient client, Skill? existing) {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final descCtrl =
        TextEditingController(text: existing?.description ?? '');
    int tier = existing?.tier ?? 0;
    bool occupiesSlot = existing?.occupiesSlot ?? true;

    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(existing == null
              ? 'Новое умение'
              : 'Редактировать умение'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                  controller: nameCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Название')),
              const SizedBox(height: 8),
              TextField(
                  controller: descCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Описание'),
                  maxLines: 2),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Text('Тир: '),
                  DropdownButton<int>(
                    value: tier,
                    items: List.generate(
                        6,
                        (i) => DropdownMenuItem(
                            value: i,
                            child: Row(children: [
                              Text('$i '),
                              TierBadge(tier: i),
                            ]))),
                    onChanged: (v) => setDlg(() => tier = v ?? 0),
                  ),
                ],
              ),
              SwitchListTile(
                value: occupiesSlot,
                onChanged: (v) => setDlg(() => occupiesSlot = v),
                title: const Text('Занимает слот'),
                contentPadding: EdgeInsets.zero,
                dense: true,
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Отмена')),
            ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty) return;
                final data = {
                  'name': nameCtrl.text.trim(),
                  if (descCtrl.text.trim().isNotEmpty)
                    'description': descCtrl.text.trim(),
                  'tier': tier,
                  'occupies_slot': occupiesSlot,
                };
                if (existing == null) {
                  await client.createSkill(data);
                } else {
                  await client.updateSkill(existing.id, data);
                }
                _reload();
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Item templates ────────────────────────────────────────────────────────────

class _ItemTemplatesView extends ConsumerStatefulWidget {
  const _ItemTemplatesView();

  @override
  ConsumerState<_ItemTemplatesView> createState() =>
      _ItemTemplatesViewState();
}

class _ItemTemplatesViewState extends ConsumerState<_ItemTemplatesView> {
  late Future<List<ItemTemplate>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => setState(
      () => _future = ref.read(apiClientProvider).listItemTemplates());

  @override
  Widget build(BuildContext context) {
    final client = ref.read(apiClientProvider);
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton(
        heroTag: 'items',
        onPressed: () => _showForm(context, client, null),
        child: const Icon(Icons.add),
      ),
      body: FutureBuilder<List<ItemTemplate>>(
        future: _future,
        builder: (_, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Ошибка: ${snap.error}'));
          }
          final items = snap.data ?? [];
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final item = items[i];
              return Card(
                child: ListTile(
                  title: Text(item.name,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    '${kSlotLabels[item.slotType] ?? item.slotType} · '
                    '${item.referencePrice.toStringAsFixed(0)} бр.',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TierBadge(tier: item.tier),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        onPressed: () =>
                            _showForm(context, client, item),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline,
                            size: 18, color: AppTheme.onSurfaceMuted),
                        onPressed: () async {
                          await client.deleteItemTemplate(item.id);
                          _reload();
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showForm(
      BuildContext context, ApiClient client, ItemTemplate? existing) {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final priceCtrl = TextEditingController(
        text: existing?.referencePrice.toStringAsFixed(0) ?? '0');
    String slotType = existing?.slotType ?? 'head';
    int tier = existing?.tier ?? 0;

    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(existing == null
              ? 'Новый шаблон предмета'
              : 'Редактировать предмет'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                    controller: nameCtrl,
                    decoration:
                        const InputDecoration(labelText: 'Название')),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: slotType,
                  decoration: const InputDecoration(labelText: 'Слот'),
                  items: kSlotTypes
                      .map((s) => DropdownMenuItem(
                          value: s,
                          child: Text(kSlotLabels[s] ?? s)))
                      .toList(),
                  onChanged: (v) =>
                      setDlg(() => slotType = v ?? 'head'),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Text('Тир: '),
                    DropdownButton<int>(
                      value: tier,
                      items: List.generate(
                          6,
                          (i) => DropdownMenuItem(
                              value: i,
                              child: Row(children: [
                                Text('$i '),
                                TierBadge(tier: i),
                              ]))),
                      onChanged: (v) =>
                          setDlg(() => tier = v ?? 0),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: priceCtrl,
                  keyboardType: TextInputType.number,
                  decoration:
                      const InputDecoration(labelText: 'Цена (бронза)'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Отмена')),
            ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty) return;
                final data = {
                  'name': nameCtrl.text.trim(),
                  'slot_type': slotType,
                  'tier': tier,
                  'reference_price':
                      double.tryParse(priceCtrl.text) ?? 0.0,
                };
                if (existing == null) {
                  await client.createItemTemplate(data);
                } else {
                  await client.updateItemTemplate(existing.id, data);
                }
                _reload();
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Сохранить'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Rule config ───────────────────────────────────────────────────────────────

class _RuleConfigView extends ConsumerStatefulWidget {
  const _RuleConfigView();

  @override
  ConsumerState<_RuleConfigView> createState() => _RuleConfigViewState();
}

class _RuleConfigViewState extends ConsumerState<_RuleConfigView> {
  Map<String, TextEditingController> _controllers = {};
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final cfg = await ref.read(apiClientProvider).getRuleConfig();
      _controllers = {
        for (final e in cfg.entries)
          if (e.value is num)
            e.key: TextEditingController(text: '${e.value}'),
      };
      setState(() {
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final updates = <String, dynamic>{};
    for (final entry in _controllers.entries) {
      final v = num.tryParse(entry.value.text);
      if (v != null) updates[entry.key] = v;
    }
    try {
      await ref.read(apiClientProvider).updateRuleConfig(updates);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Конфиг сохранён')),
        );
      }
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
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text('Ошибка: $_error'));

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: _controllers.entries
                .map((entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: TextField(
                        controller: entry.value,
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        decoration: InputDecoration(
                          labelText: entry.key,
                          isDense: true,
                        ),
                      ),
                    ))
                .toList(),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child:
                          CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Сохранить конфиг'),
            ),
          ),
        ),
      ],
    );
  }
}
