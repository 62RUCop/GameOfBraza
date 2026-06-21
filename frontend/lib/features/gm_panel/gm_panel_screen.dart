import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';

final _partySummaryProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, campaignId) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/campaigns/$campaignId/party-summary');
  return (response.data as List).cast<Map<String, dynamic>>();
});

final _campaignsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/campaigns');
  return (response.data as List).cast<Map<String, dynamic>>();
});

class GmPanelScreen extends ConsumerWidget {
  const GmPanelScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaignsAsync = ref.watch(_campaignsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('GM Панель'),
        leading: BackButton(onPressed: () => context.go('/')),
      ),
      body: campaignsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Ошибка: $e')),
        data: (campaigns) => campaigns.isEmpty
            ? const Center(child: Text('Нет кампаний. Создайте кампанию.'))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: campaigns.length,
                itemBuilder: (_, i) {
                  final c = campaigns[i];
                  return ExpansionTile(
                    title: Text(c['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
                    children: [_PartySummary(campaignId: c['id'] as String)],
                  );
                },
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateCampaignDialog(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Новая кампания'),
      ),
    );
  }

  void _showCreateCampaignDialog(BuildContext context, WidgetRef ref) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Создать кампанию'),
        content: TextField(controller: ctrl, decoration: const InputDecoration(labelText: 'Название кампании')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          ElevatedButton(
            onPressed: () async {
              if (ctrl.text.isEmpty) return;
              final dio = ref.read(dioProvider);
              await dio.post('/campaigns', data: {'name': ctrl.text});
              ref.invalidate(_campaignsProvider);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Создать'),
          ),
        ],
      ),
    );
  }
}

class _PartySummary extends ConsumerWidget {
  final String campaignId;

  const _PartySummary({required this.campaignId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(_partySummaryProvider(campaignId));

    return summaryAsync.when(
      loading: () => const Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()),
      error: (e, _) => Text('Ошибка: $e'),
      data: (members) => Column(
        children: members.map((m) => Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(child: Text(m['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold))),
                _MiniBar(label: 'HP', current: m['current_hp'] as int, max: m['hp_max'] as int, color: Colors.red),
                const SizedBox(width: 8),
                _MiniBar(label: 'MP', current: m['current_mana'] as int, max: m['mana_max'] as int, color: Colors.blue),
              ],
            ),
          ),
        )).toList(),
      ),
    );
  }
}

class _MiniBar extends StatelessWidget {
  final String label;
  final int current, max;
  final Color color;

  const _MiniBar({required this.label, required this.current, required this.max, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text('$label: $current/$max', style: const TextStyle(fontSize: 10, color: Colors.white54)),
        SizedBox(
          width: 60,
          height: 6,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: max > 0 ? (current / max).clamp(0.0, 1.0) : 0,
              backgroundColor: Colors.white12,
              color: color,
            ),
          ),
        ),
      ],
    );
  }
}
