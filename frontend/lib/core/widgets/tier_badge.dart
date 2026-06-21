import 'package:flutter/material.dart';

const _tierDice = ['d4', 'd6', 'd12', 'd20', 'd60', 'd100'];
const _tierColors = [
  Color(0xFF757575),
  Color(0xFF388e3c),
  Color(0xFF1976d2),
  Color(0xFF7b1fa2),
  Color(0xFFf57f17),
  Color(0xFFc62828),
];

class TierBadge extends StatelessWidget {
  final int tier;
  final double fontSize;

  const TierBadge({super.key, required this.tier, this.fontSize = 11});

  @override
  Widget build(BuildContext context) {
    final safeT = tier.clamp(0, 5);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: _tierColors[safeT].withOpacity(0.2),
        border: Border.all(color: _tierColors[safeT]),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        _tierDice[safeT],
        style: TextStyle(color: _tierColors[safeT], fontSize: fontSize, fontWeight: FontWeight.bold),
      ),
    );
  }
}
