import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/characters_provider.dart';
import '../../core/theme/app_theme.dart';

class NotesTab extends ConsumerStatefulWidget {
  final String characterId;

  const NotesTab({super.key, required this.characterId});

  @override
  ConsumerState<NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends ConsumerState<NotesTab> {
  late TextEditingController _ctrl;
  Timer? _debounce;
  _SaveStatus _status = _SaveStatus.saved;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  void _onChanged(String _) {
    setState(() => _status = _SaveStatus.unsaved);
    _debounce?.cancel();
    _debounce = Timer(const Duration(seconds: 2), _save);
  }

  Future<void> _save() async {
    setState(() => _status = _SaveStatus.saving);
    try {
      await ref
          .read(characterProvider(widget.characterId).notifier)
          .updateDescription({'player_notes': _ctrl.text});
      if (mounted) setState(() => _status = _SaveStatus.saved);
    } catch (_) {
      if (mounted) setState(() => _status = _SaveStatus.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final characterAsync = ref.watch(characterProvider(widget.characterId));

    return characterAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Ошибка: $e')),
      data: (character) {
        if (!_initialized) {
          _ctrl.text = character.playerNotes ?? '';
          _initialized = true;
        }
        return Column(
          children: [
            // Status bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Theme.of(context).colorScheme.surface,
              child: Row(
                children: [
                  _StatusChip(status: _status),
                  const Spacer(),
                  TextButton.icon(
                    icon: const Icon(Icons.save_outlined, size: 16),
                    label: const Text('Сохранить'),
                    onPressed:
                        _status == _SaveStatus.unsaved ? _save : null,
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _ctrl,
                  maxLines: null,
                  expands: true,
                  textAlignVertical: TextAlignVertical.top,
                  decoration: const InputDecoration(
                    hintText: 'Заметки игрока...',
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    filled: false,
                  ),
                  style: Theme.of(context).textTheme.bodyMedium,
                  onChanged: _onChanged,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

enum _SaveStatus { saved, unsaved, saving, error }

class _StatusChip extends StatelessWidget {
  final _SaveStatus status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case _SaveStatus.saved:
        return const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle_outline, size: 14, color: Colors.green),
            SizedBox(width: 4),
            Text('сохранено',
                style: TextStyle(fontSize: 12, color: AppTheme.onSurfaceMuted)),
          ],
        );
      case _SaveStatus.unsaved:
        return const Text('не сохранено',
            style: TextStyle(fontSize: 12, color: AppTheme.onSurfaceMuted));
      case _SaveStatus.saving:
        return const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(strokeWidth: 2)),
            SizedBox(width: 4),
            Text('сохраняется...',
                style:
                    TextStyle(fontSize: 12, color: AppTheme.onSurfaceMuted)),
          ],
        );
      case _SaveStatus.error:
        return const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 14, color: Colors.red),
            SizedBox(width: 4),
            Text('ошибка сохранения',
                style: TextStyle(fontSize: 12, color: Colors.red)),
          ],
        );
    }
  }
}
