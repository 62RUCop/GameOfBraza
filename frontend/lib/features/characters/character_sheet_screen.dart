import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/widgets/dice_widget.dart';
import '../stats/stats_tab.dart';
import '../equipment/equipment_tab.dart';
import '../skills/skills_tab.dart';
import '../backpack/backpack_tab.dart';
import '../reputation/reputation_tab.dart';
import '../notes/notes_tab.dart';

class CharacterSheetScreen extends ConsumerWidget {
  final String characterId;

  const CharacterSheetScreen({super.key, required this.characterId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final characterAsync = ref.watch(characterProvider(characterId));
    final auth = ref.watch(authProvider).valueOrNull;

    return characterAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(
          leading: BackButton(onPressed: () => context.go('/characters')),
        ),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text('Ошибка загрузки: $e'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () =>
                    ref.read(characterProvider(characterId).notifier).reload(),
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
      ),
      data: (character) => DefaultTabController(
        length: 6,
        child: Scaffold(
          appBar: AppBar(
            leading: BackButton(onPressed: () => context.go('/characters')),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(character.name,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                if (character.unallocatedPoints > 0)
                  Text(
                    '${character.unallocatedPoints} очков для распределения',
                    style: TextStyle(
                      fontSize: 11,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
              ],
            ),
            actions: [
              if (auth?.isGmOrAdmin ?? false)
                IconButton(
                  icon: const Icon(Icons.supervisor_account),
                  tooltip: 'GM Панель',
                  onPressed: () => context.go('/gm'),
                ),
              IconButton(
                icon: const Icon(Icons.casino),
                tooltip: 'Бросить кубик',
                onPressed: () => showDiceBottomSheet(context),
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => ref
                    .read(characterProvider(characterId).notifier)
                    .reload(),
              ),
            ],
            bottom: const TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              tabs: [
                Tab(text: 'Характеристики'),
                Tab(text: 'Снаряжение'),
                Tab(text: 'Умения'),
                Tab(text: 'Рюкзак'),
                Tab(text: 'Репутация'),
                Tab(text: 'Заметки'),
              ],
            ),
          ),
          body: TabBarView(
            children: [
              StatsTab(characterId: characterId),
              EquipmentTab(characterId: characterId),
              SkillsTab(characterId: characterId),
              BackpackTab(characterId: characterId),
              ReputationTab(characterId: characterId),
              NotesTab(characterId: characterId),
            ],
          ),
        ),
      ),
    );
  }
}
