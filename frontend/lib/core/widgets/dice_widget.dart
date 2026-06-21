import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

class DiceWidget extends ConsumerStatefulWidget {
  const DiceWidget({super.key});

  @override
  ConsumerState<DiceWidget> createState() => _DiceWidgetState();
}

class _DiceWidgetState extends ConsumerState<DiceWidget> {
  int _selectedFaces = 20;
  int? _result;
  bool _loading = false;
  final _editController = TextEditingController();

  static const _faces = [4, 6, 8, 10, 12, 20, 60, 100];

  Future<void> _roll() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.post('/dice/roll', data: {'faces': _selectedFaces});
      final result = response.data['result'] as int;
      setState(() {
        _result = result;
        _editController.text = '$result';
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Кубик', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 4,
              children: _faces
                  .map((f) => ChoiceChip(
                        label: Text('d$f'),
                        selected: _selectedFaces == f,
                        onSelected: (_) => setState(() => _selectedFaces = f),
                        selectedColor: Theme.of(context).colorScheme.primary,
                      ))
                  .toList(),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _editController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Результат', isDense: true),
                    onChanged: (v) => setState(() => _result = int.tryParse(v)),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _loading ? null : _roll,
                  child: _loading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Бросить'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
