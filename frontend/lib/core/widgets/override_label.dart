import 'package:flutter/material.dart';

class OverrideLabel extends StatelessWidget {
  final int value;
  final VoidCallback? onReset;

  const OverrideLabel({super.key, required this.value, this.onReset});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('$value', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(width: 4),
        Tooltip(
          message: 'Значение закреплено GM',
          child: Icon(Icons.push_pin, size: 14, color: Colors.orange[300]),
        ),
        if (onReset != null)
          TextButton(
            onPressed: onReset,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text('вернуть авторасчёт', style: TextStyle(fontSize: 10, color: Colors.orange)),
          ),
      ],
    );
  }
}
