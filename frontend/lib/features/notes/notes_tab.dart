import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/providers/characters_provider.dart';

class NotesTab extends ConsumerStatefulWidget {
  final String characterId;
  final String? initialNotes;

  const NotesTab({super.key, required this.characterId, this.initialNotes});

  @override
  ConsumerState<NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends ConsumerState<NotesTab> {
  late final TextEditingController _ctrl;
  Timer? _debounce;
  String _saveStatus = '';

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialNotes ?? '');
    _ctrl.addListener(_onChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _ctrl.removeListener(_onChanged);
    _ctrl.dispose();
    super.dispose();
  }

  void _onChanged() {
    _debounce?.cancel();
    setState(() => _saveStatus = 'сохраняется...');
    _debounce = Timer(const Duration(seconds: 2), _save);
  }

  Future<void> _save() async {
    try {
      final dio = ref.read(dioProvider);
      await dio.patch('/characters/${widget.characterId}/description', data: {'player_notes': _ctrl.text});
      if (mounted) setState(() => _saveStatus = 'сохранено');
    } catch (_) {
      if (mounted) setState(() => _saveStatus = 'ошибка сохранения');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Заметки', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              Row(
                children: [
                  if (_saveStatus.isNotEmpty)
                    Text(_saveStatus, style: TextStyle(
                      fontSize: 12,
                      color: _saveStatus == 'сохранено' ? Colors.green : (_saveStatus == 'ошибка сохранения' ? Colors.red : Colors.white54),
                    )),
                  const SizedBox(width: 8),
                  TextButton.icon(icon: const Icon(Icons.save, size: 16), label: const Text('Сохранить'), onPressed: _save),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Expanded(
            child: TextField(
              controller: _ctrl,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              decoration: const InputDecoration(hintText: 'Ваши заметки о персонаже...', alignLabelWithHint: true),
              style: const TextStyle(fontSize: 14, height: 1.6),
            ),
          ),
        ],
      ),
    );
  }
}
