import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/models/models.dart';

class CharacterListScreen extends ConsumerWidget {
  const CharacterListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).valueOrNull;
    final charactersAsync = ref.watch(characterListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Персонажи'),
        actions: [
          if (auth?.isGmOrAdmin ?? false)
            IconButton(
              icon: const Icon(Icons.group),
              tooltip: 'GM Панель',
              onPressed: () => context.go('/gm'),
            ),
          if (auth?.isAdmin ?? false)
            IconButton(
              icon: const Icon(Icons.admin_panel_settings),
              tooltip: 'Администратор',
              onPressed: () => context.go('/admin'),
            ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Выйти',
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/characters/new'),
        icon: const Icon(Icons.add),
        label: const Text('Новый персонаж'),
      ),
      body: charactersAsync.when(
        loading: () =>
            const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text('Ошибка загрузки: $e'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () =>
                    ref.read(characterListProvider.notifier).reload(),
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
        data: (characters) => characters.isEmpty
            ? const _EmptyState()
            : RefreshIndicator(
                onRefresh: () =>
                    ref.read(characterListProvider.notifier).reload(),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: characters.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) =>
                      _CharacterCard(character: characters[i]),
                ),
              ),
      ),
    );
  }
}

class _CharacterCard extends StatelessWidget {
  final CharacterListItem character;

  const _CharacterCard({required this.character});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go('/characters/${character.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor:
                    theme.colorScheme.primary.withAlpha(40),
                backgroundImage: character.appearanceImageUrl != null
                    ? NetworkImage(character.appearanceImageUrl!)
                    : null,
                child: character.appearanceImageUrl == null
                    ? Text(
                        character.name.isNotEmpty
                            ? character.name[0].toUpperCase()
                            : '?',
                        style: TextStyle(
                          fontSize: 20,
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            character.name,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        if (character.isNpc)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.secondary
                                  .withAlpha(40),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'NPC',
                              style: TextStyle(
                                fontSize: 11,
                                color: theme.colorScheme.secondary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (character.unallocatedPoints > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Row(
                          children: [
                            Icon(Icons.star,
                                size: 14,
                                color: theme.colorScheme.primary),
                            const SizedBox(width: 4),
                            Text(
                              '${character.unallocatedPoints} очков для распределения',
                              style: TextStyle(
                                fontSize: 12,
                                color: theme.colorScheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.person_add_outlined,
              size: 64,
              color: Theme.of(context).colorScheme.onSurface.withAlpha(80)),
          const SizedBox(height: 16),
          const Text('Нет персонажей',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Создайте первого персонажа',
              style: TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}
