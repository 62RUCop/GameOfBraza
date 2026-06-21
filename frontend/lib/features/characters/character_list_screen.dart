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
    final auth = ref.watch(authProvider).asData?.value;
    final charList = ref.watch(characterListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('GameOfBraza'),
        actions: [
          if (auth?.role == Role.gm || auth?.role == Role.admin)
            IconButton(icon: const Icon(Icons.shield_outlined), tooltip: 'GM панель', onPressed: () => context.go('/gm')),
          if (auth?.role == Role.admin)
            IconButton(icon: const Icon(Icons.admin_panel_settings_outlined), tooltip: 'Панель админа', onPressed: () => context.go('/admin')),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Выйти',
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: charList.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Ошибка: $e', style: const TextStyle(color: Colors.red))),
        data: (chars) => chars.isEmpty
            ? const Center(child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.person_add_alt, size: 64, color: Colors.white24),
                  SizedBox(height: 16),
                  Text('Нет персонажей', style: TextStyle(color: Colors.white54)),
                  SizedBox(height: 8),
                  Text('Создайте первого персонажа', style: TextStyle(color: Colors.white38, fontSize: 12)),
                ],
              ))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: chars.length,
                itemBuilder: (_, i) => _CharacterCard(character: chars[i]),
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/new'),
        icon: const Icon(Icons.add),
        label: const Text('Новый персонаж'),
      ),
    );
  }
}

class _CharacterCard extends StatelessWidget {
  final CharacterListItem character;

  const _CharacterCard({required this.character});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          radius: 28,
          backgroundImage: character.imageUrl != null ? NetworkImage(character.imageUrl!) : null,
          child: character.imageUrl == null
              ? Text(character.name.isNotEmpty ? character.name[0].toUpperCase() : '?', style: const TextStyle(fontSize: 20))
              : null,
        ),
        title: Row(
          children: [
            Text(character.name, style: const TextStyle(fontWeight: FontWeight.bold)),
            if (character.isNpc) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: Colors.orange.withOpacity(0.2), border: Border.all(color: Colors.orange), borderRadius: BorderRadius.circular(4)),
                child: const Text('NPC', style: TextStyle(fontSize: 10, color: Colors.orange)),
              ),
            ],
          ],
        ),
        subtitle: character.unallocatedPoints > 0
            ? Text('${character.unallocatedPoints} очков ждут распределения', style: const TextStyle(color: Colors.amber))
            : null,
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.go('/characters/${character.id}'),
      ),
    );
  }
}
