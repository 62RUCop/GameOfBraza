import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';

class AdminPanelScreen extends ConsumerWidget {
  const AdminPanelScreen({super.key});

  static const _sections = [
    {'title': 'Расы', 'endpoint': '/admin/races', 'icon': Icons.people},
    {'title': 'Фракции', 'endpoint': '/admin/factions', 'icon': Icons.flag},
    {'title': 'Шаблоны предметов', 'endpoint': '/admin/item-templates', 'icon': Icons.inventory_2},
    {'title': 'Навыки', 'endpoint': '/admin/skills', 'icon': Icons.auto_awesome},
    {'title': 'Категории навыков', 'endpoint': '/admin/skill-categories', 'icon': Icons.category},
    {'title': 'Карты дикой магии', 'endpoint': '/admin/wild-magic-cards', 'icon': Icons.casino},
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Панель администратора'),
        leading: BackButton(onPressed: () => context.go('/')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _RuleConfigSection(),
          const SizedBox(height: 16),
          const Text('Каталоги', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),
          ..._sections.map((s) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(s['icon'] as IconData),
                  title: Text(s['title'] as String),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => _CatalogDialog(title: s['title'] as String, endpoint: s['endpoint'] as String),
                    );
                  },
                ),
              )),
        ],
      ),
    );
  }
}

class _RuleConfigSection extends ConsumerStatefulWidget {
  @override
  ConsumerState<_RuleConfigSection> createState() => _RuleConfigSectionState();
}

class _RuleConfigSectionState extends ConsumerState<_RuleConfigSection> {
  Map<String, dynamic>? _config;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/admin/rule-config');
      setState(() => _config = response.data as Map<String, dynamic>);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        title: const Text('Конфиг правил', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: const Icon(Icons.settings),
        children: [
          if (_loading) const Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()),
          if (_config != null)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: _config!.entries.map((e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 2, child: Text(e.key, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                      Expanded(flex: 3, child: Text('${e.value}', style: const TextStyle(fontSize: 12, color: Colors.white70))),
                    ],
                  ),
                )).toList(),
              ),
            ),
        ],
      ),
    );
  }
}

class _CatalogDialog extends ConsumerStatefulWidget {
  final String title;
  final String endpoint;

  const _CatalogDialog({required this.title, required this.endpoint});

  @override
  ConsumerState<_CatalogDialog> createState() => _CatalogDialogState();
}

class _CatalogDialogState extends ConsumerState<_CatalogDialog> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get(widget.endpoint);
      setState(() => _items = (response.data as List).cast<Map<String, dynamic>>());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: 500,
        height: 400,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _items.isEmpty
                ? const Center(child: Text('Пусто'))
                : ListView.builder(
                    itemCount: _items.length,
                    itemBuilder: (_, i) {
                      final item = _items[i];
                      final name = item['name'] as String? ?? '—';
                      return ListTile(
                        title: Text(name),
                        dense: true,
                      );
                    },
                  ),
      ),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Закрыть'))],
    );
  }
}
