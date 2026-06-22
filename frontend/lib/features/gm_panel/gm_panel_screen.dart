import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/models.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/theme/app_theme.dart';

class GmPanelScreen extends ConsumerStatefulWidget {
  const GmPanelScreen({super.key});

  @override
  ConsumerState<GmPanelScreen> createState() => _GmPanelScreenState();
}

class _GmPanelScreenState extends ConsumerState<GmPanelScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go('/characters')),
        title: const Text('GM Панель'),
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [
            Tab(text: 'Персонажи'),
            Tab(text: 'Кампании'),
            Tab(text: 'Настройки'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _CharactersView(isGm: auth?.isGmOrAdmin ?? false),
          _CampaignsView(),
          _GmSettingsView(auth: auth),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateNpcDialog(context),
        icon: const Icon(Icons.person_add),
        label: const Text('Создать NPC'),
      ),
    );
  }

  void _showCreateNpcDialog(BuildContext context) {
    context.go('/characters/new');
  }
}

// ── Characters view (GM sees all) ────────────────────────────────────────────

class _CharactersView extends ConsumerWidget {
  final bool isGm;

  const _CharactersView({required this.isGm});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final charactersAsync = ref.watch(characterListProvider);

    return charactersAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (characters) => RefreshIndicator(
        onRefresh: () => ref.read(characterListProvider.notifier).reload(),
        child: ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: characters.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) {
            final c = characters[i];
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor:
                      Theme.of(context).colorScheme.primary.withAlpha(40),
                  backgroundImage: c.appearanceImageUrl != null
                      ? NetworkImage(c.appearanceImageUrl!)
                      : null,
                  child: c.appearanceImageUrl == null
                      ? Text(c.name.isNotEmpty ? c.name[0].toUpperCase() : '?',
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.primary))
                      : null,
                ),
                title: Text(c.name,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: c.isNpc ? const Text('NPC') : null,
                trailing: c.unallocatedPoints > 0
                    ? Chip(
                        label: Text('+${c.unallocatedPoints}',
                            style: const TextStyle(fontSize: 11)),
                        backgroundColor: Theme.of(context)
                            .colorScheme
                            .primary
                            .withAlpha(40),
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      )
                    : const Icon(Icons.chevron_right),
                onTap: () => context.go('/characters/${c.id}'),
              ),
            );
          },
        ),
      ),
    );
  }
}

// ── Campaigns view ────────────────────────────────────────────────────────────

class _CampaignsView extends ConsumerWidget {
  _CampaignsView();

  final _campaignsProvider = FutureProvider<List<CampaignOut>>((ref) async {
    return ref.read(apiClientProvider).listCampaigns();
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campAsync = ref.watch(_campaignsProvider);

    return campAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (campaigns) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: ElevatedButton.icon(
              onPressed: () => _showCreateCampaign(context, ref),
              icon: const Icon(Icons.add),
              label: const Text('Новая кампания'),
            ),
          ),
          Expanded(
            child: campaigns.isEmpty
                ? const Center(
                    child: Text('Нет кампаний',
                        style: TextStyle(color: AppTheme.onSurfaceMuted)))
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: campaigns.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final camp = campaigns[i];
                      return Card(
                        child: ListTile(
                          leading: const Icon(Icons.campaign),
                          title: Text(camp.name),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () =>
                              _showCampaignDetail(context, ref, camp),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _showCreateCampaign(BuildContext context, WidgetRef ref) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Новая кампания'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(labelText: 'Название'),
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Отмена')),
          ElevatedButton(
            onPressed: () async {
              if (ctrl.text.trim().isEmpty) return;
              await ref
                  .read(apiClientProvider)
                  .createCampaign(ctrl.text.trim());
              ref.invalidate(_campaignsProvider);
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Создать'),
          ),
        ],
      ),
    );
  }

  void _showCampaignDetail(
      BuildContext context, WidgetRef ref, CampaignOut camp) {
    showDialog(
      context: context,
      builder: (_) => _CampaignDetailDialog(campaign: camp),
    );
  }
}

class _CampaignDetailDialog extends ConsumerWidget {
  final CampaignOut campaign;

  const _CampaignDetailDialog({required this.campaign});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final partyAsync = FutureProvider<List<PartySummaryItem>>((r) async {
      return r.read(apiClientProvider).getPartySummary(campaign.id);
    });
    final summary = ref.watch(partyAsync);

    return AlertDialog(
      title: Text(campaign.name),
      content: SizedBox(
        width: 360,
        child: summary.when(
          loading: () =>
              const Center(child: CircularProgressIndicator()),
          error: (e, _) => Text('Ошибка: $e'),
          data: (party) => party.isEmpty
              ? const Text('Нет участников')
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: party
                      .map((p) => _PartyMemberRow(member: p))
                      .toList(),
                ),
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

class _PartyMemberRow extends StatelessWidget {
  final PartySummaryItem member;

  const _PartyMemberRow({required this.member});

  @override
  Widget build(BuildContext context) {
    final hpFrac =
        member.hpMax > 0 ? member.currentHp / member.hpMax : 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(member.name,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              if (member.bubbleActive)
                const Icon(Icons.bubble_chart, size: 14, color: Colors.blue),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const SizedBox(
                  width: 24,
                  child: Text('HP',
                      style: TextStyle(
                          fontSize: 10, color: AppTheme.onSurfaceMuted))),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: hpFrac.clamp(0.0, 1.0),
                    minHeight: 8,
                    backgroundColor: AppTheme.surfaceVariant,
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(AppTheme.hpColor),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text('${member.currentHp}/${member.hpMax}',
                  style: const TextStyle(
                      fontSize: 11, color: AppTheme.onSurfaceMuted)),
            ],
          ),
        ],
      ),
    );
  }
}

// ── GM Settings ───────────────────────────────────────────────────────────────

class _GmSettingsView extends ConsumerWidget {
  final Account? auth;

  const _GmSettingsView({this.auth});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (auth == null) return const SizedBox();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('GM Настройки',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                SwitchListTile(
                  value: auth!.gmSkipConfirmation,
                  onChanged: (v) => ref
                      .read(authProvider.notifier)
                      .updateGmSkipConfirmation(v),
                  title: const Text('Пропускать подтверждение'),
                  subtitle: const Text(
                      'Применять изменения GM без диалога подтверждения'),
                  contentPadding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            leading: const Icon(Icons.admin_panel_settings),
            title: const Text('Панель администратора'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go('/admin'),
          ),
        ),
      ],
    );
  }
}
