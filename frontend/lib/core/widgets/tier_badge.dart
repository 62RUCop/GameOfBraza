import 'package:flutter/material.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class TierBadge extends StatelessWidget {
  final int tier;
  final double fontSize;

  const TierBadge({super.key, required this.tier, this.fontSize = 11});

  @override
  Widget build(BuildContext context) {
    final label = kTierDice[tier.clamp(0, 5)] ?? 'd?';
    final color = AppTheme.tierColor(tier);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(30),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withAlpha(120), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
