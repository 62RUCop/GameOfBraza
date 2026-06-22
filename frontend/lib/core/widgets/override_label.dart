import 'package:flutter/material.dart';

class OverrideLabel extends StatelessWidget {
  final bool manualOverride;
  final VoidCallback? onReset;
  final Widget child;

  const OverrideLabel({
    super.key,
    required this.manualOverride,
    this.onReset,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (!manualOverride) return child;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        child,
        const SizedBox(width: 4),
        Tooltip(
          message: 'Значение закреплено вручную. Нажмите, чтобы сбросить.',
          child: GestureDetector(
            onTap: onReset,
            child: Icon(
              Icons.push_pin,
              size: 14,
              color: Theme.of(context).colorScheme.secondary,
            ),
          ),
        ),
      ],
    );
  }
}

// Standalone reset button for derived value rows
class OverrideResetButton extends StatelessWidget {
  final VoidCallback onReset;

  const OverrideResetButton({super.key, required this.onReset});

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onReset,
      icon: const Icon(Icons.push_pin_outlined, size: 14),
      label: const Text('авторасчёт', style: TextStyle(fontSize: 12)),
      style: TextButton.styleFrom(
        foregroundColor: Theme.of(context).colorScheme.secondary,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}
