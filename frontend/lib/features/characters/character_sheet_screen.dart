import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/models/models.dart';
import '../../core/widgets/dice_widget.dart';
import '../stats/stats_tab.dart';
import '../equipment/equipment_tab.dart';
import '../skills/skills_tab.dart';
import '../backpack/backpack_tab.dart';
import '../reputation/reputation_tab.dart';
import '../notes/notes_tab.dart';

class CharacterSheetScreen extends ConsumerStatefulWidget {
  final String characterId;

  const CharacterSheetScreen({super.key, required this.characterId});

  @override
  ConsumerState<CharacterSheetScreen> createState() => _CharacterSheetScreenState();
}

class _CharacterSheetScreenState extends ConsumerState<CharacterSheetScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  bool _diceVisible = false;

  static const _tabs = [
    Tab(text: 'Описание'),
    Tab(text: 'Характеристики'),
    Tab(text: 'Снаряжение'),
    Tab(text: 'Навыки'),
    Tab(text: 'Рюкзак'),
    Tab(text: 'Репутация'),
    Tab(text: 'Заметки'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final charAsync = ref.watch(characterProvider(widget.characterId));

    return charAsync.when(
      loading: () => Scaffold(appBar: AppBar(), body: const Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(appBar: AppBar(), body: Center(child: Text('Ошибка: $e', style: const TextStyle(color: Colors.red)))),
      data: (char) => Scaffold(
        appBar: AppBar(
          leading: BackButton(onPressed: () => context.go('/')),
          title: Row(
            children: [
              Text(char.name),
              if (char.unallocatedPoints > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: Colors.amber.withOpacity(0.2), border: Border.all(color: Colors.amber), borderRadius: BorderRadius.circular(12)),
                  child: Text('${char.unallocatedPoints} очков', style: const TextStyle(color: Colors.amber, fontSize: 11)),
                ),
              ],
            ],
          ),
          bottom: TabBar(controller: _tabController, tabs: _tabs, isScrollable: true),
        ),
        body: Stack(
          children: [
            TabBarView(
              controller: _tabController,
              children: [
                _DescriptionTab(character: char, characterId: widget.characterId),
                StatsTab(character: char, characterId: widget.characterId),
                EquipmentTab(characterId: widget.characterId),
                SkillsTab(characterId: widget.characterId, character: char),
                BackpackTab(characterId: widget.characterId),
                ReputationTab(characterId: widget.characterId),
                NotesTab(characterId: widget.characterId, initialNotes: char.playerNotes),
              ],
            ),
            if (_diceVisible)
              Positioned(
                right: 16,
                bottom: 80,
                width: 300,
                child: DiceWidget(),
              ),
          ],
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => setState(() => _diceVisible = !_diceVisible),
          tooltip: 'Кубик',
          child: const Icon(Icons.casino_outlined),
        ),
      ),
    );
  }
}

class _DescriptionTab extends ConsumerStatefulWidget {
  final Character character;
  final String characterId;

  const _DescriptionTab({required this.character, required this.characterId});

  @override
  ConsumerState<_DescriptionTab> createState() => _DescriptionTabState();
}

class _DescriptionTabState extends ConsumerState<_DescriptionTab> {
  late final TextEditingController _quentaCtrl;
  late final TextEditingController _questCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _quentaCtrl = TextEditingController(text: widget.character.quenta);
    _questCtrl = TextEditingController(text: widget.character.mainQuest);
  }

  @override
  void dispose() {
    _quentaCtrl.dispose();
    _questCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch('/characters/${widget.characterId}/description', data: {
        'quenta': _quentaCtrl.text,
        'main_quest': _questCtrl.text,
      });
      ref.invalidate(characterProvider(widget.characterId));
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Сохранено')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.character.imageUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(widget.character.imageUrl!, height: 200, fit: BoxFit.cover),
            ),
          const SizedBox(height: 16),
          TextField(
            controller: _quentaCtrl,
            maxLines: 6,
            decoration: const InputDecoration(labelText: 'Квента', alignLabelWithHint: true),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _questCtrl,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'Главный квест', alignLabelWithHint: true),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _saving ? null : _save,
            icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save),
            label: const Text('Сохранить'),
          ),
        ],
      ),
    );
  }
}
